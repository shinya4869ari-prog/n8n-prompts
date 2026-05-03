// GitHubのRaw URLベースパス
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E8%A8%98%E4%BA%8B%E4%BD%9C%E6%88%90_%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E4%BD%BF%E7%94%A8_v2/';

// 同期対象のAIプロンプトファイル（コードノードはn8n直接管理のため除外）
const files = {
  researcher1:      baseUrl + 'researcher1.md',
  researcher2:      baseUrl + 'researcher2.md',
  researcher25:     baseUrl + 'researcher25.md',
  writerPrompt:     baseUrl + 'writer.md',
  deepDivePrompt:   baseUrl + 'Deep-Dive_writer.md',
  deepDiveSelect:   baseUrl + 'Deep-Dive_select.md',

  qualityCheck:     baseUrl + 'quality_check.md',
  responseExtract:  baseUrl + 'response_extraction.md',
};

try {
  // すべて一括で取得
  const keys = Object.keys(files);
  const responses = await Promise.all(
    keys.map(key => this.helpers.httpRequest({ method: 'GET', url: files[key] }))
  );

  const rawData = {};
  keys.forEach((key, index) => { rawData[key] = responses[index]; });

  // テンプレート置換ロジック
  const base = $input.first().json;
  const now = new Date();
  const context = {
    ...base,
    now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
    now_year: String(now.getFullYear())
  };

  const evaluateTemplate = (text, data) => {
    if (!text) return "";
    return text.replace(/\{\{\s*\$json\.([^\s\}]+)\s*\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, data);
      return value !== undefined ? String(value) : match;
    })
    .replace(/\{\{\s*\$now\.toFormat\([^)]+\)\s*\}\}/g, context.now_date)
    .replace(/\{\{[^}]+\}\}/g, '');
  };

  const results = {};
  Object.keys(rawData).forEach(key => {
    results[key] = evaluateTemplate(rawData[key], context);
  });

  return [{
    json: {
      ...results,
      ...context
    }
  }];
} catch (error) {
  throw new Error(`一括同期失敗: ${error.message}`);
}

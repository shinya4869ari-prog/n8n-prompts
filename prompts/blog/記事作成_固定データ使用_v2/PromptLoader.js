// GitHubのRaw URLベースパス
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E8%A8%98%E4%BA%8B%E4%BD%9C%E6%88%90_%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E4%BD%BF%E7%94%A8_v2/';

// 同期対象のAIプロンプトファイル（コードノードはn8n直接管理のため除外）
const files = {
  researcher1: baseUrl + 'researcher1.md',
  researcher2: baseUrl + 'researcher2.md',
  researcher25: baseUrl + 'researcher25.md',
  writerPrompt: baseUrl + 'writer.md',
  deepDivePrompt: baseUrl + 'Deep-Dive_writer.md',
  deepDiveSelect: baseUrl + 'Deep-Dive_select.md',

  qualityCheck: baseUrl + 'quality_check.md',
  responseExtract: baseUrl + 'response_extraction.md',
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
    // {{ $json.a || $json.b || "default" }} のような形式をパースして置換
    return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
      if (expression.includes('$now.toFormat')) return context.now_date;

      const parts = expression.split('||').map(p => p.trim());
      for (const part of parts) {
        if (part.startsWith('$json.')) {
          const path = part.replace('$json.', '');
          const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, data);
          if (value !== undefined && value !== null && value !== '') return String(value);
        } else if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
          return part.slice(1, -1);
        }
      }
      // 全ての候補が未定義の場合、置換せずに元のタグ {{ ... }} をそのまま返す
      // これにより、後続の AI ノード側で n8n が変数を評価できるようになる
      return match;
    });
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

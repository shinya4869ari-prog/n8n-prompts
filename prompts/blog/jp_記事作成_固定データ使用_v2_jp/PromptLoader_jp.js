// GitHubのRaw URLベースパス
const baseUrlJp  = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/jp_%E8%A8%98%E4%BA%8B%E4%BD%9C%E6%88%90_%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E4%BD%BF%E7%94%A8_v2_jp/';
const baseUrlMain = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E8%A8%98%E4%BA%8B%E4%BD%9C%E6%88%90_%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E4%BD%BF%E7%94%A8_v2/';

// JP版固有プロンプト → jp_フォルダから、メイン版と共通のものはメインフォルダから
const files = {
  researcher2:     baseUrlJp   + 'researcher2_jp.md',
  researcher25:    baseUrlMain + 'researcher25.md',
  writerPrompt:    baseUrlJp   + 'Writer_JP.md',
  deepDiveSelect:  baseUrlMain + 'Deep-Dive_select.md',
  deepDivePrompt:  baseUrlMain + 'Deep-Dive_writer.md',
  responseExtract: baseUrlMain + 'response_extraction.md',
  qualityCheck:    'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/universal_quality_check.md',
};

try {
  // すべて一括で取得
  const keys = Object.keys(files);
  const responses = await Promise.all(
    keys.map(key => this.helpers.httpRequest({ method: 'GET', url: files[key] }))
  );

  const rawData = {};
  keys.forEach((key, index) => { rawData[key] = responses[index]; });

  // テンプレート置換ロジック（{{ $json.xxx }} や {{ $now.toFormat(...) }} に対応）
  const base = $input.first().json;
  const now = new Date();
  const context = {
    ...base,
    now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
    now_year: String(now.getFullYear())
  };

  const evaluateTemplate = (text, data) => {
    if (!text) return "";
    return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
      // 1. JSON.stringify($json.xxx) の評価
      const jsonMatch = expression.match(/JSON\.stringify\(\s*([^)]+)\s*\)/);
      if (jsonMatch) {
        let path = jsonMatch[1].trim().replace('$json.', '');
        const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, data);
        return JSON.stringify(value || {}, null, 2);
      }
      
      // 2. $json.xxx の単純置換（従来のロジックをカバー）
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
  throw new Error(`JP版プロンプト一括読み込み失敗: ${error.message}`);
}

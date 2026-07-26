// GitHubのRaw URLベースパス (main-blog-modular 用)
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/main-blog-modular/';
const lowcostUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/main-blog-lowcost/';

// 同期対象のAIプロンプトファイル
const files = {
  basicInstitution: baseUrl + '01_basic_institution.md',
  historyTrends: baseUrl + '02_history_trends.md',
  safetyCrimes: baseUrl + '03_safety_crimes.md',
  researcher25: lowcostUrl + 'researcher25.md',
  writerPrompt: lowcostUrl + 'writer.md',
  deepDivePrompt: lowcostUrl + 'Deep-Dive_writer.md',
  deepDiveSelect: lowcostUrl + 'Deep-Dive_select.md',
  deepDiveWriter: baseUrl + 'deep_dive_writer.md',
  responseExtract: lowcostUrl + 'response_extraction.md',
  qualityCheck: 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/universal_quality_check.md'
};

try {
  const keys = Object.keys(files);
  const responses = await Promise.all(
    keys.map(key => this.helpers.httpRequest({ method: 'GET', url: files[key] }))
  );
  
  const rawData = {};
  keys.forEach((key, index) => { rawData[key] = responses[index]; });
  
  const base = $input.first()?.json || {};
  const now = new Date();
  
  const countryVal = base.country || base.countryName || "";
  const countryEnVal = base.countryEn || base.country_en || countryVal;

  const context = {
    ...base,
    country: countryVal,
    countryEn: countryEnVal,
    now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
    now_year: String(now.getFullYear())
  };
  
  const evaluateTemplate = (text, data) => {
    if (!text) return "";
    let replaced = text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
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
      const exprClean = expression.replace('$json.', '').trim();
      if (data[exprClean] !== undefined && data[exprClean] !== null && data[exprClean] !== '') {
        return String(data[exprClean]);
      }
      return match;
    });
    
    return replaced.replace(/\{\{/g, '｛').replace(/\}\}/g, '｝');
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
  throw new Error(`モジュール同期失敗: ${error.message}`);
}

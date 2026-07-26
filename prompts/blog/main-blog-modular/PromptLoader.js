// GitHubのRaw URLベースパス (main-blog-modular 用)
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/main-blog-modular/';

// 同期対象のAIプロンプトファイル
const files = {
  basicInstitution: baseUrl + '01_basic_institution.md',
  historyTrends: baseUrl + '02_history_trends.md',
  safetyCrimes: baseUrl + '03_safety_crimes.md',
  deepDiveSelect: 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/main-blog-lowcost/Deep-Dive_select.md',
  deepDiveWriter: baseUrl + 'deep_dive_writer.md',
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
  
  // countryEn が未定義の場合は country でフォールバック
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
    // 1st Pass: 変数の安全置換
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
      // コンテキストからの直接参照チェック
      const exprClean = expression.replace('$json.', '').trim();
      if (data[exprClean] !== undefined && data[exprClean] !== null && data[exprClean] !== '') {
        return String(data[exprClean]);
      }
      return match;
    });
    
    // 2nd Pass: n8n の Expression レンダラーが二重評価して invalid syntax クラッシュを起こすのを防ぐため、
    // 残った未置換の {{ ... }} を安全な全角波括弧｛ ｝に置換保護する
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

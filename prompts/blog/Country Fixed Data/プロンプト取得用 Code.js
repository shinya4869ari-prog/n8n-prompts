const baseUrl = "https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/Country%20Fixed%20Data/";

// AIへの指示書のみ取得（コードノードはn8nに直接貼り付けて管理）
const urls = {
  researcher: baseUrl + encodeURIComponent("固定データ Researcher.md"),
  update:     baseUrl + encodeURIComponent("固定データアップデート.md"),
};

try {
  const keys = Object.keys(urls);
  const responses = await Promise.all(
    keys.map(key => this.helpers.httpRequest({ method: 'GET', url: urls[key] }))
  );
  
  const raw = {};
  keys.forEach((key, i) => { raw[key] = responses[i]; });

  const base = $('国名変換Code').first().json;
  const now = new Date();
  const context = {
    ...base,
    now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
    now_year: String(now.getFullYear()),
    rate: base.rate || '',
  };

  const evaluateTemplate = (text, data) => {
    return text.replace(/\{\{\s*\$json\.([^\s\}]+)\s*\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, data);
      return value !== undefined ? String(value) : match;
    })
    .replace(/\{\{\s*\$now\.toFormat\([^)]+\)\s*\}\}/g, `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`)
    .replace(/\{\{[^}]+\}\}/g, '');
  };

  const forceInstruction = "You MUST use the search tool (Tavily/Perplexity) BEFORE answering. Never rely on your own knowledge for social, price, and trade statistics.\n\n";

  return [{
    json: {
      researcherPrompt: forceInstruction + evaluateTemplate(raw.researcher, context),
      updatePrompt:     forceInstruction + evaluateTemplate(raw.update, context),
      base:             base
    }
  }];
} catch (error) {
  throw new Error(`GitHubからのプロンプト取得に失敗しました: ${error.message}`);
}
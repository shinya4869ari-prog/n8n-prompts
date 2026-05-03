const urls = {
  researcher: "https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E5%9B%BD%E5%88%A5%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E3%82%B9%E3%82%B1%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB%E3%83%95%E3%83%AD%E3%83%BC/%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%20Researcher.md",
  update: "https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E5%9B%BD%E5%88%A5%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E3%82%B9%E3%82%B1%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB%E3%83%95%E3%83%AD%E3%83%BC/%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E3%82%A2%E3%83%83%E3%83%97%E3%83%87%E3%83%BC%E3%83%88.md"
};

try {
  const [researcherRaw, updateRaw] = await Promise.all([
    this.helpers.httpRequest({ method: 'GET', url: urls.researcher }),
    this.helpers.httpRequest({ method: 'GET', url: urls.update })
  ]);

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
      researcherPrompt: forceInstruction + evaluateTemplate(researcherRaw, context),
      updatePrompt: forceInstruction + evaluateTemplate(updateRaw, context)
    }
  }];
} catch (error) {
  throw new Error(`GitHubからのプロンプト取得に失敗しました: ${error.message}`);
}
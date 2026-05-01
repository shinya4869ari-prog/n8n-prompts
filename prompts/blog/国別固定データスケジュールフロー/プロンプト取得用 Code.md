// GitHubのRaw URL
const urls = {
  researcher: "https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E5%9B%BD%E5%88%A5%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E3%82%B9%E3%82%B1%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB%E3%83%95%E3%83%AD%E3%83%BC/%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%20Researcher.md",
  update: "https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E5%9B%BD%E5%88%A5%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E3%82%B9%E3%82%B1%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB%E3%83%95%E3%83%AD%E3%83%BC/%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E3%82%A2%E3%83%83%E3%83%97%E3%83%87%E3%83%BC%E3%83%88.md"
};

try {
  const [researcherRaw, updateRaw] = await Promise.all([
    this.helpers.httpRequest({ method: 'GET', url: urls.researcher }),
    this.helpers.httpRequest({ method: 'GET', url: urls.update })
  ]);

  // ChatGPTの提案通り、先頭に「絶対命令」を強制付与する
  const forceInstruction = "You MUST use the search tool (Tavily/Perplexity) BEFORE answering. Never rely on your own knowledge for social, price, and trade statistics.\n\n";

  return {
    researcherPrompt: forceInstruction + researcherRaw,
    updatePrompt: forceInstruction + updateRaw
  };
} catch (error) {
  throw new Error(`GitHubからのプロンプト取得に失敗しました: ${error.message}`);
}

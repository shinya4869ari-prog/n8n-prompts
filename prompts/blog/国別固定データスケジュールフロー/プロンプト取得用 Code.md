const baseUrl = "https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E5%9B%BD%E5%88%A5%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E3%82%B9%E3%82%B1%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB%E3%83%95%E3%83%AD%E3%83%BC/";

const urls = {
  researcher: baseUrl + encodeURIComponent("固定データ Researcher.md"),
  update:     baseUrl + encodeURIComponent("固定データアップデート.md"),
  code1:      baseUrl + encodeURIComponent("①（経済）.js"),
  code2:      baseUrl + encodeURIComponent("②（治安）.js"),
  code3:      baseUrl + encodeURIComponent("③（物価）.js"),
  code4:      baseUrl + encodeURIComponent("④（貿易）.js"),
  codeImf:    baseUrl + encodeURIComponent("IMFデータ抽出Code.js"),
  codeReplace:baseUrl + encodeURIComponent("置換Code.js"),
  codeUpdate: baseUrl + encodeURIComponent("管理シート更新Code.js")
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
      code1:            raw.code1,
      code2:            raw.code2,
      code3:            raw.code3,
      code4:            raw.code4,
      codeImf:          raw.codeImf,
      codeReplace:      raw.codeReplace,
      codeUpdate:       raw.codeUpdate
    }
  }];
} catch (error) {
  throw new Error(`GitHubからのプロンプト取得に失敗しました: ${error.message}`);
}
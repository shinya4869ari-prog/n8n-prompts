try {
  const httpNode = $('Get Researcher Prompt').first().json;  
  let researcherContent = '';
  if (typeof httpNode === 'string') researcherContent = httpNode;
  else if (httpNode?.data) researcherContent = httpNode.data;
  else if (httpNode?.body) researcherContent = httpNode.body;

  const lookupItems = $('country-master-lookup').all();
  const base = lookupItems.length > 0 ? lookupItems[0].json : {};

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
      researcherPrompt: forceInstruction + evaluateTemplate(researcherContent, context),
      base: base,
      capitalEn: base.capitalEn || "",
      capitalEnNumbeo: base.capitalEnNumbeo || "",
      country: base.country || "",
      currencyCode: base.currencyCode || "",
      currencySymbol: base.currencySymbol || "",
    }
  }];
} catch (error) {
  throw new Error(`処理失敗: ${error.message}`);
}
const country = $('国名変換Code').first().json.country;

const boekiRaw = $('貿易記事Perplexity').first().json;
const shiinRaw = $('死因記事Perplexity').first().json;
const hanzaiRaw = $('犯罪記事Perplexity').first().json;
const chirigeiRaw = $('地理・経済記事Perplexity').first().json;
const bukkaArticleRaw = $('物価記事Perplexity').first().json;

const extractTexts = (raw) => {
  if (!raw) return { texts: '', urls: '' };

  // 1. PerplexityのAI回答本文（Chat Completions / メッセージ）を最優先で取得
  let mainText = raw.choices?.[0]?.message?.content 
              || raw.message 
              || raw.output 
              || raw.text 
              || raw.content 
              || '';

  // 2. 出典URLの取得（citations配列、またはresults配列から）
  let urls = [];
  if (Array.isArray(raw.citations)) {
    urls = raw.citations;
  } else if (raw.results && Array.isArray(raw.results)) {
    urls = raw.results.map(r => r.url).filter(Boolean);
  }

  // 3. もしAI長文本文がなく、Web検索結果（results）のみだった場合のフォールバック（全件取得）
  if (!mainText && Array.isArray(raw.results) && raw.results.length > 0) {
    mainText = raw.results
      .filter(r => r.title || r.snippet)
      .map(r => `【${r.title || '無題'}】\n${r.snippet || ''}`)
      .join('\n\n');
  }

  return {
    texts: typeof mainText === 'string' ? mainText.trim() : JSON.stringify(mainText),
    urls: Array.from(new Set(urls)).filter(Boolean).join('\n')
  };
};

const boeki = extractTexts(boekiRaw);
const shiin = extractTexts(shiinRaw);
const hanzai = extractTexts(hanzaiRaw);
const chirigei = extractTexts(chirigeiRaw);
const bukkaArticle = extractTexts(bukkaArticleRaw);

return [{
  json: {
    country,
    boekiTexts: boeki.texts,
    shiinTexts: shiin.texts,
    hanzaiTexts: hanzai.texts,
    chirigeiTexts: chirigei.texts,
    bukkaArticleTexts: bukkaArticle.texts,
    boekiUrls: boeki.urls,
    shiinUrls: shiin.urls,
    hanzaiUrls: hanzai.urls,
    chirigeiUrls: chirigei.urls,
    bukkaArticleUrls: bukkaArticle.urls
  }
}];
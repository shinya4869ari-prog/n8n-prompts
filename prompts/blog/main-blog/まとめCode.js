const country = $('国名変換Code').first().json.country;

const boekiRaw = $('貿易記事Perplexity').first().json;
const shiinRaw = $('死因記事Perplexity').first().json;
const hanzaiRaw = $('犯罪記事Perplexity').first().json;
const chirigeiRaw = $('地理・経済記事Perplexity').first().json;

const extractTexts = (raw) => ({
  texts: (raw.results || []).filter(r => r.title && r.snippet).slice(0, 3).map(r => `【${r.title}】\n${r.snippet}`).join('\n\n'),
  urls: (raw.results || []).slice(0, 3).map(r => r.url).join('\n')
});

const boeki = extractTexts(boekiRaw);
const shiin = extractTexts(shiinRaw);
const hanzai = extractTexts(hanzaiRaw);
const chirigei = extractTexts(chirigeiRaw);

return [{
  json: {
    country,
    boekiTexts: boeki.texts,
    shiinTexts: shiin.texts,
    hanzaiTexts: hanzai.texts,
    chirigeiTexts: chirigei.texts,
    boekiUrls: boeki.urls,
    shiinUrls: shiin.urls,
    hanzaiUrls: hanzai.urls,
    chirigeiUrls: chirigei.urls
  }
}];
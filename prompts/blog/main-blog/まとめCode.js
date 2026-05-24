const allInputs = $input.all();
const country = $('国名変換Code').first().json.country;

let boekiTexts = '';
let shiinTexts = '';
let hanzaiTexts = '';
let boekiUrls = '';
let shiinUrls = '';
let hanzaiUrls = '';

allInputs.forEach(item => {
  if (!item.json?.results) return;
  const combined = (item.json.results || []).map(r => (r.snippet || '') + (r.title || '')).join(' ');
  
  if (combined.includes('輸出') || combined.includes('輸入') || combined.includes('貿易収支') || combined.includes('ジェトロ')) {
    boekiTexts = (item.json.results || []).filter(r => r.title && r.snippet).slice(0, 3).map(r => `【${r.title}】\n${r.snippet}`).join('\n\n');
    boekiUrls = (item.json.results || []).slice(0, 3).map(r => r.url).join('\n');
  } else if (combined.includes('犯罪') || combined.includes('社会問題') || combined.includes('統計')) {
    hanzaiTexts = (item.json.results || []).filter(r => r.title && r.snippet).slice(0, 3).map(r => `【${r.title}】\n${r.snippet}`).join('\n\n');
    hanzaiUrls = (item.json.results || []).slice(0, 3).map(r => r.url).join('\n');
  } else {
    shiinTexts = (item.json.results || []).filter(r => r.title && r.snippet).slice(0, 3).map(r => `【${r.title}】\n${r.snippet}`).join('\n\n');
    shiinUrls = (item.json.results || []).slice(0, 3).map(r => r.url).join('\n');
  }
});

return [{
  json: { country, boekiTexts, shiinTexts, hanzaiTexts, boekiUrls, shiinUrls, hanzaiUrls }
}];
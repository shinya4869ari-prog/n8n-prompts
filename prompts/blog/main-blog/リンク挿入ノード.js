const item = $input.first().json;

const raw = item.output
  ?? item.content?.parts?.[0]?.text
  ?? item.message?.content
  ?? '{}';

let places = [], people = [], keywords = [], movies = [];
try {
  const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  places   = parsed.places   || [];
  people   = parsed.people   || [];
  keywords = parsed.keywords || [];
  movies   = parsed.movies   || [];
} catch(e) {}

let mainArticle = '';
try { mainArticle = $('整形2').first().json.article ?? $('整形2').first().json.output ?? ''; } catch (e) {}

let deepDiveRaw = '';
try { deepDiveRaw = $('整形3').first().json?.article ?? ''; } catch (e) {}

let country = '不明';
try { country = $('整形ノード1').first().json.country ?? '不明'; } catch (e) {}

function enc(t) {
  try { return btoa(unescape(encodeURIComponent(t || ''))); }
  catch (e) { return ''; }
}

function getSearchVariants(name, type) {
  name = name.replace(/(前大統領|元大統領|大統領|前首相|元首相|首相|前大臣|元大臣|大臣|氏|前|元)$/, '').trim();
  const base = name.replace(/[（\(\[［].*?[）\)］]/g, '').trim();
  const insideMatch = name.match(/[（\(［](.*?)[）\)］]/);
  const inside = insideMatch ? insideMatch[1].trim() : '';
  let jpn = [base];
  const suffixes = ['王国','共和国','連邦共和国','連邦','合衆国','民主共和国','社会主義共和国','公国'];
  for (const s of suffixes) {
    if (base.endsWith(s) && base.length > s.length) {
      jpn.push(base.replace(s, ''));
      break;
    }
  }
  if (type === 'people') {
    const parts = base.split('・');
    const lastName = parts[parts.length - 1];
    if (lastName && lastName.length > 1) jpn.push(lastName);
  }
  return [...new Set([name, ...jpn, inside])].filter(v => v && v.length >= 2);
}

const flatPatterns = [];
const allEntities = [
  ...people.map(p   => ({type: 'people',   ...p})),
  ...places.map(p   => ({type: 'places',   ...p})),
  ...keywords.map(p => ({type: 'keywords', ...p})),
  ...movies.map(p   => ({type: 'movies',   ...p}))
];

for (const entity of allEntities) {
  if (!entity.name || !entity.info) continue;
  if (/語$/.test(entity.name)) continue;
  const variants = getSearchVariants(entity.name, entity.type);
  for (const pattern of variants) {
    flatPatterns.push({ entity, pattern });
  }
}

const uniquePatterns = [];
const seen = new Set();
for (const cand of flatPatterns.sort((a, b) => b.pattern.length - a.pattern.length)) {
  if (!seen.has(cand.pattern)) {
    seen.add(cand.pattern);
    uniquePatterns.push(cand);
  }
}

function insertLinks(articleText) {
  let linkTokens = articleText.split(/(<[^>]+>)/g).filter(p => p).map(p => ({
    type: (p.startsWith('<') && p.endsWith('>')) ? 'tag' : 'text',
    text: p
  }));

  const linkedInThisArticle = new Set();

  for (const cand of uniquePatterns) {
    if (linkedInThisArticle.has(cand.entity.name)) continue;

    let mapUrl;
    if (cand.entity.type === 'keywords') {
      mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?mode=incident&q=${encodeURIComponent(cand.entity.name)}`;
    } else if (cand.entity.type === 'people') {
      mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?mode=person&q=${encodeURIComponent(cand.entity.name)}`;
    } else {
      mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?q=${encodeURIComponent(cand.entity.name)}`;
    }

    const linkHTML = `<br><br><a href="${mapUrl}" target="_blank" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
    const n = enc(cand.entity.name);
    const i = enc(cand.entity.info + linkHTML);

    const spanHTML = `<span class="tenbin-trigger" data-n="${n}" data-i="${i}" style="color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;font-weight:bold;">${cand.pattern}</span>`;

    const tradePartners = ["アメリカ合衆国","中国","台湾","韓国","香港","タイ","シンガポール","インド","ベトナム","ドイツ"];
    const isTradePartner = cand.entity.type === 'places' && tradePartners.includes(cand.pattern);

    let newTokens = [];
    let replaced = false;

    for (let idxToken = 0; idxToken < linkTokens.length; idxToken++) {
      const token = linkTokens[idxToken];
      if (replaced || token.type === 'tag' || token.text.includes('quickchart.io')) {
        newTokens.push(token);
        continue;
      }

      if (isTradePartner) {
        const prevToken = linkTokens[idxToken - 1];
        const nextToken = linkTokens[idxToken + 1];
        const isInsideTd = prevToken && prevToken.type === 'tag' && prevToken.text.toLowerCase().startsWith('<td') &&
          nextToken && nextToken.type === 'tag' && nextToken.text.toLowerCase().startsWith('</td');

        if (isInsideTd && token.text.trim() === cand.pattern) {
          replaced = true;
          newTokens.push({ type: 'tag', text: spanHTML });
          linkedInThisArticle.add(cand.entity.name);
        } else {
          newTokens.push(token);
        }
      } else {
        const idx = token.text.indexOf(cand.pattern);
        if (idx !== -1) {
          replaced = true;
          newTokens.push({ type: 'text', text: token.text.substring(0, idx) });
          newTokens.push({ type: 'tag',  text: spanHTML });
          newTokens.push({ type: 'text', text: token.text.substring(idx + cand.pattern.length) });
          linkedInThisArticle.add(cand.entity.name);
        } else {
          newTokens.push(token);
        }
      }
    }
    linkTokens = newTokens;
  }
  return linkTokens.map(t => t.text).join('');
}

const linkedMain     = insertLinks(mainArticle);
const linkedDeepDive = deepDiveRaw ? insertLinks(deepDiveRaw) : '';

return [{ json: { article: linkedMain, deepDiveArticle: linkedDeepDive, country: country } }];
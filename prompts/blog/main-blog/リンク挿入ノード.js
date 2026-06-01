// ① エンティティ抽出ノード「response_extraction1」からJSONを取得
let raw = '{}';
let parsed = null;
try {
  const extNode = $('response_extraction1').first().json;
  if (extNode && (extNode.people || extNode.places || extNode.keywords)) {
    parsed = extNode;
  } else {
    raw = extNode.text
      ?? extNode.output
      ?? extNode.content?.parts?.[0]?.text
      ?? extNode.message?.content
      ?? '{}';
  }
} catch(e) {}

let places = [], people = [], keywords = [], movies = [], crimes = [];
try {
  if (parsed) {
    places   = parsed.places   || [];
    people   = parsed.people   || [];
    keywords = parsed.keywords || [];
    movies   = parsed.movies   || [];
    crimes   = parsed.crimes   || [];
  } else {
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').replace(/,(\s*[}\]])/g, '$1').trim();
    parsed = JSON.parse(cleaned);
    places   = parsed.places   || [];
    people   = parsed.people   || [];
    keywords = parsed.keywords || [];
    movies   = parsed.movies   || [];
    crimes   = parsed.crimes   || [];
  }
} catch(e) {
  console.error("JSON parsing failed in links node:", e.message);
  console.log("Raw text was:", raw);
}

// 日本の行政トップ（首相）を固定データから取得してpeopleに追加（LLMの日本除外ルールの誤適用防止）
try {
  const japanFixed = $('整形ノード1').first().json?.data?.日本固定データ;
  if (japanFixed && japanFixed.制度の9つの皿 && japanFixed.制度の9つの皿.行政トップ) {
    const pmVal = japanFixed.制度の9つの皿.行政トップ.値 || '';
    let japanPM = '';
    const match = pmVal.match(/(?:：|:)\s*([^\s（\(\[［]+)/);
    if (match) {
      japanPM = match[1].trim();
    } else {
      japanPM = pmVal.replace(/[（\(\[［].*?[）\)］]/g, '').trim();
    }
    if (japanPM && !people.some(p => p.name === japanPM)) {
      people.push({
        name: japanPM,
        info: "日本の内閣総理大臣。"
      });
    }
  }
} catch(e) {}

let mainArticle = '';
try { mainArticle = $('最終Code').first().json.article ?? ''; } catch (e) {}

let deepDiveRaw = '';
try { deepDiveRaw = $('最終Code').first().json?.deepDiveArticle ?? $('整形3').first().json?.article ?? ''; } catch (e) {}

let country = '不明';
try { country = $('整形ノード1').first().json.country ?? '不明'; } catch (e) {}

// ポップアップHTML（歴史館リンク表示用）
const popupHTML = `
<div id="tenbin-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;" onclick="document.getElementById('tenbin-popup').style.display='none';this.style.display='none'"></div>
<div id="tenbin-popup" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:320px;background:#fff;border:1px solid #ddd;border-radius:12px;padding:25px;z-index:9999;box-shadow:0 20px 60px rgba(0,0,0,0.3);color:#333;font-family:sans-serif;">
  <div onclick="document.getElementById('tenbin-popup').style.display='none';document.getElementById('tenbin-overlay').style.display='none'" style="position:absolute;top:10px;right:15px;cursor:pointer;font-size:20px;color:#999;">✕</div>
  <div id="tenbin-popup-title" style="font-weight:bold;color:#20B2AA;margin-bottom:10px;font-size:18px;border-bottom:1px solid #eee;padding-bottom:10px;"></div>
  <div id="tenbin-popup-info" style="font-size:14px;line-height:1.7;color:#555;margin-top:10px;"></div>
</div>`;

// 映画用ポップアップ動的処理
const moviePopupScript = `
<script>
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-movie-title]');
  if (!el) return;
  const title = el.getAttribute('data-movie-title');
  const info = el.getAttribute('data-movie-info');
  const mapUrl = 'https://kokkanotenbin-map.shinya4869ari.workers.dev/?mode=movie&q=' + encodeURIComponent(title);
  const linkHTML = '<br><br><a href="' + mapUrl + '" target="_blank" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>';
  document.getElementById('tenbin-popup-title').textContent = title;
  document.getElementById('tenbin-popup-info').innerHTML = info + linkHTML;
  document.getElementById('tenbin-popup').style.display = 'block';
  document.getElementById('tenbin-overlay').style.display = 'block';
});
</script>`;

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
  
  // 1. 中黒（・）を除去したパターン
  if (base.includes('・')) {
    jpn.push(base.replace(/・/g, ''));
  }
  
  // 2. 長音符（ー）を除去したパターン（「ラー」と「ラ」の揺れ対策など）
  if (base.includes('ー')) {
    jpn.push(base.replace(/ー/g, ''));
    if (base.includes('・')) {
      jpn.push(base.replace(/・/g, '').replace(/ー/g, ''));
    }
  }
  
  const suffixes = ['王国','共和国','連邦共和国','連邦','合衆国','民主共和国','社会主義共和国','公国'];
  for (const s of suffixes) {
    if (base.endsWith(s) && base.length > s.length) {
      jpn.push(base.replace(s, ''));
      break;
    }
  }
  
  if (type === 'people') {
    const parts = base.split('・');
    parts.forEach(part => {
      const p = part.trim();
      if (p.length > 1) {
        jpn.push(p);
        if (p.includes('ー')) {
          jpn.push(p.replace(/ー/g, ''));
        }
      }
    });
  }
  
  return [...new Set([name, ...jpn, inside])].filter(v => v && v.length >= 2);
}

const flatPatterns = [];
const allEntities = [
  ...people.map(p   => ({type: 'people',   ...p})),
  ...places.map(p   => ({type: 'places',   ...p})),
  ...keywords.map(p => ({type: 'keywords', ...p})),
  ...movies.map(p   => ({type: 'movies',   ...p})),
  ...crimes.map(p   => ({type: 'keywords', ...p}))
];

for (const entity of allEntities) {
  if (!entity.name || !entity.info) continue;
  entity.name = String(entity.name);
  entity.info = String(entity.info);
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
    } else if (cand.entity.type === 'movies') {
      mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?mode=movie&q=${encodeURIComponent(cand.entity.name)}`;
    } else {
      mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?q=${encodeURIComponent(cand.entity.name)}`;
    }

    const linkHTML = `<br><br><a href="${mapUrl}" target="_blank" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
    const n = enc(cand.entity.name);
    const i = enc(cand.entity.info + linkHTML);
    
    const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${n}");document.getElementById("tenbin-popup-info").innerHTML=d("${i}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;
    const spanHTML = `<span style="color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;font-weight:bold;" onclick='${onclick}'>${cand.pattern}</span>`;

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

// 孤立サロゲート文字を除去（WordPress REST API の JSON エラー対策）
function removeLoneSurrogates(str) {
  if (!str) return '';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) {
      const next = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
      if (next >= 0xDC00 && next <= 0xDFFF) {
        result += str[i] + str[i + 1];
        i++;
      }
    } else if (c >= 0xDC00 && c <= 0xDFFF) {
      // 孤立した低サロゲートはスキップ
    } else {
      result += str[i];
    }
  }
  return result;
}

let metaJson = {};
try { metaJson = $('最終Code').first().json; } catch(e) {}

const finalMain = removeLoneSurrogates(linkedMain) + '\n\n' + moviePopupScript + '\n\n' + popupHTML;

return [{ json: {
  article:       finalMain,
  deepDiveArticle: removeLoneSurrogates(linkedDeepDive),
  country:       country,
  title:         metaJson.title         || '',
  countryEn:     metaJson.countryEn     || '',
  capital:       metaJson.capital       || '',
  category_name: metaJson.category_name || '',
  category_id:   metaJson.category_id   || 1,
  categories:    metaJson.categories    || [1]
} }];
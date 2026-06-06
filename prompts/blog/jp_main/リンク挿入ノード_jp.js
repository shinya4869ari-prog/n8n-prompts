const item = $input.first().json;

// ① データ取得（抽出AIの結果からテキストを取得してパース）
let places = [], people = [], keywords = [], movies = [], crimes = [];
try {
  // パターン①: people/places が直接 item のフィールドとしてオブジェクトで存在する場合（JSON自動パース時）
  if (item && (Array.isArray(item.people) || Array.isArray(item.places))) {
    places = item.places || [];
    people = item.people || [];
    keywords = item.keywords || [];
    movies = item.movies || [];
  } else {
    const candidate = item.text
      ?? item.output
      ?? item.content?.parts?.[0]?.text
      ?? item.message?.content
      ?? item;
    
    if (candidate && typeof candidate === 'object') {
      places = candidate.places || [];
      people = candidate.people || [];
      keywords = candidate.keywords || [];
      movies = candidate.movies || [];
    } else if (typeof candidate === 'string') {
      const cleaned = candidate.trim();
      
      // テキスト形式かどうかを判断（セクションヘッダー "===" が含まれているか）
      if (cleaned.includes('===places===') || cleaned.includes('===people===') || cleaned.includes('===keywords===')) {
        let currentSection = '';
        const lines = cleaned.split('\n');
        for (let line of lines) {
          line = line.replace(/```[a-z]*/g, '').replace(/```/g, '').trim();
          if (!line) continue;

          if (line.startsWith('===') && line.endsWith('===')) {
            currentSection = line.replace(/===/g, '').trim().toLowerCase();
            continue;
          }

          const parts = line.split('|');
          if (parts.length >= 2) {
            const name = parts[0].trim();
            const info = parts.slice(1).join('|').trim();
            if (name && info) {
              const itemObj = { name, info };
              if (currentSection === 'places') places.push(itemObj);
              else if (currentSection === 'people') people.push(itemObj);
              else if (currentSection === 'keywords') keywords.push(itemObj);
              else if (currentSection === 'movies') movies.push(itemObj);
              else if (currentSection === 'crimes') crimes.push(itemObj);
            }
          }
        }
      } else {
        // セクションヘッダーがない場合は、JSONとしてパースを試みる（以前の形式のフォールバック）
        let jsonText = cleaned.replace(/```json/g, '').replace(/```/g, '').replace(/,(\s*[}\]])/g, '$1').trim();
        let parsed = null;
        try {
          parsed = JSON.parse(jsonText);
        } catch(parseErr) {
          // JSONが途中で切れている場合の修復
          let repaired = jsonText;
          const dqCount = (repaired.match(/(?<!\\)"/g) || []).length;
          if (dqCount % 2 !== 0) repaired += '"';
          repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '');
          repaired = repaired.replace(/,\s*\{[^}]*$/, '');
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;
          const openBraces = (repaired.match(/\{/g) || []).length;
          const closeBraces = (repaired.match(/\}/g) || []).length;
          for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
          for (let i = 0; i < openBraces - closeBraces; i++) repaired += '}';
          repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
          try {
            parsed = JSON.parse(repaired);
          } catch(e2) {
            const extractArray = (key) => {
              const re = new RegExp('"' + key + '"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)');
              const m = jsonText.match(re);
              if (!m) return [];
              const items = [];
              const itemRe = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"info"\s*:\s*"([^"]*)"/g;
              let im;
              while ((im = itemRe.exec(m[1])) !== null) {
                items.push({ name: im[1], info: im[2] });
              }
              return items;
            };
            places   = extractArray('places');
            people   = extractArray('people');
            keywords = extractArray('keywords');
            movies   = extractArray('movies');
          }
        }
        
        if (parsed) {
          places = parsed.places || [];
          people = parsed.people || [];
          keywords = parsed.keywords || [];
          movies = parsed.movies || [];
        }
      }
    }
  }
} catch(e) {}


// ② 記事と基本情報の取得
let mainArticle = '';
try { mainArticle = $('整形2_jp').first().json.article ?? $('記事集合_jp').first().json.article ?? ''; } catch (e) { }

let deepDiveRaw = '';
try { deepDiveRaw = $('整形3_jp').first().json?.article ?? ''; } catch (e) { }

let country = '不明';
try { country = $('整形ノード1_jp').first().json.country ?? '不明'; } catch (e) { }

// ③ ポップアップHTML（歴史館リンク表示用）
const popupHTML = `
<div id="tenbin-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;" onclick="document.getElementById('tenbin-popup').style.display='none';this.style.display='none'"></div>
<div id="tenbin-popup" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:320px;background:#fff;border:1px solid #ddd;border-radius:12px;padding:25px;z-index:9999;box-shadow:0 20px 60px rgba(0,0,0,0.3);color:#333;font-family:sans-serif;">
  <div onclick="document.getElementById('tenbin-popup').style.display='none';document.getElementById('tenbin-overlay').style.display='none'" style="position:absolute;top:10px;right:15px;cursor:pointer;font-size:20px;color:#999;">✕</div>
  <div id="tenbin-popup-title" style="font-weight:bold;color:#20B2AA;margin-bottom:10px;font-size:18px;border-bottom:1px solid #eee;padding-bottom:10px;"></div>
  <div id="tenbin-popup-info" style="font-size:14px;line-height:1.7;color:#555;margin-top:10px;"></div>
</div>`;

function enc(t) {
  try { return btoa(unescape(encodeURIComponent(t || ''))); }
  catch (e) { return ''; }
}

// ⑤ バリエーション生成
function getSearchVariants(name, type) {
  name = name.replace(/(前大統領|元大統領|大統領|前首相|元首相|首相|前大臣|元大臣|大臣|氏|前|元)$/, '').trim();
  const base = name.replace(/[（\(\[［].*?[）\)］]/g, '').trim();
  const insideMatch = name.match(/[（\(［](.*?)[）\)］]/);
  const inside = insideMatch ? insideMatch[1].trim() : "";
  
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
  
  const suffixes = ['王国', '共和国', '連邦共和国', '連邦', '合衆国', '民主共和国', '社会主義共和国', '公国'];
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

// ⑥ 候補統合
const flatPatterns = [];
const allEntities = [
  ...people.map(p => ({type: 'people', ...p})),
  ...places.map(p => ({type: 'places', ...p})),
  ...keywords.map(p => ({type: 'keywords', ...p})),
  ...movies.map(p => ({type: 'movies', ...p})),
  ...crimes.map(p => ({type: 'crimes', ...p}))
];

for (const entity of allEntities) {
  if (!entity.name) continue;
  if (entity.type !== 'crimes' && entity.type !== 'movies' && !entity.info) continue;
  entity.name = String(entity.name);
  entity.info = String(entity.info || '');
  if (/語$/.test(entity.name)) continue;

  const variants = getSearchVariants(entity.name, entity.type);
  for (const pattern of variants) {
    flatPatterns.push({
      entity: entity,
      pattern: pattern
    });
  }
}

// 重複パターンを除去（長い方を優先）
const uniquePatterns = [];
const seen = new Set();
for (const cand of flatPatterns.sort((a, b) => b.pattern.length - a.pattern.length)) {
  if (!seen.has(cand.pattern)) {
    seen.add(cand.pattern);
    uniquePatterns.push(cand);
  }
}

// リンク插入処理を再利用できるよう関数化
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
    } else if (cand.entity.type === 'crimes') {
      mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?mode=incident&q=${encodeURIComponent(cand.entity.name)}`;
    } else if (cand.entity.type === 'people') {
      mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?mode=person&q=${encodeURIComponent(cand.entity.name)}`;
    } else if (cand.entity.type === 'movies') {
      mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?mode=movie&q=${encodeURIComponent(cand.entity.name)}`;
    } else {
      mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?q=${encodeURIComponent(cand.entity.name)}`;
    }

    let spanHTML;
    if (cand.entity.type === 'crimes' || cand.entity.type === 'movies') {
      const mode = cand.entity.type === 'crimes' ? 'incident' : 'movie';
      const mapUrl = `https://kokkanotenbin-map.shinya4869ari.workers.dev/?mode=${mode}&q=${encodeURIComponent(cand.entity.name)}`;
      const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
      const n = enc(cand.entity.name);
      const i = enc(linkHTML);
      const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${n}");document.getElementById("tenbin-popup-info").innerHTML=d("${i}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;
      spanHTML = `<span style="color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;font-weight:bold;" onclick='${onclick}'>${cand.pattern}</span>`;
    } else {
      const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#20B2AA;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
      const n = enc(cand.entity.name);
      const i = enc(cand.entity.info + linkHTML);
      const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${n}");document.getElementById("tenbin-popup-info").innerHTML=d("${i}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;
      spanHTML = `<span style="color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;font-weight:bold;" onclick='${onclick}'>${cand.pattern}</span>`;
    }

    const tradePartners = ["アメリカ合衆国", "中国", "台湾", "韓国", "香港", "タイ", "シンガポール", "インド", "ベトナム", "ドイツ"];
    const isTradePartner = cand.entity.type === 'places' && tradePartners.includes(cand.pattern);

    let newTokens = [];
    let replaced = false;
    let insideNoLink = false;

    for (let idxToken = 0; idxToken < linkTokens.length; idxToken++) {
      let token = linkTokens[idxToken];
      if (token.type === 'tag') {
        if (token.text.includes('class="no-link"') || token.text.includes("class='no-link'")) {
          insideNoLink = true;
        } else if (token.text.startsWith('</')) {
          insideNoLink = false;
        }
        newTokens.push(token);
        continue;
      }

      if (replaced || insideNoLink || token.text.includes('quickchart.io')) {
        newTokens.push(token);
        continue;
      }

      if (isTradePartner) {
        // 貿易相手国は、<td>セル内でのみリンク化（直前が<td>、直後が</td>）
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
        // その他の地名やキーワードは最初に出現したテキスト部分で通常リンク化
        const idx = token.text.indexOf(cand.pattern);
        if (idx !== -1) {
          replaced = true;
          newTokens.push({ type: 'text', text: token.text.substring(0, idx) });
          newTokens.push({ type: 'tag', text: spanHTML });
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

// メイン記事にリンク挙入
const linkedMain = insertLinks(mainArticle);
// Deep Diveにも同じリンク插入を適用
const linkedDeepDive = deepDiveRaw ? insertLinks(deepDiveRaw) : '';

const finalArticle = linkedMain + '\n\n' + popupHTML;

return [{ json: { article: finalArticle, deepDiveArticle: linkedDeepDive, country: country } }];

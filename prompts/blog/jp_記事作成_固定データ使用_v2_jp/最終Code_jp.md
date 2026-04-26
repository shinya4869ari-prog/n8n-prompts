const promptBody = $input.first()?.json?.externalPrompt ?? "";

return $input.all().map(item => {
const inputData = item.json;
let raw = inputData?.article ?? "";

const countryName = "日本";
const title = "日本";

// --- 2. パイプ区切りデータをパース ---
function parseLines(text, prefix) {
return text.split('\n')
.filter(l => l.startsWith(prefix + '｜'))
.map(l => {
const parts = l.replace(prefix + '｜', '').split('｜');
const obj = {};
parts.forEach(p => {
const idx = p.indexOf('：');
if (idx !== -1) obj[p.substring(0, idx).trim()] = p.substring(idx + 1).trim();
});
return obj;
});
}

const yushutsuData = parseLines(raw, '輸出');
const yunyuData = parseLines(raw, '輸入');
const boekiAiteData = parseLines(raw, '貿易相手');
const rekishiData = parseLines(raw, '歴史');
const eizouData = parseLines(raw, '映像');
const kougyouData = parseLines(raw, '興行');

// --- 4. HTML生成ヘルパー ---
function makeTable(headers, rows, widths) {
const thStyle = (w) => `border:1px solid #eee;padding:12px
14px;background:linear-gradient(135deg,#e0f5f5,#f0f8f8);text-align:left;${w ? 'width:'+w+';' : ''}`;
const tdStyle = `border:1px solid #eee;padding:12px 14px;`;
const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;`;
const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;font-size:14px;margin:28px
0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
const thead = `<thead>
    <tr>${headers.map((h, i) => `<th style="${thStyle(widths ? widths[i] : '')}">${h}</th>`).join('')}</tr>
</thead>`;
const tbody = `<tbody>${rows.map((row, ri) => {
    const bg = ri % 2 === 1 ? 'background:#fafafa;' : '';
    return `<tr style="${bg}">${row.map((cell, ci) => `<td style="${ci === 0 ? tdBoldStyle : tdStyle}">${cell}</td>
        `).join('')}</tr>`;
    }).join('')}</tbody>`;
return `<table style="${tableStyle}">${thead}${tbody}</table>`;
}

// --- 5. テキスト抽出ヘルパー ---
function extractTextBetween(text, startMarker, endMarker) {
const lines = text.split('\n');
let inRange = false;
const result = [];
for (const l of lines) {
if (!inRange && l.includes(startMarker)) { inRange = true; continue; }
if (inRange && endMarker && l.includes(endMarker)) break;
if (inRange) {
if (l.includes('｜')) continue;
if (/^出典：/.test(l.trim())) continue;
if (/^為替レート：/.test(l.trim())) continue;
result.push(l);
}
}
return result.join('\n').trim();
}

const h2 = (text) => `<h2
    style="margin-top:80px;margin-bottom:24px;padding-top:24px;border-top:3px solid #00bcd4;font-size:18px!important;font-weight:900;color:#111;">
    ${text}</h2>\n`;
const h3 = (text) => `<h3
    style="margin-top:48px;margin-bottom:20px;padding-top:16px;border-top:1px solid #ddd;font-size:15px!important;font-weight:900;color:#111;">
    ${text}</h3>\n`;
let article = '';

// --- 6. 導入文 ---
const rawLines = raw.split('\n');
let introText = '';
for (const l of rawLines) {
introText += l + '\n';
if (l.includes('数字と事実（Fact）から、日本の真実を紐解きます')) break;
}
article += introText + '\n';

// --- 7. ① 貿易 ---
article += h2('① 貿易');
if (yushutsuData.length > 0 && yunyuData.length > 0) {
const maxLen = Math.max(yushutsuData.length, yunyuData.length);
const boekiRows = Array.from({length: maxLen}, (_, i) => [
(i + 1) + '位',
yushutsuData[i] ? yushutsuData[i]['品目'] || '' : '',
yunyuData[i] ? yunyuData[i]['品目'] || '' : ''
]);
article += makeTable(['順位', '輸出品目', '輸入品目'], boekiRows, ['10%', '45%', '45%']);
const boekiCite = raw.split('\n').find(l => l.startsWith('出典：') && (l.includes('関税') || l.includes('貿易') ||
l.includes('財務省')));
if (boekiCite) article += `<p class="citation">${boekiCite}</p>\n`;
}
article += h3('主要貿易相手国');
if (boekiAiteData.length > 0) {
const aiteRows = boekiAiteData.map(d => {
      const shareRaw = d['シェア'] || '';
      const shareNum = parseFloat(shareRaw);
      const shareStr = !isNaN(shareNum) && shareNum <= 1 ? (shareNum * 100).toFixed(1) + '%' : shareRaw;
      return [d['順位'] || '', d['国名'] || 'データなし', shareStr || 'データなし'];
    });
article += makeTable(['順位', '国名', 'シェア'], aiteRows, ['10%', '60%', '30%']);
}
const boekiText = extractTextBetween(raw, '貿易相手｜順位：10位｜', '歴史｜年：');
if (boekiText) article += `\n${boekiText}\n`;

// --- 8. ② 歴史的背景 ---
article += h2('② 歴史的背景（近代100年）');
if (rekishiData.length > 0) {
const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;font-size:14px;margin:28px
0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
const thStyle = `border:1px solid #eee;padding:12px
14px;background:linear-gradient(135deg,#e0f5f5,#f0f8f8);text-align:left;`;
let rekishiHtml = `<table style="${tableStyle}">
    <thead>
        <tr>`;
            rekishiHtml += `<th style="${thStyle}width:10%;">年</th>
            <th style="${thStyle}width:25%;">事象名</th>
            <th style="${thStyle}width:65%;">概要</th>`;
            rekishiHtml += `
        </tr>
    </thead>
    <tbody>`;
        rekishiData.forEach(d => {
        const bg = 'background:#fff3f3;';
        rekishiHtml += `<tr style="${bg}">`;
            rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['年'] || ''}</td>`;
            rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['事象名'] || ''}</td>`;
            rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['概要'] || ''}</td>`;
            rekishiHtml += `</tr>`;
        });
        rekishiHtml += `</tbody>
</table>`;
article += rekishiHtml;
}

// --- 9. ③ 直近の動向 ---
article += h2('③ 直近の動向');
const dohStart = rawLines.findIndex(l => l.startsWith('<p>') && !l.includes('citation'));
    const dohEnd = rawLines.findIndex(l => l.startsWith('映像｜'));
    if (dohStart !== -1 && dohEnd !== -1 && dohStart < dohEnd) { article +=rawLines.slice(dohStart, dohEnd).join('\n')
        + '\n' ; } const nekoMatch=raw.match(/🐱[^\n]+/); if (nekoMatch) article +=`<p>${nekoMatch[0]}</p>\n`;

// --- 10. ④ 映像作品カード ---
article += h2('④ 映像で知る日本');
if (eizouData.length > 0) {
eizouData.forEach(d => {
const isSerious = d['深刻'] === 'true';
const bg = isSerious ? '#fff3f3' : '#ffffff';
const wikiUrl = d['wikipedia_url'] && d['wikipedia_url'] !== 'データなし' ? d['wikipedia_url'] : '';
const imdbUrl = d['imdb_url'] && d['imdb_url'] !== 'データなし' ? d['imdb_url'] : '';
const wikiBtn = wikiUrl ? `<a href="${wikiUrl}" target="_blank"
    style="display:inline-block;padding:4px 14px;background:#4CAF50;color:#fff;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">Wiki</a>`
: '';
const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank"
    style="display:inline-block;padding:4px 14px;background:#F5C518;color:#000;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">IMDb</a>`
: '';
article += `
<div
    style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <div style="font-weight:800;font-size:16px;color:#222;margin-bottom:6px;">${isSerious ? '⚠️ ' : ''}${d['タイトル'] ||
        ''}</div>
    <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${d['種別'] || ''} &nbsp;•&nbsp;
        ${d['公開年'] || ''}</div>
    <div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:12px;">${d['概要'] || ''}</div>
    <div>${wikiBtn}${imdbBtn}</div>
</div>`;
});
}

// --- 11. ⑤ 興行収入ランキング ---
article += h2('⑤ 日本映画 歴代興行収入ランキング');
if (kougyouData.length > 0) {
kougyouData.forEach(d => {
const isSerious = d['深刻'] === 'true';
const bg = isSerious ? '#fff3f3' : '#ffffff';
const wikiUrl = d['wikipedia_url'] && d['wikipedia_url'] !== 'データなし' ? d['wikipedia_url'] : '';
const imdbUrl = d['imdb_url'] && d['imdb_url'] !== 'データなし' ? d['imdb_url'] : '';
const genTitle = d['原題'] || d['タイトル'] || '';
const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(genTitle + ' trailer')}`;
const wikiBtn = wikiUrl ? `<a href="${wikiUrl}" target="_blank"
    style="display:inline-block;padding:4px 14px;background:#4CAF50;color:#fff;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">Wiki</a>`
: '';
const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank"
    style="display:inline-block;padding:4px 14px;background:#F5C518;color:#000;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">IMDb</a>`
: '';
const ytBtn = `<a href="${ytUrl}" target="_blank"
    style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">▶
    Trailer</a>`;
article += `
<div
    style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#ff4500;"></div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span
            style="background:#ff4500;color:#fff;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">${d['順位']
            || ''}</span>
        <span style="font-weight:800;font-size:16px;">${d['タイトル'] || ''}</span>
    </div>
    <div style="font-size:13px;color:#666;margin-bottom:12px;">📅 ${d['公開年'] || ''} &nbsp;|&nbsp; 👥 ${d['興行収入'] || d['動員数'] || d['観客動員数'] || 'データなし'}</div>
    <div>${wikiBtn}${imdbBtn}${ytBtn}</div>
</div>`;
});
}

  // --- 12. ライブログ ---
  const logMatch = raw.match(/(### 【ライブ検索[\s\S]*$)/);
  if (logMatch) article += '\n' + logMatch[1];

  // --- 13. Deep-Dive ---
  const deepDiveMatch = raw.match(/<h2>Deep Dive<\/h2>[\s\S]*/);
  if (deepDiveMatch) {
    article += `<hr style="margin:80px 0 60px;border:none;border-top:3px solid #00bcd4;">\n`;
    const deepDiveHtml = deepDiveMatch[0]
      .replace(/<h2>/g, '<h2 style="margin-top:80px;margin-bottom:24px;padding-top:24px;font-size:18px!important;font-weight:900;color:#111;">')
      .replace(/<h3>/g, '<h3 style="margin-top:48px;margin-bottom:20px;padding-top:16px;font-size:15px!important;font-weight:900;color:#111;">');
    article += deepDiveHtml;
  }

  // --- 14. 最終出力 ---
  return {
    json: {
      article: promptBody ? `${promptBody}\n\n${article}` : article,
      title: title,
      country: countryName,
      processedAt: new Date().toISOString()
    }
  };
});

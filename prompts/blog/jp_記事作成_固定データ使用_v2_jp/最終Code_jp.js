const promptBody = $input.first()?.json?.externalPrompt ?? "";
const sheetData = $('整形ノード1_jp').first().json;

return $input.all().map(item => {
  const inputData = item.json;
  let raw = inputData?.article ?? "";

  const countryName = "日本";
  const title = "日本";
  const themeColor = "#d32f2f"; // ジャパン・レッド

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

  function makeTable(headers, rows, widths) {
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fff5f5,#ffebee);text-align:left;font-size:14px;${w ? 'width:'+w+';' : ''}`;
    const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;`;
    const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;`;
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;margin:28px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thead = `<thead><tr>${headers.map((h, i) => `<th style="${thStyle(widths ? widths[i] : '')}">${h}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map((row, ri) => {
      const bg = ri % 2 === 1 ? 'background:#fafafa;' : '';
      return `<tr style="${bg}">${row.map((cell, ci) => `<td style="${ci === 0 ? tdBoldStyle : tdStyle}">${cell}</td>`).join('')}</tr>`;
    }).join('')}</tbody>`;
    return `<table style="${tableStyle}">${thead}${tbody}</table>`;
  }

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

  const h2 = (text) => `<h2 style="margin-top:60px;margin-bottom:24px;padding-top:20px;border-top:3px solid ${themeColor};font-size:16px;font-weight:900;color:#111;">${text}</h2>\n`;
  const h3 = (text) => `<h3 style="margin-top:40px;margin-bottom:20px;padding-top:16px;border-top:1px solid #ddd;font-size:14px;font-weight:900;color:#333;">${text}</h3>\n`;
  
  let article = '';

  // --- ヒーローステータスカード（冒頭） ---
  article += `
<div style="background:linear-gradient(135deg, #fff5f5 0%, #ffebee 100%); border:1px solid #eee; border-left:8px solid ${themeColor}; border-radius:12px; padding:24px; margin-bottom:35px; box-shadow:0 4px 15px rgba(0,0,0,0.06); position:relative; overflow:hidden;">
  <div style="position:absolute; top:-20px; right:-20px; font-size:100px; color:${themeColor}; opacity:0.05; transform:rotate(-15deg); font-weight:bold; z-index:0;">FACT</div>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div>
      <div style="font-size:12px; color:${themeColor}; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">National Profile</div>
      <h1 style="margin:0; font-size:28px; font-weight:900; color:#111; letter-spacing:-0.5px;">${countryName}</h1>
      <div style="margin:8px 0 0; font-size:14px; color:#555; display:flex; gap:12px; align-items:center;">
        <span>📍 東京（Tokyo）</span>
        <span style="color:#ccc;">|</span>
        <span>🌍 東アジア</span>
      </div>
    </div>
    <div style="background:${themeColor}; color:#fff; padding:8px 18px; border-radius:30px; font-weight:900; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:flex; align-items:center; gap:6px;">
      ✅ 安定
    </div>
  </div>
</div>
`;

  const rawLines = raw.split('\n');
  let introText = '';
  for (const l of rawLines) {
    introText += l + '\n';
    if (l.includes('数字と事実（Fact）から、日本の真実を紐解きます')) break;
  }
  article += introText + '\n';

  article += h2('① 貿易');
  if (yushutsuData.length > 0 && yunyuData.length > 0) {
    const maxLen = Math.max(yushutsuData.length, yunyuData.length);
    const boekiRows = Array.from({length: maxLen}, (_, i) => [
      (i + 1) + '位',
      yushutsuData[i] ? yushutsuData[i]['品目'] || '' : '',
      yunyuData[i] ? yunyuData[i]['品目'] || '' : ''
    ]);
    article += makeTable(['順位', '輸出品目', '輸入品目'], boekiRows, ['10%', '45%', '45%']);
    const boekiCiteStr = sheetData.data?.固定データ?.貿易出典_日本 || '財務省貿易統計';
    article += `<p class="citation">出典：${boekiCiteStr}</p>\n`;
  }
  article += h3('主要貿易相手国');
  if (boekiAiteData.length > 0) {
    const aiteRows = boekiAiteData.map(d => [d['順位'] || '', d['国名'] || 'データなし', d['シェア'] || 'データなし']);
    article += makeTable(['順位', '国名', 'シェア'], aiteRows, ['10%', '60%', '30%']);
  }
  const boekiText = extractTextBetween(raw, '貿易相手｜順位：10位｜', '歴史｜年：');
  if (boekiText) article += `\n${boekiText}\n`;

  article += h2('② 歴史的背景（近代100年）');
  if (rekishiData.length > 0) {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;margin:28px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thStyle = `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fff5f5,#ffebee);text-align:left;font-size:14px;`;
    let rekishiHtml = `<table style="${tableStyle}"><thead><tr>`;
    rekishiHtml += `<th style="${thStyle}width:10%;">年</th><th style="${thStyle}width:25%;">事象名</th><th style="${thStyle}width:65%;">概要</th>`;
    rekishiHtml += `</tr></thead><tbody>`;
    rekishiData.forEach(d => {
      rekishiHtml += `<tr style="background:#fffafa;">`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-size:14px;">${d['年'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-size:14px;">${d['事象名'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-size:14px;">${d['概要'] || ''}</td>`;
      rekishiHtml += `</tr>`;
    });
    rekishiHtml += `</tbody></table>`;
    article += rekishiHtml;
  }

  article += h2('③ 直近の動向');
  const dohStart = rawLines.findIndex(l => l.startsWith('<p>') && !l.includes('citation'));
  const dohEnd = rawLines.findIndex(l => l.startsWith('映像｜'));
  if (dohStart !== -1 && dohEnd !== -1 && dohStart < dohEnd) {
    article += rawLines.slice(dohStart, dohEnd).join('\n') + '\n';
  }
  const nekoMatch = raw.match(/🐱[^\n]+/);
  if (nekoMatch) article += `<p>${nekoMatch[0]}</p>\n`;

  article += h2('④ 映像で知る日本');
  if (eizouData.length > 0) {
    eizouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      const wikiUrl = d['wikipedia_url'] && d['wikipedia_url'] !== 'データなし' ? d['wikipedia_url'] : '';
      const imdbUrl = d['imdb_url'] && d['imdb_url'] !== 'データなし' ? d['imdb_url'] : '';
      const wikiBtn = wikiUrl ? `<a href="${wikiUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#4CAF50;color:#fff;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">Wiki</a>` : '';
      const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#F5C518;color:#000;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">IMDb</a>` : '';
      article += `\n<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);">\n  <div style="font-weight:800;font-size:16px;color:#222;margin-bottom:6px;">${isSerious ? '⚠️ ' : ''}${d['タイトル'] || ''}</div>\n  <div style="font-size:12px;color:${themeColor};font-weight:bold;margin-bottom:10px;">${d['種別'] || ''} &nbsp;•&nbsp; ${d['公開年'] || ''}</div>\n  <div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:12px;">${d['概要'] || ''}</div>\n  <div>${wikiBtn}${imdbBtn}</div>\n</div>`;
    });
    // 出典：sheetDataの映像作品リストから重複なしで取得（メイン版と同じ方式）
    const eizouSheetData = sheetData.data?.対象国データ_記事?.映像作品 || [];
    const eizouCites = [...new Set(eizouSheetData.map(d => d.出典).filter(Boolean))];
    if (eizouCites.length > 0) {
      article += `<p class="citation">出典：${eizouCites.join(' / ')}</p>\n`;
    }
  }

  article += h2('⑤ 日本映画 歴代興行収入ランキング');
  if (kougyouData.length > 0) {
    kougyouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      const wikiUrl = d['wikipedia_url'] && d['wikipedia_url'] !== 'データなし' ? d['wikipedia_url'] : '';
      const imdbUrl = d['imdb_url'] && d['imdb_url'] !== 'データなし' ? d['imdb_url'] : '';
      const genTitle = d['原題'] || d['タイトル'] || '';
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(genTitle + ' trailer')}`;
      const wikiBtn = wikiUrl ? `<a href="${wikiUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#4CAF50;color:#fff;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">Wiki</a>` : '';
      const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#F5C518;color:#000;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">IMDb</a>` : '';
      const ytBtn = `<a href="${ytUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:12px;margin-right:6px;">▶ Trailer</a>`;
      article += `\n<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.05);position:relative;overflow:hidden;">\n  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${themeColor};"></div>\n  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">\n    <span style="background:${themeColor};color:#fff;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">${d['順位'] || ''}</span>\n    <span style="font-weight:800;font-size:16px;">${d['タイトル'] || ''}</span>\n  </div>\n  <div style="font-size:13px;color:#666;margin-bottom:12px;">📅 ${d['公開年'] || ''} &nbsp;|&nbsp; 👥 ${d['興行収入'] || d['動員数'] || d['観客動員数'] || 'データなし'}</div>\n  <div>${wikiBtn}${imdbBtn}${ytBtn}</div>\n</div>`;
    });
    // 出典：sheetDataの興行収入リストから重複なしで取得（メイン版と同じ方式）
    const kougyouSheetData = sheetData.data?.対象国データ_記事?.興行収入ランキング || [];
    const kougyouCites = [...new Set(kougyouSheetData.map(d => d.出典).filter(Boolean))];
    if (kougyouCites.length > 0) {
      article += `<p class="citation">出典：${kougyouCites.join(' / ')}</p>\n`;
    }
  }

  const logMatch = raw.match(/(### 【ライブ検索[\s\S]*$)/);
  if (logMatch) article += '\n' + logMatch[1];

  const deepDiveMatch = raw.match(/<h2>Deep Dive<\/h2>[\s\S]*/);
  if (deepDiveMatch) {
    article += `<hr style="margin:80px 0 60px;border:none;border-top:3px solid ${themeColor};">\n`;
    const deepDiveHtml = deepDiveMatch[0]
      .replace(/<h2>/g, `<h2 style="margin-top:60px;margin-bottom:24px;padding-top:20px;font-size:16px;font-weight:900;color:#111;border-top:3px solid ${themeColor};">`)
      .replace(/<h3>/g, '<h3 style="margin-top:40px;margin-bottom:20px;padding-top:16px;font-size:14px;font-weight:900;color:#333;">');
    article += deepDiveHtml;
  }

  return {
    json: {
      article: promptBody ? `${promptBody}\n\n${article}` : article,
      title: title,
      country: countryName,
      processedAt: new Date().toISOString()
    }
  };
});
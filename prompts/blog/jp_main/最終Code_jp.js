const sheetData = $('整形ノード1_jp').first().json;
const moviesData = $('リンク挿入_jp').first().json?.movies || [];

return $input.all().map(item => {
  const inputData = item.json;
  let raw = inputData?.article ?? "";
  const rawLines = raw.split('\n');

  raw = raw.replace(/^[①-⑨] .*$/gm, '');
  raw = raw.replace(/^出典：.*$/gm, '');

  const countryName = "日本";
  const capital = "東京";
  const themeColor = "#d32f2f";

  function parseLines(text, prefix) {
    return text.split('\n')
      .filter(l => l.includes(prefix + '｜'))
      .map(l => {
        const cleanedLine = l.replace(/<\/?[^>]+(>|$)/g, "").trim();
        const parts = cleanedLine.split('｜');
        const obj = {};
        parts.forEach(p => {
          const idx = p.indexOf('：');
          if (idx !== -1) obj[p.substring(0, idx).trim()] = p.substring(idx + 1).trim();
        });
        return obj;
      });
  }

  const h2Style = `margin-top:60px;padding-top:20px;border-top:1px solid #ffcdd2;font-size:16px;font-weight:900;color:#111;`;
  const h3Style = `font-size:14px;font-weight:800;color:#333;margin-top:30px;margin-bottom:10px;`;
  const citationStyle = `font-size:12px;color:#aaa;text-align:right;margin-top:4px;margin-bottom:24px;`;

  function makeTable(headers, rows, widths) {
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-size:14px;${w ? 'width:' + w + ';' : ''}`;
    const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;`;
    const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;`;
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thead = `<thead><tr>${headers.map((h, i) => `<th style="${thStyle(widths ? widths[i] : '')}">${h}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map((row, ri) => {
      const bg = ri % 2 === 1 ? 'background:#fafafa;' : '';
      return `<tr style="${bg}">${row.map((cell, ci) => `<td style="${ci === 0 ? tdBoldStyle : tdStyle}">${cell}</td>`).join('')}</tr>`;
    }).join('')}</tbody>`;
    return `<table style="${tableStyle}">${thead}${tbody}</table>`;
  }

  function extractTextBetween(text, start, end) {
    const lines = text.split('\n');
    const startIdx = lines.findIndex(l => l.includes(start));
    if (startIdx === -1) return '';
    const slice = lines.slice(startIdx + 1);
    const endIdx = slice.findIndex(l => l.includes(end));
    return (endIdx === -1 ? slice : slice.slice(0, endIdx)).join('\n').trim();
  }

  function makeNekoBubble(text) {
    if (!text || !text.includes('🐱')) return '';
    const content = text.replace(/🐱\s*エラーネコ：/, '').trim();
    return `
<div style="margin: 20px 0; display: flex; align-items: flex-start; gap: 12px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #fffafa; border: 1px solid #ffebee; border-radius: 12px; padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #444; flex: 1;">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #fffafa;"></div>
    <strong>エラーネコの一言：</strong><br>${content}
  </div>
</div>`;
  }

  function getNekoBubbleForSection(sectionNum) {
    const startIdx = rawLines.findIndex(l => l.trim().startsWith(sectionNum) || l.includes(sectionNum));
    if (startIdx === -1) {
      const circleNums = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
      const orderIdx = circleNums.indexOf(sectionNum);
      const nekoLines = rawLines.filter(l => l.includes('🐱 エラーネコ：'));
      return nekoLines[orderIdx] || '';
    }
    const slice = rawLines.slice(startIdx);
    return slice.find(l => l.includes('🐱 エラーネコ：')) || '';
  }

  // ポスター画像URL生成
  function getPosterUrl(posterPath) {
    if (!posterPath || posterPath === 'null') return null;
    return `https://image.tmdb.org/t/p/w185${posterPath}`;
  }

  let article = '';

  article += `
<div style="background:linear-gradient(135deg, #fffafa 0%, #ffebee 100%); border:1px solid #eee; border-left:8px solid #d32f2f; border-radius:12px; padding:24px; margin-bottom:35px; box-shadow:0 4px 15px rgba(0,0,0,0.06); position:relative; overflow:hidden;">
  <div style="position:absolute; top:-20px; right:-20px; font-size:100px; color:#d32f2f; opacity:0.05; transform:rotate(-15deg); font-weight:bold; z-index:0;">FACT</div>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div>
      <div style="font-size:12px; color:#d32f2f; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">National Profile</div>
      <h1 style="margin:0; font-size:28px; font-weight:900; color:#111; letter-spacing:-0.5px;">日本</h1>
      <div style="margin:8px 0 0; font-size:14px; color:#555; display:flex; gap:12px; align-items:center;">
        <span>📍 東京（首都）</span>
        <span style="color:#ccc;">|</span>
        <span>🌍 東アジア、太平洋</span>
      </div>
    </div>
    <div style="background:#d32f2f; color:#fff; padding:8px 18px; border-radius:30px; font-weight:900; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:flex; align-items:center; gap:6px;">
      🇯🇵 本国（安全）
    </div>
  </div>
</div>
`;

  let introText = "";
  const firstSectionIdx = rawLines.findIndex(l => /(?:①|1\.?)\s*貿易/.test(l) || /^輸出[｜|]/.test(l));
  if (firstSectionIdx !== -1) {
    introText = rawLines.slice(0, firstSectionIdx).join('\n').trim();
  } else {
    const fallbackIdx = rawLines.findIndex(l => /^輸出[｜|]/.test(l) || /^貿易相手[｜|]/.test(l));
    if (fallbackIdx !== -1) {
      introText = rawLines.slice(0, fallbackIdx).join('\n').trim();
    }
  }

  introText = introText.replace(/^#+.*$/gm, '').trim();

  if (introText) {
    const introHtml = introText
      .split(/\n{2,}/)
      .map(p => {
        const cleanP = p.trim().replace(/^[\s\n]+|[\s\n]+$/g, '');
        if (!cleanP || cleanP.includes('FACT') || cleanP.startsWith('①')) return '';
        return `<p style="font-size:15px; line-height:2.0; color:#333; margin:18px 0; text-align:justify; text-justify:inter-ideograph;">${cleanP.split('\n').join('<br>')}</p>`;
      })
      .filter(Boolean)
      .join('\n');
    article += introHtml + '\n';
  }

  article += `<h2 style="${h2Style}">① 貿易の衡量</h2>\n`;
  const yushutsuData = parseLines(raw, '輸出');
  const yunyuData = parseLines(raw, '輸入');
  if (yushutsuData.length > 0 || yunyuData.length > 0) {
    const tradeRows = [];
    for (let i = 0; i < 10; i++) {
      tradeRows.push([i + 1, yushutsuData[i]?.品目 || '-', yunyuData[i]?.品目 || '-']);
    }
    article += makeTable(['順位', '輸出主要品目', '輸入主要品目'], tradeRows, ['10%', '45%', '45%']);
  }
  const boekiAiteData = parseLines(raw, '貿易相手');
  if (boekiAiteData.length > 0) {
    article += `<h3 style="${h3Style}">主要な貿易相手国</h3>\n`;
    const partnerRows = boekiAiteData.map(d => [d['順位'], d['国名'], d['シェア']]);
    article += makeTable(['順位', '相手国', 'シェア'], partnerRows, ['10%', '60%', '30%']);
    const boekiCite = sheetData.data?.固定データ?.貿易出典_日本 || '財務省貿易統計';
    article += `<p style="${citationStyle}">出典：${boekiCite}</p>\n`;
  }
  const boekiExplanation = extractTextBetween(raw, '貿易相手｜順位：10位｜', '🐱 エラーネコ：');
  if (boekiExplanation) article += `\n${boekiExplanation}\n`;
  const boekiNeko = getNekoBubbleForSection('①');
  article += makeNekoBubble(boekiNeko);

  article += `<h2 style="${h2Style}">② 歴史的背景（近代100年）</h2>\n`;
  const rekishiData = parseLines(raw, '歴史');
  if (rekishiData.length > 0) {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;font-size:14px;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thStyle = `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-weight:bold;`;
    let rekishiHtml = `<table style="${tableStyle}"><thead><tr>`;
    rekishiHtml += `<th style="${thStyle}width:10%;">年</th><th style="${thStyle}width:20%;">事象名</th><th style="${thStyle}width:15%;">種別</th><th style="${thStyle}width:55%;">概要</th>`;
    rekishiHtml += `</tr></thead><tbody>`;
    rekishiData.forEach(d => {
      const type = d['種別'] || '';
      let bg = '';
      if (type.includes('戦争') || type.includes('虐殺')) bg = 'background:#fff3f3;';
      else if (type.includes('事件') || type.includes('事故')) bg = 'background:#f0f7ff;';
      else if (type.includes('政治') || type.includes('体制')) bg = 'background:#f0fff4;';
      let ganyouText = d['概要'] || '';
      if (d['出典'] && d['出典'] !== '欠測' && d['出典'] !== '未確認') {
        ganyouText += `<span style="color:#888;font-size:12px;display:block;margin-top:4px;">（出典：${d['出典']}）</span>`;
      }
      rekishiHtml += `<tr style="${bg}">`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-weight:bold;">${d['年'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['事象名'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-size:11px;">${type}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${ganyouText}</td>`;
      rekishiHtml += `</tr>`;
    });
    rekishiHtml += `</tbody></table>`;
    article += rekishiHtml;
  }
  const rekishiNeko = getNekoBubbleForSection('②');
  article += makeNekoBubble(rekishiNeko);

  article += `<h2 style="${h2Style}">③ 直近の動向</h2>\n`;
  const dohContent = extractTextBetween(raw, '<p>【政治経済社会】</p>', '🐱 エラーネコ：');
  if (dohContent) {
    article += `<p>【政治経済社会】</p>\n${dohContent}\n`;
    let dohCite = sheetData.data?.対象国データ_記事?.直近の動向?.出典 || '';
    if (!dohCite || dohCite === '欠測' || dohCite === 'データなし') {
      dohCite = '日本経済新聞 / 首相官邸 / 総務省 / 外務省';
    }
    article += `<p style="${citationStyle}">出典：${dohCite}</p>\n`;
  }
  const dohNeko = getNekoBubbleForSection('③');
  article += makeNekoBubble(dohNeko);

  // --- ④ 映像で知る日本（ポスター画像追加） ---
  article += `<h2 style="${h2Style}">④ 映像で知る日本</h2>\n`;
  const eizouList = sheetData.data?.対象国データ_記事?.映像作品 || [];
  const eizouData = parseLines(raw, '映像');
  eizouData.forEach((d, i) => {
    const posterPath = eizouList[i]?.poster_path || null;
    const posterUrl = getPosterUrl(posterPath);
    const movieInfo = (eizouList[i]?.概要 || moviesData.find(m => m.name === d['タイトル'])?.info || '').replace(/"/g, '&quot;');
    const imdbId = eizouList[i]?.imdb_id || null;
    const isValidImdb = imdbId && /^tt\d+/.test(imdbId.trim());
    const imdbBtn = isValidImdb ? `<a href="https://www.imdb.com/title/${imdbId.trim()}/" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

    article += `
<div style="background:#fff;border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);display:flex;gap:16px;align-items:flex-start;">
  <div style="flex:1;">
    <div style="font-weight:800;font-size:16px;color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;display:inline-block;margin-bottom:6px;" data-movie-title="${d['タイトル'] || ''}" data-movie-info="${movieInfo}">${d['タイトル'] || ''}</div>
    <div style="font-size:12px;color:${themeColor};font-weight:bold;margin-bottom:6px;">${d['種別'] || ''} &nbsp;•&nbsp; ${d['公開年'] || ''}</div>
    ${d['監督_主演'] && d['監督_主演'] !== '欠測' && d['監督_主演'] !== 'データなし' ? `<div style="font-size:12px;color:#555;margin-bottom:10px;">🎬 ${d['監督_主演']}</div>` : ''}
    <div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:12px;">${d['概要'] || ''}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' 予告編')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>
      ${imdbBtn}
    </div>
  </div>
  ${posterUrl ? `<img src="${posterUrl}" alt="${d['タイトル'] || ''}" style="width:80px;min-width:80px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);flex-shrink:0;">` : ''}
</div>`;
  });
  const eizouCites = [...new Set(eizouList.map(d => d.出典).filter(Boolean))];
  if (eizouCites.length > 0) article += `<p style="${citationStyle}">出典：${eizouCites.join(' / ')}</p>\n`;
  const eizouNeko = getNekoBubbleForSection('④');
  article += makeNekoBubble(eizouNeko);

  // --- ⑤ 日本映画 歴代興行収入ランキング（ポスター画像追加） ---
  article += `<h2 style="${h2Style}">⑤ 日本映画 歴代興行収入ランキング</h2>\n`;
  const rankingList = sheetData.data?.対象国データ_記事?.興行収入ランキング || [];
  const kougyouData = parseLines(raw, '興行');
  kougyouData.forEach((d, i) => {
    const isSerious = d['深刻'] === 'true';
    const bg = isSerious ? '#fff3f3' : '#ffffff';
    const posterPath = rankingList[i]?.poster_path || null;
    const posterUrl = getPosterUrl(posterPath);
    const rankingInfo = (rankingList[i]?.概要 || moviesData.find(m => m.name === d['タイトル'])?.info || '').replace(/"/g, '&quot;');
    const imdbId = rankingList[i]?.imdb_id || null;
    const isValidImdb = imdbId && /^tt\d+/.test(imdbId.trim());
    const imdbBtn = isValidImdb ? `<a href="https://www.imdb.com/title/${imdbId.trim()}/" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

    article += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${themeColor};"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;">
    <div style="flex:1;padding-left:8px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span style="background:${themeColor};color:#fff;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">${d['順位'] || ''}</span>
        <span style="font-weight:800;font-size:16px;color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;" data-movie-title="${d['タイトル'] || ''}" data-movie-info="${rankingInfo}">${d['タイトル'] || ''}</span>
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:10px;">
        📅 ${d['公開年'] || ''}年 &nbsp;|&nbsp; 💰 ${d['興行収入'] || 'データなし'}
        ${d['監督_主演'] && d['監督_主演'] !== '欠測' && d['監督_主演'] !== 'データなし' ? `<br><span style="color:#555;font-size:12px;">🎬 監督・主演：${d['監督_主演']}</span>` : ''}
      </div>
      ${d['概要'] && d['概要'] !== '欠測' && d['概要'] !== 'データなし' ? `<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:12px;background:#fafafa;padding:8px 12px;border-radius:6px;">${d['概要']}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' 予告編')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>
        ${imdbBtn}
      </div>
    </div>
    ${posterUrl ? `<img src="${posterUrl}" alt="${d['タイトル'] || ''}" style="width:80px;min-width:80px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);flex-shrink:0;">` : ''}
  </div>
</div>`;
  });
  const rankingCites = [...new Set(rankingList.map(d => d.出典).filter(Boolean))];
  if (rankingCites.length > 0) article += `<p style="${citationStyle}">出典：${rankingCites.join(' / ')}</p>\n`;
  const kougyouNeko = getNekoBubbleForSection('⑤');
  article += makeNekoBubble(kougyouNeko);

  let deepDiveArticle = '';
  try {
    deepDiveArticle = $('リンク挿入_jp').first().json?.deepDiveArticle || '';
  } catch (e) {
    try { deepDiveArticle = $('リンク挿入').first().json?.deepDiveArticle || ''; }
    catch (e2) {
      try { deepDiveArticle = $('整形3_jp').first().json?.article || ''; }
      catch (e3) {
        try { deepDiveArticle = $('整形3').first().json?.article || ''; } catch (e4) { }
      }
    }
  }

  if (deepDiveArticle) {
    const ddColor = "#d32f2f";
    article += `
<div style="border-top:4px solid ${ddColor}; margin:80px 0 40px; padding-top:40px;">
  <div style="display:inline-block; background:${ddColor}; color:#fff; padding:5px 18px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;">✦ Deep Dive</div>
</div>\n`;
    let styledDD = deepDiveArticle;
    styledDD = styledDD.replace(/(■\s*主な出典[\s\S]*?)(?=(?:<h[1-4]|<\/div>\s*$|$))/gi, (match) => {
      let cleanedMatch = match.replace(/font-size:\s*14px/g, 'font-size:11px');
      cleanedMatch = cleanedMatch.replace(/color:\s*#333/g, 'color:#aaa');
      return `<div style="font-size:11px; color:#aaa; line-height:1.6; margin-top:30px; border-top:1px dashed #eee; padding-top:15px; margin-bottom:20px;">\n\n` + cleanedMatch + `\n\n</div>`;
    });
    article += styledDD;
  }

  const moviePopupScript = `
<script>
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-movie-title]');
  if (!el) return;
  const title = el.getAttribute('data-movie-title');
  const info = el.getAttribute('data-movie-info');
  document.getElementById('tenbin-popup-title').textContent = title;
  document.getElementById('tenbin-popup-info').innerHTML = info;
  document.getElementById('tenbin-popup').style.display = 'block';
  document.getElementById('tenbin-overlay').style.display = 'block';
});
</script>`;

  const popupHTML = `
<div id="tenbin-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;" onclick="document.getElementById('tenbin-popup').style.display='none';this.style.display='none'"></div>
<div id="tenbin-popup" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:320px;background:#fff;border:1px solid #ddd;border-radius:12px;padding:25px;z-index:9999;box-shadow:0 20px 60px rgba(0,0,0,0.3);color:#333;font-family:sans-serif;">
  <div onclick="document.getElementById('tenbin-popup').style.display='none';document.getElementById('tenbin-overlay').style.display='none'" style="position:absolute;top:10px;right:15px;cursor:pointer;font-size:20px;color:#999;">✕</div>
  <div id="tenbin-popup-title" style="font-weight:bold;color:#20B2AA;margin-bottom:10px;font-size:18px;border-bottom:1px solid #eee;padding-bottom:10px;"></div>
  <div id="tenbin-popup-info" style="font-size:14px;line-height:1.7;color:#555;margin-top:10px;"></div>
</div>`;

  return {
    json: {
      article: article + '\n\n' + moviePopupScript + '\n\n' + popupHTML,
      title: "日本",
      country: countryName,
      countryEn: "Japan",
      capital: capital,
      post_type: "page",
      is_page: true,
      category_name: "アジア",
      category_id: 2,
      categories: [2]
    }
  };
});
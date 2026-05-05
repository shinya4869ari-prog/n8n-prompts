const sheetData = $('整形ノード1_jp').first().json;

return $input.all().map(item => {
  const inputData = item.json;
  let raw = inputData?.article ?? "";

  const countryName = "日本";
  const themeColor = "#d32f2f"; // ジャパン・レッド

  // 補助関数：特定のタグで囲まれた範囲を抽出
  function extractSection(text, startTag, endTag) {
    const start = text.indexOf(startTag);
    if (start === -1) return "";
    const end = endTag ? text.indexOf(endTag, start + startTag.length) : text.length;
    return text.substring(start + startTag.length, end === -1 ? text.length : end).trim();
  }

  // 補助関数：特定のヘッダーで区切られた範囲を抽出
  function getSectionByHeader(text, header, nextHeaderRegex) {
    const parts = text.split(header);
    if (parts.length < 2) return "";
    const content = parts[1];
    if (!nextHeaderRegex) return content.trim();
    return content.split(nextHeaderRegex)[0].trim();
  }

  // 補助関数：データを抽出してオブジェクト化
  function parseLines(text, prefix) {
    return text.split('\n')
      .filter(l => l.includes(prefix + '｜'))
      .map(l => {
        const cleanedLine = l.replace(/<\/?[^>]+(>|$)/g, "").trim(); // タグ除去
        const parts = cleanedLine.split('｜');
        const obj = {};
        parts.forEach(p => {
          const idx = p.indexOf('：');
          if (idx !== -1) obj[p.substring(0, idx).trim()] = p.substring(idx + 1).trim();
        });
        return obj;
      });
  }

  // 補助関数：不要な解析用行やタグを掃除して純粋なテキストにする
  function cleanText(text) {
    if (!text) return "";
    return text.split('\n').filter(l => {
      const t = l.trim();
      if (!t) return true;
      if (t.includes('｜')) return false; // データ行を除去
      if (t.includes('[INTRO]') || t.includes('[DEEP_DIVE')) return false; // タグを除去
      if (/^#{1,4}\s*[①②③④⑤]/.test(t)) return false; // Markdownヘッダーの見出し行のみ除去
      if (/^\s*\.\.\./.test(t)) return false; // 「...（省略）」行を除去
      return true;
    }).join('\n').trim();
  }

  // --- セクション分割の実行 ---
  // AIが #### ① 貿易 のようにMarkdownヘッダー付きで書いても確実に分割できるようregexを使用
  const splitBySection = (text, regex) => text.split(regex);
  const introRaw = extractSection(raw, '[INTRO]', '① 貿易') || raw.split(/#{0,4}\s*① 貿易/)[0];
  const boekiSection = (raw.split(/#{0,4}\s*① 貿易/)[1] || '').split(/#{0,4}\s*② 歴史/)[0];
  const rekishiSection = (raw.split(/#{0,4}\s*② 歴史/)[1] || '').split(/#{0,4}\s*③ 直近/)[0];
  const dohSection = (raw.split(/#{0,4}\s*③ 直近/)[1] || '').split(/#{0,4}\s*④ 映像/)[0];
  const eizouSection = (raw.split(/#{0,4}\s*④ 映像/)[1] || '').split(/#{0,4}\s*⑤ 日本映画/)[0];
  const kougyouSection = (raw.split(/#{0,4}\s*⑤ 日本映画/)[1] || '').split(/\[DEEP_DIVE/)[0];
  const deepDiveRaw = extractSection(raw, '[DEEP_DIVE_START]', '[DEEP_DIVE_END]');

  const h2 = (text) => `<h2 style="margin-top:50px;margin-bottom:24px;padding-top:20px;border-top:1px solid #eee;font-size:18px;font-weight:900;color:#111;">${text}</h2>\n`;
  const h3 = (text) => `<h3 style="margin-top:40px;margin-bottom:15px;font-size:15px;font-weight:900;color:#111;display:flex;align-items:center;gap:8px;"><span style="width:3px;height:16px;background:${themeColor};display:inline-block;border-radius:2px;"></span>${text}</h3>\n`;
  const makeTable = (headers, rows, widths) => {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(211,47,47,0.05);border:1px solid #ffebee;`;
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-size:14px;color:#111;${w ? 'width:'+w+';' : ''}`;
    const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;color:#333;`;
    const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;color:#111;`;
    
    let html = `<table style="${tableStyle}"><thead><tr>`;
    headers.forEach((h, i) => html += `<th style="${thStyle(widths ? widths[i] : '')}">${h}</th>`);
    html += `</tr></thead><tbody>`;
    rows.forEach((row, ri) => {
      html += `<tr style="${ri % 2 === 1 ? 'background:#fffafa;' : ''}">`;
      row.forEach((cell, ci) => html += `<td style="${ci === 0 ? tdBoldStyle : tdStyle}">${cell}</td>`);
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    return html;
  };

  let article = '';

  // 1. ヒーローカード
  article += `
<div style="background:linear-gradient(135deg, #fffafa 0%, #ffebee 100%); border:1px solid #ffcdd2; border-left:10px solid ${themeColor}; border-radius:15px; padding:28px; margin-bottom:45px; box-shadow:0 8px 25px rgba(211,47,47,0.08); position:relative; overflow:hidden;">
  <div style="position:absolute; top:-10px; right:-10px; font-size:120px; color:${themeColor}; opacity:0.04; transform:rotate(-10deg); font-weight:bold; pointer-events:none;">JP</div>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div>
      <div style="font-size:12px; color:${themeColor}; font-weight:bold; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px;">National Report</div>
      <h1 style="margin:0; font-size:32px; font-weight:900; color:#111;">${countryName}</h1>
      <div style="margin:12px 0 0; font-size:14px; color:#444; display:flex; gap:15px; align-items:center;">
        <span>🇯🇵 首都：東京</span> <span style="color:#ffcdd2;">|</span> <span>🌏 地域：東アジア</span>
      </div>
    </div>
    <div style="background:${themeColor}; color:#fff; padding:10px 22px; border-radius:40px; font-weight:900; font-size:14px; box-shadow:0 4px 12px rgba(211,47,47,0.3);">✅ FACT CHECKED</div>
  </div>
</div>
`;

  // 2. 導入文
  const cleanIntro = cleanText(introRaw);
  if (cleanIntro) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin-bottom:40px;">${cleanIntro}</div>\n`;

  // 3. 貿易
  article += h2('① 貿易');
  const yushutsuData = parseLines(boekiSection, '輸出');
  const yunyuData = parseLines(boekiSection, '輸入');
  if (yushutsuData.length > 0 || yunyuData.length > 0) {
    const maxLen = Math.max(yushutsuData.length, yunyuData.length);
    const rows = Array.from({length: maxLen}, (_, i) => [
      (i + 1) + '位',
      yushutsuData[i] ? yushutsuData[i]['品目'] || '-' : '-',
      yunyuData[i] ? yunyuData[i]['品目'] || '-' : '-'
    ]);
    article += makeTable(['順位', '輸出品目', '輸入品目'], rows, ['10%', '45%', '45%']);
  }
  const boekiAiteData = parseLines(boekiSection, '貿易相手');
  if (boekiAiteData.length > 0) {
    article += h3('主要貿易相手国');
    const rows = boekiAiteData.map(d => [d['順位'] || '-', d['国名'] || '-', d['シェア'] || '-']);
    article += makeTable(['順位', '国名', 'シェア'], rows, ['10%', '60%', '30%']);
  }
  const boekiComment = cleanText(boekiSection);
  if (boekiComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${boekiComment}</div>\n`;

  // 4. 歴史的背景
  article += h2('② 歴史的背景（近代100年）');
  const rekishiData = parseLines(rekishiSection, '歴史');
  if (rekishiData.length > 0) {
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-size:14px;color:#111;${w ? 'width:'+w+';' : ''}`;
    const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;color:#333;`;
    const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;color:#111;`;
    let html = `<table style="border-collapse:separate;border-spacing:0;width:100%;margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #ffebee;"><thead><tr>`;
    html += `<th style="${thStyle('12%')}">年</th><th style="${thStyle('25%')}">事象名</th><th style="${thStyle('63%')}">概要</th></tr></thead><tbody>`;
    rekishiData.forEach((d, ri) => {
      const type = d['種別'] || '';
      let bg = ri % 2 === 1 ? 'background:#fffafa;' : '';
      if (type.includes('戦争') || type.includes('虐殺') || type.includes('震災') || type.includes('テロ') || type.includes('大災害')) bg = 'background:#fff3f3;';
      else if (type.includes('事件') || type.includes('事故')) bg = 'background:#f0f7ff;';
      else if (type.includes('政治') || type.includes('体制') || type.includes('改元')) bg = 'background:#f0fff4;';
      html += `<tr style="${bg}"><td style="${tdBoldStyle}">${d['年'] || ''}</td><td style="${tdStyle}">${d['事象名'] || ''}</td><td style="${tdStyle}">${d['概要'] || ''}</td></tr>`;
    });
    html += `</tbody></table>`;
    article += html;
  }
  const rekishiComment = cleanText(rekishiSection);
  if (rekishiComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${rekishiComment}</div>\n`;

  // 5. 直近の動向
  article += h2('③ 直近の動向');
  const dohClean = cleanText(dohSection);
  if (dohClean) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin-bottom:30px;">${dohClean}</div>\n`;

  // 6. 映像
  article += h2('④ 映像で知る日本');
  const eizouData = parseLines(eizouSection, '映像');
  eizouData.forEach(d => {
    const isSerious = d['深刻'] === 'true';
    article += `
<div style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; margin:20px 0; box-shadow:0 4px 15px rgba(0,0,0,0.05); position:relative;">
  ${isSerious ? `<div style="position:absolute; top:15px; right:15px; background:#ffebee; color:${themeColor}; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:4px;">⚠️ 深刻な題材</div>` : ''}
  <div style="font-weight:900; font-size:17px; color:#111; margin-bottom:8px;">${d['タイトル'] || ''}</div>
  <div style="font-size:12px; color:${themeColor}; font-weight:bold; margin-bottom:12px;">${d['種別'] || ''} • ${d['公開年'] || ''}</div>
  <div style="font-size:14px; color:#444; line-height:1.6; margin-bottom:15px;">${d['概要'] || ''}</div>
  <div style="display:flex; gap:10px;">
    ${d['wikipedia_url'] ? `<a href="${d['wikipedia_url']}" target="_blank" style="text-decoration:none; font-size:12px; color:#fff; background:#4CAF50; padding:5px 15px; border-radius:5px;">Wikipedia</a>` : ''}
    ${d['imdb_url'] ? `<a href="${d['imdb_url']}" target="_blank" style="text-decoration:none; font-size:12px; color:#000; background:#F5C518; padding:5px 15px; border-radius:5px;">IMDb</a>` : ''}
  </div>
</div>`;
  });
  const eizouComment = cleanText(eizouSection);
  if (eizouComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${eizouComment}</div>\n`;

  // 7. ランキング
  article += h2('⑤ 日本映画 歴代興行収入ランキング');
  const kougyouData = parseLines(kougyouSection, '興行');
  kougyouData.forEach(d => {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' 予告編')}`;
    article += `
<div style="display:flex; align-items:center; background:#fff; border:1px solid #eee; border-radius:12px; padding:15px; margin:15px 0; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
  <div style="background:${themeColor}; color:#fff; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:18px; margin-right:15px; flex-shrink:0;">${d['順位'] || ''}</div>
  <div style="flex-grow:1;">
    <div style="font-weight:800; font-size:15px; color:#111;">${d['タイトル'] || ''}</div>
    <div style="font-size:12px; color:#777; margin-top:4px;">${d['公開年'] || ''}年公開 | <span style="color:${themeColor}; font-weight:bold;">${d['興行収入'] || ''}</span></div>
  </div>
  <a href="${ytUrl}" target="_blank" style="text-decoration:none; padding:6px 14px; background:#ff0000; color:#fff; border-radius:20px; font-size:11px; font-weight:bold;">▶ Trailer</a>
</div>`;
  });
  const kougyouComment = cleanText(kougyouSection);
  if (kougyouComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${kougyouComment}</div>\n`;

  // 8. Deep Dive
  if (deepDiveRaw) {
    article += `<hr style="margin:80px 0 60px; border:none; border-top:1px solid #eee;">\n`;
    article += h2('Deep Dive - 視点の対比');
    let ddText = deepDiveRaw.replace(/当事国A/g, '日本').replace(/当事国B/g, 'アメリカ');
    const sections = ddText.split('### ');
    let ddHtml = '<div style="background:#fffafa; padding:30px; border-radius:24px; border:1px solid #ffebee;">';
    sections.forEach(sec => {
      if (!sec.trim()) return;
      const lines = sec.split('\n');
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      ddHtml += `
<div style="background:#fff; border:1px solid #eee; border-radius:16px; padding:25px; margin-bottom:25px; box-shadow:0 4px 15px rgba(211,47,47,0.03);">
  <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
    <span style="background:${themeColor}; color:#fff; padding:4px 12px; border-radius:6px; font-size:11px; font-weight:900;">VIEWPOINT</span>
    <div style="font-weight:900; font-size:16px; color:#111;">${title}</div>
  </div>
  <div style="font-size:15px; line-height:1.8; color:#444;">${cleanText(body)}</div>
</div>`;
    });
    ddHtml += '</div>';
    article += ddHtml;
  }

  return { json: { article: article, processedAt: new Date().toISOString() } };
});
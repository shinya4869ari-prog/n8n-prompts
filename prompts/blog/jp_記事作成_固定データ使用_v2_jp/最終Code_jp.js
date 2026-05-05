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

  // 補助関数：データを抽出してオブジェクト化
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

  // 補助関数：掃除
  function cleanText(text) {
    if (!text) return "";
    return text.split('\n').filter(l => {
      const t = l.trim();
      if (!t) return true;
      if (t.includes('｜')) return false;
      if (t.includes('[INTRO]') || t.includes('[DEEP_DIVE')) return false;
      if (/^#{1,4}\s*[①②③④⑤]/.test(t)) return false;
      if (/^\s*\.\.\./.test(t)) return false;
      return true;
    }).join('\n').trim();
  }

  // エラーネコの一言を生成するヘルパー（メイン版準拠の吹き出しデザイン）
  function makeNekoBubble(text) {
    if (!text || !text.includes('🐱')) return '';
    const content = text.replace(/🐱\s*エラーネコ：/, '').trim();
    return `
<div style="margin: 25px 0; display: flex; align-items: flex-start; gap: 15px;">
  <div style="font-size: 32px;">🐱</div>
  <div style="position: relative; background: #fffafa; border: 1px solid #ffebee; border-radius: 12px; padding: 15px 20px; font-size: 14px; line-height: 1.6; color: #444; flex: 1; box-shadow: 0 2px 8px rgba(211,47,47,0.03);">
    <div style="position: absolute; top: 15px; left: -10px; width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-right: 10px solid #fffafa;"></div>
    <strong>エラーネコ：</strong><br>${content}
  </div>
</div>`;
  }

  // --- セクション分割 ---
  const introRaw = extractSection(raw, '[INTRO]', '① 貿易') || raw.split(/#{0,4}\s*① 貿易/)[0];
  const boekiSection = (raw.split(/#{0,4}\s*① 貿易/)[1] || '').split(/#{0,4}\s*② 歴史/)[0];
  const rekishiSection = (raw.split(/#{0,4}\s*② 歴史/)[1] || '').split(/#{0,4}\s*③ 直近/)[0];
  const dohSection = (raw.split(/#{0,4}\s*③ 直近/)[1] || '').split(/#{0,4}\s*④ 映像/)[0];
  const eizouSection = (raw.split(/#{0,4}\s*④ 映像/)[1] || '').split(/#{0,4}\s*⑤ 日本映画/)[0];
  const kougyouSection = (raw.split(/#{0,4}\s*⑤ 日本映画/)[1] || '').split(/\[DEEP_DIVE/)[0];
  const deepDiveRaw = extractSection(raw, '[DEEP_DIVE_START]', '[DEEP_DIVE_END]');

  const h2 = (text) => `<h2 style="margin-top:60px;padding-top:20px;border-top:3px solid ${themeColor};font-size:18px;font-weight:900;color:#111;">${text}</h2>\n`;
  const h3 = (text) => `<h3 style="margin-top:35px;margin-bottom:12px;font-size:15px;font-weight:900;color:#333;">${text}</h3>\n`;
  const makeTable = (headers, rows, widths) => {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.05);border:1px solid #eee;`;
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-size:14px;color:#111;${w ? 'width:'+w+';' : ''}`;
    const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;color:#333;`;
    const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;color:#111;`;
    let html = `<table style="${tableStyle}"><thead><tr>`;
    headers.forEach((h, i) => html += `<th style="${thStyle(widths ? widths[i] : '')}">${h}</th>`);
    html += `</tr></thead><tbody>`;
    rows.forEach((row, ri) => {
      html += `<tr style="${ri % 2 === 1 ? 'background:#fafafa;' : ''}">`;
      row.forEach((cell, ci) => html += `<td style="${ci === 0 ? tdBoldStyle : tdStyle}">${cell}</td>`);
      html += `</tr>`;
    });
    html += `</tbody></table>`;
    return html;
  };

  let article = '';

  // 1. シンプルな記事ヘッダー (デカい箱を削除)
  article += `
<div style="margin-bottom:45px; border-bottom:1px solid #eee; padding-bottom:30px;">
  <h1 style="margin:0; font-size:36px; font-weight:900; color:#111; letter-spacing:-1px;">${countryName}</h1>
  <div style="margin-top:15px; font-size:15px; color:#666; display:flex; gap:20px; align-items:center;">
    <span>🇯🇵 首都：東京</span>
    <span>🌏 地域：東アジア</span>
    <span style="margin-left:auto; background:${themeColor}; color:#fff; padding:4px 12px; border-radius:4px; font-weight:900; font-size:12px;">✅ FACT CHECKED</span>
  </div>
</div>
`;

  // 2. 導入文
  const cleanIntro = cleanText(introRaw);
  if (cleanIntro) article += `<div style="font-size:16px; line-height:1.8; color:#333; margin-bottom:50px;">${cleanIntro}</div>\n`;

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
  const boekiComment = cleanText(boekiSection.split('🐱 エラーネコ：')[0]);
  if (boekiComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${boekiComment}</div>\n`;
  article += makeNekoBubble(boekiSection.match(/🐱 エラーネコ：[^\n]+/)?.[0]);

  // 4. 歴史的背景
  article += h2('② 歴史的背景（近代100年）');
  const rekishiData = parseLines(rekishiSection, '歴史');
  if (rekishiData.length > 0) {
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-size:14px;color:#111;${w ? 'width:'+w+';' : ''}`;
    const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;color:#333;`;
    const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;color:#111;`;
    let html = `<table style="border-collapse:separate;border-spacing:0;width:100%;margin:20px 0;border-radius:12px;overflow:hidden;border:1px solid #eee;"><thead><tr>`;
    html += `<th style="${thStyle('12%')}">年</th><th style="${thStyle('25%')}">事象名</th><th style="${thStyle('63%')}">概要</th></tr></thead><tbody>`;
    rekishiData.forEach((d, ri) => {
      const type = d['種別'] || '';
      let bg = ri % 2 === 1 ? 'background:#fafafa;' : '';
      if (type.includes('戦争') || type.includes('虐殺') || type.includes('震災') || type.includes('テロ') || type.includes('大災害')) bg = 'background:#fff3f3;';
      else if (type.includes('事件') || type.includes('事故')) bg = 'background:#f0f7ff;';
      else if (type.includes('政治') || type.includes('体制') || type.includes('改元')) bg = 'background:#f0fff4;';
      html += `<tr style="${bg}"><td style="${tdBoldStyle}">${d['年'] || ''}</td><td style="${tdStyle}">${d['事象名'] || ''}</td><td style="${tdStyle}">${d['概要'] || ''}</td></tr>`;
    });
    html += `</tbody></table>`;
    article += html;
  }
  const rekishiComment = cleanText(rekishiSection.split('🐱 エラーネコ：')[0]);
  if (rekishiComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${rekishiComment}</div>\n`;
  article += makeNekoBubble(rekishiSection.match(/🐱 エラーネコ：[^\n]+/)?.[0]);

  // 5. 直近の動向
  article += h2('③ 直近の動向');
  const dohClean = cleanText(dohSection.split('🐱 エラーネコ：')[0]);
  if (dohClean) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin-bottom:30px;">${dohClean}</div>\n`;
  article += makeNekoBubble(dohSection.match(/🐱 エラーネコ：[^\n]+/)?.[0]);

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
  article += makeNekoBubble(eizouSection.match(/🐱 エラーネコ：[^\n]+/)?.[0]);

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
  article += makeNekoBubble(kougyouSection.match(/🐱 エラーネコ：[^\n]+/)?.[0]);

  // 8. Deep Dive
  if (deepDiveRaw) {
    article += `<hr style="margin:80px 0 60px; border:none; border-top:1px solid #eee;">\n`;
    article += `<div style="display:inline-block; background:#1a237e; color:#fff; padding:5px 18px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;">✦ Deep Dive</div>\n`;
    article += `<h2 style="font-size:24px; font-weight:900; color:#1a237e; margin:0 0 24px;">Deep Dive - 視点の対比</h2>\n`;
    let ddText = deepDiveRaw.replace(/当事国A/g, '日本').replace(/当事国B/g, 'アメリカ');
    const sections = ddText.split('### ');
    sections.forEach(sec => {
      if (!sec.trim()) return;
      const lines = sec.split('\n');
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      article += `
<div style="background:#fff; border:1px solid #eee; border-left:5px solid #1a237e; border-radius:12px; padding:25px; margin-bottom:25px; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
  <div style="font-weight:900; font-size:18px; color:#1a237e; margin-bottom:15px;">${title}</div>
  <div style="font-size:15px; line-height:1.8; color:#444;">${cleanText(body)}</div>
</div>`;
    });
  }

  return { json: { article: article, processedAt: new Date().toISOString() } };
});
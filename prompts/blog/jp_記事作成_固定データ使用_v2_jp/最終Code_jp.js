const promptBody = $input.first()?.json?.externalPrompt ?? "";

return $input.all().map(item => {
  const inputData = item.json;
  const sheetData = $('整形ノード1_jp').first().json;  // ★日本版ノード名
  let raw = inputData?.article ?? "";
  const rawLines = raw.split('\n');

  // --- 1. 見出し・出典の重複削除（メイン版と完全同一） ---
  raw = raw.replace(/^[①-⑨] .*$/gm, '');
  raw = raw.replace(/^出典：.*$/gm, '');

  const countryName = "日本";  // ★日本版固定
  const h2Color = "#d32f2f";   // ★日本版カラー（メイン版は#00bcd4）

  // --- 2. パイプ区切りデータをパース（メイン版と完全同一） ---
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

  // --- 3. HTML生成ヘルパー（メイン版と完全同一、カラーのみ変更） ---
  const h2Style = `margin-top:60px;padding-top:20px;border-top:3px solid ${h2Color};font-size:16px;font-weight:900;color:#111;`;
  const h3Style = `font-size:14px;font-weight:800;color:#333;margin-top:30px;margin-bottom:10px;`;

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

  // extractTextBetween（メイン版と完全同一）
  function extractTextBetween(text, start, end) {
    const lines = text.split('\n');
    const startIdx = lines.findIndex(l => l.includes(start));
    if (startIdx === -1) return '';
    const slice = lines.slice(startIdx + 1);
    const endIdx = slice.findIndex(l => l.includes(end));
    return (endIdx === -1 ? slice : slice.slice(0, endIdx)).join('\n').trim();
  }

  // makeNekoBubble（メイン版と完全同一）
  function makeNekoBubble(text) {
    if (!text || !text.includes('🐱')) return '';
    const content = text.replace(/🐱\s*エラーネコ：/, '').trim();
    return `
<div style="margin: 20px 0; display: flex; align-items: flex-start; gap: 12px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #f0f7f7; border: 1px solid #e0eeee; border-radius: 12px; padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #444; flex: 1;">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #f0f7f7;"></div>
    <strong>エラーネコの一言：</strong><br>${content}
  </div>
</div>`;
  }

  let article = '';

  // --- 4. 導入文（メイン版と同一ロジック） ---
  const introEndIdx = rawLines.findIndex(l => l.includes('① 貿易'));
  if (introEndIdx !== -1) {
    article += rawLines.slice(0, introEndIdx).join('\n') + '\n';
  }

  // --- 5. ① 貿易の衡量（メイン版の④と完全同一ロジック） ---
  article += `<h2 style="${h2Style}">① 貿易の衡量</h2>\n`;
  const yushutsuData = parseLines(raw, '輸出');
  const yunyuData = parseLines(raw, '輸入');
  if (yushutsuData.length > 0 || yunyuData.length > 0) {
    const tradeRows = [];
    for (let i = 0; i < 10; i++) {
      tradeRows.push([i + 1, yushutsuData[i]?.品目 || '', yunyuData[i]?.品目 || '']);
    }
    article += makeTable(['順位', '輸出主要品目', '輸入主要品目'], tradeRows, ['10%', '45%', '45%']);
  }

  const boekiAiteData = parseLines(raw, '貿易相手');
  if (boekiAiteData.length > 0) {
    article += `<h3 style="${h3Style}">主要な貿易相手国</h3>\n`;
    const partnerRows = boekiAiteData.map(d => [d['順位'], d['国名'], d['シェア']]);
    article += makeTable(['順位', '相手国', 'シェア'], partnerRows, ['10%', '60%', '30%']);
    // ★日本版のキー名（メイン版は貿易出典_対象国）
    const boekiCiteStr = sheetData.data?.固定データ?.貿易出典_日本 || '財務省貿易統計';
    article += `<p class="citation">出典：${boekiCiteStr}</p>\n`;
  }

  const boekiExplanation = extractTextBetween(raw, '貿易相手｜順位：10位｜', '🐱 エラーネコ：');
  if (boekiExplanation) article += `\n${boekiExplanation}\n`;

  const boekiNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('① 貿易')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(boekiNeko);

  // --- 6. ② 歴史的背景（メイン版の⑥と同一ロジック + 出典カラム追加） ---
  article += `<h2 style="${h2Style}">② 歴史的背景（近代100年）</h2>\n`;
  const rekishiData = parseLines(raw, '歴史');
  if (rekishiData.length > 0) {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;font-size:14px;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thStyle = `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;`;
    let rekishiHtml = `<table style="${tableStyle}"><thead><tr>`;
    rekishiHtml += `<th style="${thStyle}width:10%;">年</th><th style="${thStyle}width:20%;">事象名</th><th style="${thStyle}width:15%;">種別</th><th style="${thStyle}width:40%;">概要</th><th style="${thStyle}width:15%;">出典</th>`;
    rekishiHtml += `</tr></thead><tbody>`;
    rekishiData.forEach(d => {
      const type = d['種別'] || '';
      let bg = '';
      if (type.includes('戦争') || type.includes('虐殺')) bg = 'background:#fff3f3;';
      else if (type.includes('事件') || type.includes('事故')) bg = 'background:#f0f7ff;';
      else if (type.includes('政治') || type.includes('体制')) bg = 'background:#f0fff4;';

      rekishiHtml += `<tr style="${bg}">`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['年'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['事象名'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-size:11px;">${type}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['概要'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;font-size:11px;color:#666;">${d['出典'] || '-'}</td>`;
      rekishiHtml += `</tr>`;
    });
    rekishiHtml += `</tbody></table>`;
    article += rekishiHtml;
  }

  const rekishiNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('② 歴史')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(rekishiNeko);

  // --- 7. ③ 直近の動向（メイン版の⑦と完全同一ロジック） ---
  article += `<h2 style="${h2Style}">③ 直近の動向</h2>\n`;
  const dohContent = extractTextBetween(raw, '<p>【政治経済社会】</p>', '🐱 エラーネコ：');
  if (dohContent) {
    article += `<p>【政治経済社会】</p>\n${dohContent}\n`;
    const dohCite = sheetData.data?.対象国データ_記事?.直近の動向?.出典 || '';
    if (dohCite) article += `<p class="citation">出典：${dohCite}</p>\n`;
  }

  const dohNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('③ 直近')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(dohNeko);

  // --- 8. ④ 映像で知る日本（メイン版の⑧と完全同一ロジック） ---
  article += `<h2 style="${h2Style}">④ 映像で知る${countryName}</h2>\n`;
  const eizouData = parseLines(raw, '映像');
  if (eizouData.length > 0) {
    eizouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      article += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="font-weight:800;font-size:16px;color:#222;margin-bottom:6px;">${isSerious ? '⚠️ ' : ''}${d['タイトル'] || ''}</div>
  <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${d['種別'] || ''} &nbsp;•&nbsp; ${d['公開年'] || ''}</div>
  <div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:12px;">${d['概要'] || ''}</div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;">
    <div><a href="https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' trailer')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a></div>
  </div>
</div>`;
    });
    const eizouData2 = sheetData.data?.対象国データ_記事?.映像作品 || [];
    const eizouCites = [...new Set(eizouData2.map(d => d.出典).filter(Boolean))];
    if (eizouCites.length > 0) {
      article += `<p class="citation">出典：${eizouCites.join(' / ')}</p>\n`;
    }
  }

  const eizouNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('④ 映像')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(eizouNeko);

  // --- 9. ⑤ 日本映画 歴代興行収入（メイン版の⑨と完全同一ロジック） ---
  article += `<h2 style="${h2Style}">⑤ 特別枠：${countryName}映画 歴代興行収入</h2>\n`;
  const kougyouData = parseLines(raw, '興行').filter(d => d['タイトル'] && d['タイトル'] !== '欠測');
  if (kougyouData.length > 0) {
    kougyouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      article += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${h2Color};"></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
    <span style="background:${h2Color};color:#fff;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">${d['順位'] || ''}</span>
    <span style="font-weight:800;font-size:16px;">${d['タイトル'] || ''}</span>
  </div>
  <div style="font-size:13px;color:#666;margin-bottom:12px;">📅 ${d['公開年'] || ''} &nbsp;|&nbsp; 💴 ${d['興行収入'] || 'データなし'}</div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;">
    <div><a href="https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' trailer')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a></div>
  </div>
</div>`;
    });
    const kougyouData2 = sheetData.data?.対象国データ_記事?.興行収入ランキング || [];
    const kougyouCites = [...new Set(kougyouData2.map(d => d.出典).filter(Boolean))];
    if (kougyouCites.length > 0) {
      article += `<p class="citation">出典：${kougyouCites.join(' / ')}</p>\n`;
    }
  }

  const kougyouNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('⑤ 特別枠')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(kougyouNeko);

  // --- 10. ライブログ（メイン版の15と完全同一） ---
  const logMatch = raw.match(/(### 【ライブ検索[\s\S]*$)/);
  if (logMatch) article += '\n' + logMatch[1];

  // --- 11. Deep Dive（メイン版の16と同一構造） ---
  let deepDiveArticle = '';
  try {
    deepDiveArticle = $('リンク挿入_jp').first().json?.deepDiveArticle || '';
  } catch(e) {
    try { deepDiveArticle = $('整形3_jp').first().json?.article || ''; } catch(e2) {}
  }

  if (deepDiveArticle) {
    article += `
<div style="border-top:4px solid #1a237e; margin:80px 0 40px; padding-top:40px;">
  <div style="display:inline-block; background:#1a237e; color:#fff; padding:5px 18px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;">✦ Deep Dive</div>
  <h2 style="font-size:20px; font-weight:900; color:#1a237e; margin:0 0 16px; letter-spacing:-0.3px;">📖 深掘り特別記事</h2>
  <div style="background:#f3f4f9; border-left:4px solid #1a237e; padding:14px 18px; border-radius:0 10px 10px 0; font-size:13px; color:#444; line-height:1.8;">
    本記事で取り上げた歴史的事件・事故・大災害などの中から、特に深掘りすべきテーマを選定し、さらに詳しく解説します。
  </div>
</div>\n`;
    article += deepDiveArticle;
  }

  return {
    json: {
      article: promptBody ? `${promptBody}\n\n${article}` : article,
      title: countryName,
      country: countryName,
      capital: "東京"
    }
  };
});
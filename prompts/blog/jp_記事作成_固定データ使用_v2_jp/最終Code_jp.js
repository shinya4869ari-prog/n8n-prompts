const sheetData = $('整形ノード1_jp').first().json;

return $input.all().map(item => {
  const inputData = item.json;
  let raw = inputData?.article ?? "";
  const rawLines = raw.split('\n');

  // --- 1. 出典・見出しのクリーンアップ（メイン版の「スルッと」表示のキモ） ---
  // AIが生成した「出典：」で始まる行を一度すべて削除し、後でプログラムがJSONから正しく打ち直す
  raw = raw.replace(/^出典：.*$/gm, '');
  raw = raw.replace(/^[①-⑨] .*$/gm, '');

  const countryName = "日本";
  const themeColor = "#d32f2f";

  // --- 2. 補助関数 ---
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
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-right: 10px solid #fffafa;"></div>
    <strong>エラーネコの一言：</strong><br>${content}
  </div>
</div>`;
  }

  let article = '';

  // --- 3. 導入文 ---
  const introEndIdx = rawLines.findIndex(l => l.includes('① 貿易'));
  if (introEndIdx !== -1) {
    article += rawLines.slice(0, introEndIdx).join('\n') + '\n';
  }

  // --- 4. ① 貿易 ---
  article += `<h2 style="margin-top:60px;padding-top:20px;border-top:3px solid ${themeColor};font-size:16px;font-weight:900;color:#111;">① 貿易の衡量</h2>\n`;
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
    article += `<h3 style="font-size:14px;font-weight:800;color:#333;margin-top:30px;margin-bottom:10px;">主要な貿易相手国</h3>\n`;
    const partnerRows = boekiAiteData.map(d => [d['順位'], d['国名'], d['シェア']]);
    article += makeTable(['順位', '相手国', 'シェア'], partnerRows, ['10%', '60%', '30%']);
    
    // 【動的出典】メイン版のロジック（375行目付近）を完全再現
    const boekiCite = sheetData.data?.固定データ?.貿易出典_日本 || '';
    if (boekiCite) article += `<p class="citation" style="font-size:12px;color:#999;text-align:right;margin-top:-10px;">出典：${boekiCite}</p>\n`;
  }
  const boekiExplanation = extractTextBetween(raw, '貿易相手｜順位：10位｜', '🐱 エラーネコ：');
  if (boekiExplanation) article += `\n${boekiExplanation}\n`;
  const boekiNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('① 貿易')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(boekiNeko);

  // --- 5. ② 歴史的背景 ---
  article += `<h2 style="margin-top:60px;padding-top:20px;border-top:3px solid ${themeColor};font-size:16px;font-weight:900;color:#111;">② 歴史的背景（近代100年）</h2>\n`;
  const rekishiData = parseLines(raw, '歴史');
  if (rekishiData.length > 0) {
    const rows = rekishiData.map(d => [d['年'], d['事象名'], d['種別'], d['概要']]);
    article += makeTable(['年', '事象名', '種別', '概要'], rows, ['10%', '20%', '15%', '55%']);
    
    // 歴史の出典は、データ内の最初のアイテムから取得を試みる
    const rekishiCite = rekishiData[0]?.出典 || '';
    if (rekishiCite) article += `<p class="citation" style="font-size:12px;color:#999;text-align:right;margin-top:-10px;">出典：${rekishiCite}</p>\n`;
  }
  const rekishiNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('② 歴史')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(rekishiNeko);

  // --- 6. ③ 直近の動向 ---
  article += `<h2 style="margin-top:60px;padding-top:20px;border-top:3px solid ${themeColor};font-size:16px;font-weight:900;color:#111;">③ 直近の動向</h2>\n`;
  const dohContent = extractTextBetween(raw, '<p>【政治経済社会】</p>', '🐱 エラーネコ：');
  if (dohContent) {
    article += `<p>【政治経済社会】</p>\n${dohContent}\n`;
    // 【動的出典】メイン版のロジック（479行目付近）を完全再現
    const dohCite = sheetData.data?.対象国データ_記事?.直近の動向?.出典 || '';
    if (dohCite) article += `<p class="citation" style="font-size:12px;color:#999;text-align:right;margin-top:10px;">出典：${dohCite}</p>\n`;
  }
  const dohNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('③ 直近')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(dohNeko);

  // --- 7. ④ 映像で知る日本 ---
  article += `<h2 style="margin-top:60px;padding-top:20px;border-top:3px solid ${themeColor};font-size:16px;font-weight:900;color:#111;">④ 映像で知る日本</h2>\n`;
  const eizouData = parseLines(raw, '映像');
  if (eizouData.length > 0) {
    eizouData.forEach(d => {
      article += `
<div style="background:#fff;border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="font-weight:800;font-size:16px;color:#222;margin-bottom:6px;">${d['タイトル'] || ''}</div>
  <div style="font-size:12px;color:${themeColor};font-weight:bold;margin-bottom:10px;">${d['種別'] || ''} &nbsp;•&nbsp; ${d['公開年'] || ''}</div>
  <div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:12px;">${d['概要'] || ''}</div>
  <div style="display:flex;gap:10px;">
    <a href="${d['wikipedia_url'] || '#'}" target="_blank" style="display:inline-block;padding:4px 14px;background:#4CAF50;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">Wikipedia</a>
    <a href="${d['imdb_url'] || '#'}" target="_blank" style="display:inline-block;padding:4px 14px;background:#F5C518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;">IMDb</a>
  </div>
</div>`;
    });
    // 【動的出典】メイン版のロジック（505行目付近）を完全再現
    const eizouList = sheetData.data?.対象国データ_記事?.映像作品 || [];
    const eizouCites = [...new Set(eizouList.map(d => d.出典).filter(Boolean))];
    if (eizouCites.length > 0) article += `<p class="citation" style="font-size:12px;color:#999;text-align:right;">出典：${eizouCites.join(' / ')}</p>\n`;
  }

  // --- 8. ⑤ 日本映画 歴代ランキング ---
  article += `<h2 style="margin-top:60px;padding-top:20px;border-top:3px solid ${themeColor};font-size:16px;font-weight:900;color:#111;">⑤ 日本映画 歴代ランキング</h2>\n`;
  const kougyouData = parseLines(raw, '興行');
  if (kougyouData.length > 0) {
    kougyouData.forEach(d => {
      article += `
<div style="display:flex;align-items:center;background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;margin:10px 0;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
  <span style="background:${themeColor};color:#fff;border-radius:6px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:800;margin-right:12px;flex-shrink:0;">${d['順位'] || ''}</span>
  <div style="flex-grow:1;">
    <div style="font-weight:800;font-size:15px;">${d['タイトル'] || ''}</div>
    <div style="font-size:12px;color:#777;">${d['公開年'] || ''}年 | ${d['興行収入'] || ''}</div>
  </div>
  <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' 予告編')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ Trailer</a>
</div>`;
    });
    // 【動的出典】メイン版のロジック（533行目付近）を完全再現
    const rankingList = sheetData.data?.対象国データ_記事?.興行収入ランキング || [];
    const rankingCites = [...new Set(rankingList.map(d => d.出典).filter(Boolean))];
    if (rankingCites.length > 0) article += `<p class="citation" style="font-size:12px;color:#999;text-align:right;">出典：${rankingCites.join(' / ')}</p>\n`;
  }

  // --- 9. Deep Dive ---
  const ddRaw = extractTextBetween(raw, '[DEEP_DIVE_START]', '[DEEP_DIVE_END]');
  if (ddRaw) {
    article += `<hr style="margin:80px 0;border:none;border-top:1px solid #eee;">\n`;
    article += `<h2 style="font-size:22px;font-weight:900;color:#1a237e;">📖 Deep Dive - 視点の対比</h2>\n`;
    article += ddRaw.replace(/当事国A/g, '日本').replace(/当事国B/g, 'アメリカ');
  }

  return { json: { article: article } };
});
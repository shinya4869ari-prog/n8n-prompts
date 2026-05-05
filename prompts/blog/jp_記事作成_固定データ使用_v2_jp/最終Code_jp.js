const promptBody = $input.first()?.json?.externalPrompt ?? "";

return $input.all().map(item => {
  const inputData = item.json;
  const sheetData = $('整形ノード1_jp').first().json;
  let raw = inputData?.article ?? "";

  // --- 1. 見出し・出典・システムタグの削除（メイン版準拠） ---
  raw = raw.replace(/^[①-⑨] .*$/gm, '');
  raw = raw.replace(/^出典：.*$/gm, '');
  raw = raw.replace(/^#*\s*\[INTRO\]\s*$/gim, '');
  raw = raw.replace(/\[DEEP_DIVE_START\]/gi, '');
  raw = raw.replace(/\[DEEP_DIVE_END\]/gi, '');

  const rawLines = raw.split('\n');
  const countryName = "日本";
  const h2Color = "#d32f2f";

  // --- 2. 補助関数（メイン版と同一ロジックだが、抽出を強化） ---
  function parseLines(text, prefix) {
    return text.split('\n')
      .filter(l => l.includes(prefix + '｜')) // startsWithより柔軟に
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

  // ★抽出を大幅強化：タグの有無や文言の微差を許容する
  function extractSection(text, startKeyword, endKeyword) {
    const regex = new RegExp(`${startKeyword}[\\s\\S]*?(?=${endKeyword}|🐱|$)`, 'i');
    const match = text.match(regex);
    if (!match) return '';
    return match[0].replace(new RegExp(`^.*${startKeyword}.*?\n`, 'i'), '').trim();
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

  // --- 4. ① 貿易の衡量 ---
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
    article += `<p class="citation" style="font-size:12px;color:#999;text-align:right;">出典：${boekiCite}</p>\n`;
  }
  const boekiNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('① 貿易')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(boekiNeko);

  // --- 5. ② 歴史的背景 ---
  article += `<h2 style="${h2Style}">② 歴史的背景（近代100年）</h2>\n`;
  const rekishiData = parseLines(raw, '歴史');
  if (rekishiData.length > 0) {
    const rows = rekishiData.map(d => [d['年'] || '-', d['事象名'] || '-', d['種別'] || '-', d['概要'] || '-', `<span style="font-size:11px;color:#777;">${d['出典'] || '-'}</span>`]);
    article += makeTable(['年', '事象名', '種別', '概要', '出典'], rows, ['10%', '20%', '15%', '40%', '15%']);
  }
  const rekishiNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('② 歴史')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(rekishiNeko);

  // --- 6. ③ 直近の動向 ---
  article += `<h2 style="${h2Style}">③ 直近の動向</h2>\n`;
  const dohContent = extractSection(raw, '政治経済社会', '🐱 エラーネコ：');
  if (dohContent) {
    article += `<div class="doh-body">${dohContent}</div>\n`;
    const dohCite = sheetData.data?.対象国データ_記事?.直近の動向?.出典 || '';
    if (dohCite) article += `<p class="citation" style="font-size:12px;color:#999;text-align:right;">出典：${dohCite}</p>\n`;
  }
  const dohNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('③ 直近')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(dohNeko);

  // --- 7. ④ 映像で知る日本 ---
  article += `<h2 style="${h2Style}">④ 映像で知る日本</h2>\n`;
  const eizouData = parseLines(raw, '映像');
  if (eizouData.length > 0) {
    eizouData.forEach(d => {
      article += `
<div style="background:#fff;border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="font-weight:800;font-size:16px;color:#222;margin-bottom:6px;">${d['タイトル'] || ''}</div>
  <div style="font-size:12px;color:${h2Color};font-weight:bold;margin-bottom:10px;">${d['種別'] || ''} &nbsp;•&nbsp; ${d['公開年'] || ''}</div>
  <div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:12px;">${d['概要'] || ''}</div>
  <div style="display:flex;gap:10px;">
    <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' 予告編')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube</a>
  </div>
</div>`;
    });
    const eizouList = sheetData.data?.対象国データ_記事?.映像作品 || [];
    const eizouCites = [...new Set(eizouList.map(d => d.出典).filter(Boolean))];
    if (eizouCites.length > 0) article += `<p class="citation" style="font-size:12px;color:#999;text-align:right;">出典：${eizouCites.join(' / ')}</p>\n`;
  }
  const eizouNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('④ 映像')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(eizouNeko);

  // --- 8. ⑤ 日本映画 歴代ランキング ---
  article += `<h2 style="${h2Style}">⑤ 日本映画 歴代ランキング</h2>\n`;
  const kougyouData = parseLines(raw, '興行');
  if (kougyouData.length > 0) {
    kougyouData.forEach(d => {
      article += `
<div style="display:flex;align-items:center;background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;margin:10px 0;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
  <span style="background:${h2Color};color:#fff;border-radius:6px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:800;margin-right:12px;flex-shrink:0;">${d['順位'] || ''}</span>
  <div style="flex-grow:1;">
    <div style="font-weight:800;font-size:15px;">${d['タイトル'] || ''}</div>
    <div style="font-size:12px;color:#777;">${d['公開年'] || ''}年 | ${d['興行収入'] || ''}</div>
  </div>
  <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' 予告編')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ Trailer</a>
</div>`;
    });
    const rankingList = sheetData.data?.対象国データ_記事?.興行収入ランキング || [];
    const rankingCites = [...new Set(rankingList.map(d => d.出典).filter(Boolean))];
    if (rankingCites.length > 0) article += `<p class="citation" style="font-size:12px;color:#999;text-align:right;">出典：${rankingCites.join(' / ')}</p>\n`;
  }
  const kougyouNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('⑤ 日本映画')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(kougyouNeko);

  // --- 9. Deep Dive ---
  const ddRaw = extractSection(raw, '対象事件', 'DEEP_DIVE_END');
  if (ddRaw) {
    article += `<hr style="margin:80px 0;border:none;border-top:1px solid #eee;">\n`;
    article += `<h2 style="font-size:22px;font-weight:900;color:#1a237e;">📖 Deep Dive - 視点の対比</h2>\n`;
    article += `<div class="dd-body">${ddRaw.replace(/当事国A/g, '日本').replace(/当事国B/g, 'アメリカ')}</div>`;
  }

  return {
    json: {
      article: promptBody ? `${promptBody}\n\n${article}` : article,
      title: countryName,
      country: countryName
    }
  };
});
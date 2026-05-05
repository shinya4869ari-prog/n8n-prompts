const promptBody = $input.first()?.json?.externalPrompt ?? "";
const sheetData = $('整形ノード1_jp').first().json;

return $input.all().map(item => {
  const inputData = item.json;
  let raw = inputData?.article ?? "";

  const countryName = "日本";
  const title = "日本";
  const themeColor = "#d32f2f"; // ジャパン・レッド

  // 補助関数：AIの生テキストから特定の接頭辞を持つ行を抽出してオブジェクト化
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

  // データのパース
  const yushutsuData = parseLines(raw, '輸出');
  const yunyuData = parseLines(raw, '輸入');
  const boekiAiteData = parseLines(raw, '貿易相手');
  const rekishiData = parseLines(raw, '歴史');
  const eizouData = parseLines(raw, '映像');
  const kougyouData = parseLines(raw, '興行');

  // テーブル生成関数
  function makeTable(headers, rows, widths) {
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-size:14px;color:#111;${w ? 'width:'+w+';' : ''}`;
    const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;color:#333;`;
    const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;color:#111;`;
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(211,47,47,0.05);border:1px solid #ffebee;`;
    
    const thead = `<thead><tr>${headers.map((h, i) => `<th style="${thStyle(widths ? widths[i] : '')}">${h}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map((row, ri) => {
      const bg = ri % 2 === 1 ? 'background:#fffafa;' : '';
      return `<tr style="${bg}">${row.map((cell, ci) => `<td style="${ci === 0 ? tdBoldStyle : tdStyle}">${cell}</td>`).join('')}</tr>`;
    }).join('')}</tbody>`;
    return `<table style="${tableStyle}">${thead}${tbody}</table>`;
  }

  // 補助関数：AIの生テキスト（解析用の｜が含まれる行など）を排除して純粋な解説文だけを抽出
  function cleanArticleText(text) {
    if (!text) return "";
    return text.split('\n').filter(l => {
      const trimmed = l.trim();
      if (!trimmed) return true;
      if (trimmed.includes('｜')) return false; 
      if (/^[①②③④⑤⑥⑦⑧⑨]/.test(trimmed)) return false; 
      return true;
    }).join('\n').trim();
  }

  const h2 = (text) => `<h2 style="margin-top:50px;margin-bottom:24px;padding-top:20px;border-top:1px solid #eee;font-size:18px;font-weight:900;color:#111;">${text}</h2>\n`;
  const h3 = (text) => `<h3 style="margin-top:40px;margin-bottom:15px;font-size:15px;font-weight:900;color:#111;display:flex;align-items:center;gap:8px;"><span style="width:3px;height:16px;background:${themeColor};display:inline-block;border-radius:2px;"></span>${text}</h3>\n`;
  
  let article = '';

  // --- ヒーローステータスカード ---
  article += `
<div style="background:linear-gradient(135deg, #fffafa 0%, #ffebee 100%); border:1px solid #ffcdd2; border-left:10px solid ${themeColor}; border-radius:15px; padding:28px; margin-bottom:45px; box-shadow:0 8px 25px rgba(211,47,47,0.08); position:relative; overflow:hidden;">
  <div style="position:absolute; top:-10px; right:-10px; font-size:120px; color:${themeColor}; opacity:0.04; transform:rotate(-10deg); font-weight:bold; pointer-events:none;">JP</div>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div>
      <div style="font-size:12px; color:${themeColor}; font-weight:bold; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px;">National Report</div>
      <h1 style="margin:0; font-size:32px; font-weight:900; color:#111; letter-spacing:-0.5px;">${countryName}</h1>
      <div style="margin:12px 0 0; font-size:14px; color:#444; display:flex; gap:15px; align-items:center; font-weight:500;">
        <span>🇯🇵 首都：東京</span>
        <span style="color:#ffcdd2;">|</span>
        <span>🌏 地域：東アジア</span>
      </div>
    </div>
    <div style="background:${themeColor}; color:#fff; padding:10px 22px; border-radius:40px; font-weight:900; font-size:14px; box-shadow:0 4px 12px rgba(211,47,47,0.3); display:flex; align-items:center; gap:8px;">
      ✅ FACT CHECKED
    </div>
  </div>
</div>
`;

  // 導入文
  const rawLines = raw.split('\n');
  let introLines = [];
  for (const l of rawLines) {
    if (l.includes('① 貿易') || l.includes('④ 貿易')) break;
    if (!l.includes('｜')) introLines.push(l);
  }
  article += `<div style="font-size:15px; line-height:1.8; color:#333; margin-bottom:40px;">${introLines.join('\n').trim()}</div>\n`;

  // ① 貿易
  article += h2('① 貿易');
  if (yushutsuData.length > 0 || yunyuData.length > 0) {
    const maxLen = Math.max(yushutsuData.length, yunyuData.length);
    const boekiRows = Array.from({length: maxLen}, (_, i) => [
      (i + 1) + '位',
      yushutsuData[i] ? yushutsuData[i]['品目'] || '-' : '-',
      yunyuData[i] ? yunyuData[i]['品目'] || '-' : '-'
    ]);
    article += makeTable(['順位', '輸出品目', '輸入品目'], boekiRows, ['10%', '45%', '45%']);
  }
  article += h3('主要貿易相手国');
  if (boekiAiteData.length > 0) {
    const aiteRows = boekiAiteData.map(d => [d['順位'] || '-', d['国名'] || '-', d['シェア'] || '-']);
    article += makeTable(['順位', '国名', 'シェア'], aiteRows, ['10%', '60%', '30%']);
  }
  const boekiComment = cleanArticleText(raw.split(/① 貿易|④ 貿易/)[1]?.split(/② 歴史|⑤ 歴史/)[0] || "");
  if (boekiComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${boekiComment}</div>\n`;

  // ② 歴史的背景
  article += h2('② 歴史的背景（近代100年）');
  if (rekishiData.length > 0) {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(211,47,47,0.05);border:1px solid #ffebee;`;
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-size:14px;color:#111;${w ? 'width:'+w+';' : ''}`;
    const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;color:#333;`;
    const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;color:#111;`;

    let rekishiHtml = `<table style="${tableStyle}"><thead><tr>`;
    rekishiHtml += `<th style="${thStyle('12%')}">年</th><th style="${thStyle('25%')}">事象名</th><th style="${thStyle('63%')}">概要</th>`;
    rekishiHtml += `</tr></thead><tbody>`;

    rekishiData.forEach((d, ri) => {
      const type = d['種別'] || '';
      let bg = ri % 2 === 1 ? 'background:#fffafa;' : ''; // デフォルト（交互色）

      // 重大度による色の上書き
      if (type.includes('戦争') || type.includes('虐殺') || type.includes('震災') || type.includes('テロ') || type.includes('大災害')) {
        bg = 'background:#fff3f3;'; // 警戒の赤
      } else if (type.includes('事件') || type.includes('事故')) {
        bg = 'background:#f0f7ff;'; // 出来事の青
      } else if (type.includes('政治') || type.includes('体制') || type.includes('改元')) {
        bg = 'background:#f0fff4;'; // 変化の緑
      }

      rekishiHtml += `<tr style="${bg}">`;
      rekishiHtml += `<td style="${tdBoldStyle}">${d['年'] || ''}</td>`;
      rekishiHtml += `<td style="${tdStyle}">${d['事象名'] || ''}</td>`;
      rekishiHtml += `<td style="${tdStyle}">${d['概要'] || ''}</td>`;
      rekishiHtml += `</tr>`;
    });
    rekishiHtml += `</tbody></table>`;
    article += rekishiHtml;
    
    // ライターが書き出した歴史の出典があれば表示
    const rekishiComment = cleanArticleText(raw.split(/② 歴史|⑤ 歴史/)[1]?.split(/③ 直近|⑥ 直近/)[0] || "");
    if (rekishiComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${rekishiComment}</div>\n`;
  }

  // ③ 直近の動向
  article += h2('③ 直近の動向');
  const dohRaw = raw.split(/③ 直近の動向|⑥ 直近の動向/)[1]?.split(/④ 映像|⑦ 映像/)[0] || "";
  const dohClean = cleanArticleText(dohRaw);
  if (dohClean) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin-bottom:30px;">${dohClean}</div>\n`;

  // ④ 映像で知る日本
  article += h2('④ 映像で知る日本');
  if (eizouData.length > 0) {
    eizouData.forEach(d => {
      const isSerious = d['深刻'] === 'true' || d['is_serious'] === 'true';
      const wikiUrl = d['wikipedia_url'] || '';
      const imdbUrl = d['imdb_url'] || '';
      article += `
<div style="background:#fff; border:1px solid #eee; border-radius:12px; padding:20px; margin:20px 0; box-shadow:0 4px 15px rgba(0,0,0,0.05); position:relative;">
  ${isSerious ? `<div style="position:absolute; top:15px; right:15px; background:#ffebee; color:${themeColor}; font-size:11px; font-weight:bold; padding:2px 8px; border-radius:4px;">⚠️ 深刻な題材</div>` : ''}
  <div style="font-weight:900; font-size:17px; color:#111; margin-bottom:8px;">${d['タイトル'] || ''}</div>
  <div style="font-size:12px; color:${themeColor}; font-weight:bold; margin-bottom:12px;">${d['種別'] || '作品'} &nbsp;•&nbsp; ${d['公開年'] || ''}</div>
  <div style="font-size:14px; color:#444; line-height:1.6; margin-bottom:15px;">${d['概要'] || ''}</div>
  <div style="display:flex; gap:10px;">
    ${wikiUrl ? `<a href="${wikiUrl}" target="_blank" style="text-decoration:none; font-size:12px; color:#fff; background:#4CAF50; padding:5px 15px; border-radius:5px;">Wikipedia</a>` : ''}
    ${imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="text-decoration:none; font-size:12px; color:#000; background:#F5C518; padding:5px 15px; border-radius:5px;">IMDb</a>` : ''}
  </div>
</div>`;
    });
    const eizouComment = cleanArticleText(raw.split(/④ 映像|⑦ 映像/)[1]?.split(/⑤ 日本映画|⑧ 興行/)[0] || "");
    if (eizouComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${eizouComment}</div>\n`;
  }

  // ⑤ 日本映画 歴代興行収入ランキング
  article += h2('⑤ 日本映画 歴代興行収入ランキング');
  if (kougyouData.length > 0) {
    kougyouData.forEach(d => {
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' 予告編')}`;
      article += `
<div style="display:flex; align-items:center; background:#fff; border:1px solid #eee; border-radius:12px; padding:15px; margin:15px 0; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
  <div style="background:${themeColor}; color:#fff; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:18px; margin-right:15px; flex-shrink:0;">${d['順位'] || ''}</div>
  <div style="flex-grow:1;">
    <div style="font-weight:800; font-size:15px; color:#111;">${d['タイトル'] || ''}</div>
    <div style="font-size:12px; color:#777; margin-top:4px;">${d['公開年'] || ''}年公開 &nbsp;|&nbsp; 興行収入：<span style="color:${themeColor}; font-weight:bold;">${d['興行収入'] || '-'}</span></div>
  </div>
  <a href="${ytUrl}" target="_blank" style="text-decoration:none; display:inline-block; padding:6px 14px; background:#ff0000; color:#fff; border-radius:20px; font-size:11px; font-weight:bold; flex-shrink:0;">▶ Trailer</a>
</div>`;
    });
    const kougyouComment = cleanArticleText(raw.split(/⑤ 日本映画|⑧ 興行/)[1]?.split(/Deep Dive/i)[0] || "");
    if (kougyouComment) article += `<div style="font-size:15px; line-height:1.8; color:#333; margin:20px 0;">${kougyouComment}</div>\n`;
  }

  // Deep Dive
  if (raw.includes('Deep Dive')) {
    article += `<hr style="margin:80px 0 60px; border:none; border-top:1px solid #eee;">\n`;
    article += h2('Deep Dive - 視点の対比');
    const ddContentRaw = raw.split(/Deep Dive/i)[1] || "";
    let ddContent = ddContentRaw.replace(/当事国A/g, '日本').replace(/当事国B/g, 'アメリカ').replace(/当事国（日本）/g, '日本');
    const sections = ddContent.split(/### /);
    let ddHtml = '<div style="background:#fffafa; padding:30px; border-radius:24px; border:1px solid #ffebee;">';
    sections.forEach(sec => {
      if (!sec.trim()) return;
      const lines = sec.split('\n');
      const subTitle = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      if (subTitle) {
        ddHtml += `
<div style="background:#fff; border:1px solid #eee; border-radius:16px; padding:25px; margin-bottom:25px; box-shadow:0 4px 15px rgba(211,47,47,0.03);">
  <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px;">
    <span style="background:${themeColor}; color:#fff; padding:4px 12px; border-radius:6px; font-size:11px; font-weight:900;">VIEWPOINT</span>
    <div style="font-weight:900; font-size:16px; color:#111;">${subTitle}</div>
  </div>
  <div style="font-size:15px; line-height:1.8; color:#444;">${cleanArticleText(body)}</div>
</div>`;
      }
    });
    ddHtml += '</div>';
    article += ddHtml;
  }

  return {
    json: {
      article: article,
      title: title,
      country: countryName,
      processedAt: new Date().toISOString()
    }
  };
});
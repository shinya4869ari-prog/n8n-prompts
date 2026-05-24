const promptBody = $input.first()?.json?.externalPrompt ?? "";

const allItems = $input.all();
const articleItem = allItems.find(i => i.json?.article != null) ?? allItems[0];
return [articleItem].map(item => {
  const inputData = item.json;
  const sheetData = $('整形ノード1').first().json;
  const moviesData = $('リンク挿入').first().json?.movies || [];
  let raw = inputData?.article ?? "";
  const rawLines = raw.split('\n');

  // --- 1. 見出しの重複削除（AIが出したプレーンな見出しを消す） ---
  raw = raw.replace(/^[①-⑨] .*$/gm, '');

  const countryName = $('国名変換Code').first().json.country || inputData.country || '対象国';
  const currencySymbol = $('国名変換Code').first().json.currencySymbol || '';
  const rate = $('国名変換Code').first().json.rate || 1;

  // --- 1. 見出し・出典の重複削除（AIが出したプレーンな行を消す） ---
  raw = raw.replace(/^[①-⑨] .*$/gm, '');
  raw = raw.replace(/^出典：.*$/gm, '');
  raw = raw.replace(/^(国家の形と統治機構|行政トップ|立法と選挙制度|司法と法制度|社会保障・医療・年金|教育制度|徴税・財政制度|安全保障と兵役|基本権と価値観)｜.*$/gm, '');

  const citation = sheetData.data?.固定データ?.死因出典
    ? `出典：${sheetData.data.固定データ.死因出典} / 日本：${sheetData.data.日本固定データ?.死因出典 || '厚生労働省'}`
    : '';

  const title = countryName;

  const capital = $('国名変換Code').first().json.capital ?? '';
  const japanCapital = $('国名変換Code').first().json.japanCapital ?? '';
  const countryLabel = capital ? `${countryName}（${capital}）` : countryName;
  const japanLabel = '日本（東京）';

  // --- 2. パイプ区切りデータをパース ---
  function parseLines(text, prefix) {
    return text.split('\n')
      .filter(l => l.startsWith(prefix + '｜'))
      .map(l => {
        const cleanedLine = l.replace(/<\/?[^>]+(>|$)/g, "").trim();
        const parts = cleanedLine.replace(prefix + '｜', '').split('｜');
        const obj = {};
        parts.forEach(p => {
          const idx = p.indexOf('：');
          if (idx !== -1) obj[p.substring(0, idx).trim()] = p.substring(idx + 1).trim();
        });
        return obj;
      });
  }

  // --- 3. HTML生成ヘルパー ---
  const h2Style = `margin-top:60px;padding-top:20px;border-top:1px solid #b2ebf2;font-size:16px;font-weight:900;color:#111;`;
  const h3Style = `font-size:14px;font-weight:800;color:#333;margin-top:30px;margin-bottom:10px;`;
  const citationStyle = `font-size:12px;color:#aaa;text-align:right;margin-top:4px;margin-bottom:24px;`;

  function makeTable(headers, rows, widths) {
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#e0f5f5,#f0f8f8);text-align:left;font-size:14px;${w ? 'width:' + w + ';' : ''}`;
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

  // エラーネコの一言を生成するヘルパー（吹き出しデザイン）
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

  function makeArticleCards(perplexityJson, max = 3) {
    if (!perplexityJson?.results) return '';
    const validResults = perplexityJson.results
      .filter(r => r.title && r.snippet && r.url)
      .slice(0, max);
    if (validResults.length === 0) return '';
    
    return validResults.map(r => `
<div style="background:#f9fafa;border:1px solid #e0eeee;border-radius:10px;padding:16px;margin:10px 0;box-shadow:0 2px 6px rgba(0,0,0,0.05);">
  <div style="font-weight:bold;font-size:14px;color:#20B2AA;margin-bottom:8px;">📰 ${r.title}</div>
  <div style="font-size:13px;color:#555;line-height:1.7;margin-bottom:10px;">${r.snippet.replace(/\n/g, '<br>').substring(0, 300)}...</div>
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <a href="${r.url}" target="_blank" style="font-size:12px;color:#20B2AA;text-decoration:none;">🔗 元記事を読む</a>
    <span style="font-size:11px;color:#aaa;">${r.last_updated || ''}</span>
  </div>
</div>`).join('\n');
  }

  const formatKaisetu = (text) => {
    // 出典部分を分離
    const citeMatch = text.match(/\n出典：([\s\S]*)$/);
    const mainText = citeMatch ? text.replace(citeMatch[0], '') : text;
    const citeText = citeMatch ? citeMatch[1].trim() : '';
    
    const formatted = mainText
      .replace(/\n—+\n/g, '\n')
      .replace(/\n##\s*\n/g, '\n')
      .replace(/^—+$/gm, '')
      .replace(/^##\s*$/gm, '')
      .replace(/^：(.+)$/gm, '<p style="font-size:15px;font-weight:700;color:#555;margin:0 0 16px;padding:8px 12px;background:#f0f7f7;border-radius:6px;">$1</p>')
      .replace(/^### (.+)$/gm, '<h4 style="font-size:14px;font-weight:900;color:#333;margin:20px 0 6px;padding-left:10px;border-left:3px solid #b2ebf2;">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;font-weight:900;color:#20B2AA;margin:24px 0 8px;border-left:4px solid #20B2AA;padding-left:10px;">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    
    return { formatted, citeText };
  };

  // --- データ事前抽出（ヘッダーで使用するため） ---
  const geoItems = ['位置', '面積', '公用語', '日本からの飛行距離'];
  const geoData = geoItems.map(item => {
    const line = rawLines.find(l => l.startsWith(item + '：'));
    const val = line ? line.replace(item + '：', '').trim() : 'データなし';
    return { 項目: item, 値: val };
  });

  let boekiKaisetu = '';
  let shiinKaisetu = '';
  let hanzaiKaisetu = '';
  try {
    const aiText = $('検索結果まとめ記事').first().json?.content?.parts?.[0]?.text || '';
    const boekiMatch = aiText.match(/\[貿易解説\]([\s\S]*?)(?=\[死因解説\]|\[犯罪解説\]|$)/);
    const shiinMatch = aiText.match(/\[死因解説\]([\s\S]*?)(?=\[犯罪解説\]|$)/);
    const hanzaiMatch = aiText.match(/\[犯罪解説\]([\s\S]*?)$/);
    boekiKaisetu = boekiMatch ? boekiMatch[1].trim() : '';
    shiinKaisetu = shiinMatch ? shiinMatch[1].trim() : '';
    hanzaiKaisetu = hanzaiMatch ? hanzaiMatch[1].trim() : '';
  } catch(e) {}

  let article = '';

  // --- 4. ヒーローステータスカード（冒頭） ---
  const kikenLevelRaw = sheetData.data?.固定データ?.治安指標?.外務省危険レベル?.レベル || 'データなし';
  const kikenLevel = parseInt(String(kikenLevelRaw).replace(/[^0-9]/g, '')) || 0;
  const location = geoData.find(d => d.項目 === '位置')?.値 || '不明';

  let headerBg = 'linear-gradient(135deg, #f0fafa 0%, #e0f5f5 100%)';
  let statusColor = '#00bcd4';
  let statusText = '✅ 安定';
  let statusBorder = '#b2ebf2';

  if (kikenLevel >= 2) {
    headerBg = 'linear-gradient(135deg, #fff3f3 0%, #ffebee 100%)';
    statusColor = '#d32f2f';
    statusText = '🚨 危険・渡航注意';
    statusBorder = '#ffcdd2';
  } else if (kikenLevel === 1) {
    headerBg = 'linear-gradient(135deg, #fffdf0 0%, #fff9c4 100%)';
    statusColor = '#fbc02d';
    statusText = '⚠️ 注意';
    statusBorder = '#fff9c4';
  }

  article += `
<div style="background:${headerBg}; border:1px solid #eee; border-left:8px solid ${statusColor}; border-radius:12px; padding:24px; margin-bottom:35px; box-shadow:0 4px 15px rgba(0,0,0,0.06); position:relative; overflow:hidden;">
  <div style="position:absolute; top:-20px; right:-20px; font-size:100px; color:${statusColor}; opacity:0.05; transform:rotate(-15deg); font-weight:bold; z-index:0;">FACT</div>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div>
      <div style="font-size:12px; color:${statusColor}; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">National Profile</div>
      <h1 style="margin:0; font-size:28px; font-weight:900; color:#111; letter-spacing:-0.5px;">${countryName}</h1>
      <div style="margin:8px 0 0; font-size:14px; color:#555; display:flex; gap:12px; align-items:center;">
        <span>📍 ${capital || '首都不明'}</span>
        <span style="color:#ccc;">|</span>
        <span>🌍 ${location}</span>
      </div>
    </div>
    <div style="background:${statusColor}; color:#fff; padding:8px 18px; border-radius:30px; font-weight:900; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:flex; align-items:center; gap:6px;">
      ${statusText}
    </div>
  </div>
</div>
`;

  // --- 5. 導入文（超頑強アルゴリズム ＋ HTML段落自動整形） ---
  let introText = "";
  const firstSectionIdx = rawLines.findIndex(l => /(?:①|1\.?)\s*制度/.test(l) || /^[^\n｜]+｜[^\n｜]+｜[^\n｜]+｜/.test(l));
  if (firstSectionIdx !== -1) {
    introText = rawLines.slice(0, firstSectionIdx).join('\n').trim();
  } else {
    const fallbackIdx = rawLines.findIndex(l => l.includes('｜') && (l.includes('国家の形') || l.includes('行政トップ')));
    if (fallbackIdx !== -1) {
      introText = rawLines.slice(0, fallbackIdx).join('\n').trim();
    }
  }

  // 重複タイトルや余計な記号を綺麗にクリーンアップ
  introText = introText
    .replace(/^#+.*$/gm, '')
    .trim();

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

  // --- 6. ① 制度の9つの皿 ---
  article += `<h2 style="${h2Style}">① 制度の9つの皿</h2>\n`;
  const seidoItems = ['国家の形と統治機構', '行政トップ', '立法と選挙制度', '司法と法制度', '社会保障・医療・年金', '教育制度', '徴税・財政制度', '安全保障と兵役', '基本権と価値観'];
  const seidoData = seidoItems.map(item => {
    const line = rawLines.find(l => l.startsWith(item + '｜'));
    if (!line) return { 項目: item, [countryName]: 'データなし', 日本: 'データなし' };
    const parts = line.replace(item + '｜', '').split('｜');
    const obj = { 項目: item };
    parts.forEach(p => { const idx = p.indexOf('：'); if (idx !== -1) obj[p.substring(0, idx).trim()] = p.substring(idx + 1).trim(); });
    return obj;
  });
  const seidoRows = seidoData.map(d => [d.項目, d[countryName] || 'データなし', d['日本'] || 'データなし']);
  article += makeTable(['制度の項目', countryLabel, japanLabel], seidoRows, ['30%', '35%', '35%']);

  const seidoExplanation = extractTextBetween(raw, '基本権と価値観｜', '🐱 エラーネコ：');
  if (seidoExplanation) article += `\n${seidoExplanation}\n`;

  const seidoNeko = getNekoBubbleForSection('①');
  article += makeNekoBubble(seidoNeko);

  // --- 7. ② 地理と経済の衡量 ---
  article += `<h2 style="${h2Style}">② 地理と経済の衡量</h2>\n`;
  // geoData は上で事前抽出済み
  const geoRows = [
    ...geoData.map(d => [d.項目, d.値]),
    ['外務省危険レベル', kikenLevelRaw]
  ];
  article += makeTable(['地理項目', '内容'], geoRows, ['30%', '70%']);

  // --- 経済データ整形ヘルパー ---
  function formatEconValue(itemName, rawValue) {
    if (!rawValue || rawValue === 'データなし' || typeof rawValue !== 'string') return rawValue;

    // 数字とそれ以外（年号など）を分離
    const match = rawValue.match(/^([\d\.,-]+)(.*)$/);
    if (!match) return rawValue;

    let num = parseFloat(match[1].replace(/,/g, ''));
    const suffix = match[2]; // （2025年）など

    if (itemName === '総人口') {
      // IMFデータは100万人単位
      const total = num * 1000000;
      if (total >= 100000000) return (total / 100000000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '億人' + suffix;
      if (total >= 10000) return (total / 10000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '万人' + suffix;
      return Math.round(total).toLocaleString() + '人' + suffix;
    }

    if (itemName.includes('GDP（名目')) {
      // IMFデータは10億ドル単位（Billions）なので、10倍して「億ドル」にする
      const okuValue = num * 10;
      return okuValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '億ドル' + suffix;
    }

    if (itemName === '一人当たりGDP') {
      return '$' + Math.round(num).toLocaleString() + suffix;
    }

    if (itemName.includes('率') || itemName.includes('比')) {
      return num.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' + suffix;
    }

    return rawValue;
  }

  const econItems = ['総人口', 'GDP（名目・USドル）', '一人当たりGDP', 'GDP成長率', '政府債務残高（GDP比）', '経常収支（GDP比）', 'インフレ率'];
  const econData = econItems.map(item => {
    const line = rawLines.find(l => l.startsWith(item + '｜'));
    if (!line) return { 項目: item, [countryName]: 'データなし', 日本: 'データなし' };
    const parts = line.replace(item + '｜', '').split('｜');
    const obj = { 項目: item };
    parts.forEach(p => {
      const idx = p.indexOf('：');
      if (idx !== -1) {
        const key = p.substring(0, idx).trim();
        const val = p.substring(idx + 1).trim();
        // ここで数値を整形
        obj[key] = formatEconValue(item, val);
      }
    });
    return obj;
  });
  const econRows = econData.map(d => [d.項目, d[countryName] || 'データなし', d['日本'] || 'データなし']);
  article += makeTable(['経済指標', countryLabel, japanLabel], econRows, ['30%', '35%', '35%']);
  const econCite = sheetData.data?.固定データ?.経済データ?.GDP_USD?.出典 || 'IMF World Economic Outlook';
  article += `<p class="citation" style="${citationStyle}">出典：${econCite}</p>\n`;

  const econExplanation = extractTextBetween(raw, '出典：World Bank', '🐱 エラーネコ：');
  if (econExplanation) article += `\n${econExplanation}\n`;

  const econNeko = getNekoBubbleForSection('②');
  article += makeNekoBubble(econNeko);

  // --- 8. ③ 治安と平和の衡量 ---
  article += `<h2 style="${h2Style}">③ 治安と平和の衡量</h2>\n`;
  const chiAnItems = ['殺人率（10万人あたり）', '交通事故死亡率（10万人あたり）', '自殺率（10万人あたり）', '失業率', '貧困率', 'ジニ係数', '刑務所稼働率', '刑務所総収容者数', 'GPI（世界平和度指数）'];
  const chiAnData = chiAnItems.map(item => {
    const line = rawLines.find(l => l.startsWith(item + '｜'));
    if (!line) return { 項目: item, [countryName]: 'データなし', 日本: 'データなし' };
    const parts = line.replace(item + '｜', '').split('｜');
    const obj = { 項目: item };
    parts.forEach(p => { const idx = p.indexOf('：'); if (idx !== -1) obj[p.substring(0, idx).trim()] = p.substring(idx + 1).trim(); });
    return obj;
  });
  const chiAnRows = chiAnData.map(d => {
    const formatSource = (val) => val.replace(/\s*([（(].*)$/, '<br><span style="font-size:11.5px; color:#888; font-weight:normal; line-height:1.4; display:inline-block; margin-top:2px;">$1</span>');
    return [d.項目, formatSource(d[countryName] || 'データなし'), formatSource(d['日本'] || 'データなし')];
  });

  const chiAnCountryLabel = capital ? `${countryName}<br>（${capital}）` : countryName;
  const chiAnJapanLabel = '日本<br>（東京）';

  article += makeTable(['治安・社会指標', chiAnCountryLabel, chiAnJapanLabel], chiAnRows, ['35%', '32%', '33%']);


  // 危険レベル警告 (レベル1以上の場合のみ表示)
  if (kikenLevel > 0) {
    const kikenMatch = raw.match(/[⚠️🚨] 外務省から[^\n]+/);
    if (kikenMatch) article += `<p style="color:#d32f2f;font-weight:bold;background:#fff3f3;padding:10px;border-radius:8px;">${kikenMatch[0]}</p>\n`;
  }

  const prisonData = parseLines(raw, '刑務所推移');
  if (prisonData.length > 0) {
    article += `<h3 style="${h3Style}">刑務所収容者数の推移</h3>\n`;

    const labels = prisonData.map(d => d['年']);
    const targetData = prisonData.map(d => {
      const val = d[`${countryName}総収容者数`]?.replace(/,/g, '').trim();
      if (!val || val === '-' || val === 'データなし') return null;
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    });
    const japanData = prisonData.map(d => {
      const val = d['日本総収容者数']?.replace(/,/g, '').trim();
      if (!val || val === '-' || val === 'データなし') return null;
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    });

    // 数値の規模にどれくらい差があるか判定 (スマート・チャート・ロジック) - nullを除外して最大値を正確に計算
    const targetDataFiltered = targetData.filter(x => x !== null);
    const japanDataFiltered = japanData.filter(x => x !== null);
    const maxTarget = targetDataFiltered.length > 0 ? Math.max(...targetDataFiltered) : 1;
    const maxJapan = japanDataFiltered.length > 0 ? Math.max(...japanDataFiltered) : 1;
    const ratio = Math.max(maxTarget, maxJapan) / Math.min(maxTarget, maxJapan);

    if (ratio > 20) {
      // --- 規模が20倍以上違う場合は、2つのグラフに分ける ---
      const targetChartConfig = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: `${countryName} (人)`,
            data: targetData,
            borderColor: '#00bcd4',
            backgroundColor: 'rgba(0, 188, 212, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            spanGaps: true
          }]
        },
        options: { title: { display: true, text: `${countryName}の推移 (小規模)` } }
      };

      const japanChartConfig = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: '日本 (人)',
            data: japanData,
            borderColor: '#ff4500',
            backgroundColor: 'rgba(255, 69, 0, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            spanGaps: true
          }]
        },
        options: { title: { display: true, text: '日本の推移 (大規模)' } }
      };

      const targetChartUrl = `https://quickchart.io/chart?width=400&height=250&c=${encodeURIComponent(JSON.stringify(targetChartConfig))}`;
      const japanChartUrl = `https://quickchart.io/chart?width=400&height=250&c=${encodeURIComponent(JSON.stringify(japanChartConfig))}`;

      article += `
<p style="font-size:12px; color:#666; background:#f9f9f9; padding:10px; border-radius:6px; border-left:4px solid #ccc;">
  ※日本と${countryName}では収容者数の規模が大きく異なるため（約${Math.round(ratio)}倍の差）、それぞれの傾向を正確に把握できるよう個別にグラフを表示しています。
</p>
<div style="display:flex; flex-wrap:wrap; gap:10px; margin:20px 0;">
  <div style="flex:1; min-width:300px;"><img src="${targetChartUrl}" style="max-width:100%; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);"></div>
  <div style="flex:1; min-width:300px;"><img src="${japanChartUrl}" style="max-width:100%; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.1);"></div>
</div>`;

    } else {
      // --- 規模が近い場合は、1つのグラフにまとめる (2軸) ---
      const chartConfig = {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: `${countryName} (右軸)`, data: targetData, borderColor: '#00bcd4', yAxisID: 'y1', fill: false, tension: 0.3, borderWidth: 3, spanGaps: true },
            { label: '日本 (左軸)', data: japanData, borderColor: '#ff4500', yAxisID: 'y', fill: false, tension: 0.3, borderWidth: 2, borderDash: [5, 5], spanGaps: true }
          ]
        },
        options: {
          scales: {
            yAxes: [
              { id: 'y', type: 'linear', position: 'left', ticks: { fontColor: '#ff4500' } },
              { id: 'y1', type: 'linear', position: 'right', ticks: { fontColor: '#00bcd4' }, gridLines: { drawOnChartArea: false } }
            ]
          }
        }
      };
      const chartUrl = `https://quickchart.io/chart?width=800&height=400&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
      article += `<div style="margin: 20px 0; text-align: center;"><img src="${chartUrl}" alt="比較グラフ" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></div>\n`;
    }

    article += `<p class="citation" style="${citationStyle}">出典：World Prison Brief</p>\n`;
  }

  const shiinData = parseLines(raw, '死因');
  const crimeData = parseLines(raw, '犯罪');

  // 犯罪トップ5表
  article += `<h3 style="${h3Style}">犯罪種別ランキング</h3>\n`;
  if (crimeData.length > 0) {
    const crimeRows = crimeData.map(d => [
      d['順位'] || '',
      d['種別'] || 'データなし'
    ]);
    const crimeOutten = crimeData[0]?.['出典'] || '';
    article += makeTable(['順位', '犯罪種別'], crimeRows, ['15%', '85%']);
    if (crimeOutten) article += `<p class="citation" style="${citationStyle}">出典：${crimeOutten}</p>\n`;
  }

  // 犯罪の傾向テキスト
  const crimeFeature = extractTextBetween(raw, '犯罪の傾向', '死因｜順位：1位');
  if (crimeFeature) article += `\n${crimeFeature}\n`;

  article += `<div style="border-top:1px solid #b2ebf2;margin:30px 0;"></div>\n`;

  if (hanzaiKaisetu) {
    article += `<h3 style="${h3Style}">📰 最新情報：犯罪傾向</h3>\n`;
    const { formatted, citeText } = formatKaisetu(hanzaiKaisetu);
    article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
    if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
  }

  if (shiinData.length > 0) {
    article += `<h3 style="${h3Style}">主要な死因トップ10</h3>\n`;
    const shiinRows = shiinData.map(d => [d['順位'], d[countryName] || 'データなし', d['日本'] || 'データなし']);
    article += makeTable(['順位', countryName, '日本'], shiinRows);
    if (citation) article += `<p class="citation" style="${citationStyle}">${citation}</p>\n`;

    // shiin解説テキストの追加
    if (shiinKaisetu) {
      article += `<h3 style="${h3Style}">📰 最新情報：死因・健康統計</h3>\n`;
      const { formatted, citeText } = formatKaisetu(shiinKaisetu);
      article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
      if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
    }
  }

  const chianNeko = getNekoBubbleForSection('③');
  article += makeNekoBubble(chianNeko);

  // --- 9. ④ 貿易の衡量 ---
  article += `<h2 style="${h2Style}">④ 貿易の衡量</h2>\n`;
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
    const boekiCiteStr = sheetData.data?.固定データ?.貿易出典_対象国 || 'IMF / Trade Map';
    article += `<p class="citation" style="${citationStyle}">出典：${boekiCiteStr}</p>\n`;
  }

  // boeki解説テキストの追加
  if (boekiKaisetu) {
    article += `<h3 style="${h3Style}">📰 最新情報：貿易動向</h3>\n`;
    const { formatted, citeText } = formatKaisetu(boekiKaisetu);
    article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
    if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
  }

  const boekiNeko = getNekoBubbleForSection('④');
  article += makeNekoBubble(boekiNeko);

  // --- 10. ⑤ 生活・価値の衡量（物価比較） ---
  article += `<h2 style="${h2Style}">⑤ 生活・価値の衡量（物価比較）</h2>\n`;

  // 為替レートをsheetData（整形ノード1）から直接取得、なければ国名変換Codeの値を使用
  const sheetRate = parseFloat(sheetData.data?.固定データ?.物価?.為替レート) || 0;
  let currentRate = sheetRate > 1 ? sheetRate : rate;
  if (currentRate <= 1) {
    const rateTextMatch = raw.match(/為替レート[は：]\s*1\s*[A-Z]+\s*[（(].*?[)）]\s*=\s*([\d\.]+)\s*JPY/i);
    if (rateTextMatch) currentRate = parseFloat(rateTextMatch[1]);
  }

  const bukkaData = parseLines(raw, '物価');
  const bukkaEmoji = { 'ビール（レストラン500ml）': '🍺', 'タバコ（マルボロ1箱）': '🚬', 'ミネラルウォーター（500ml）': '💧', 'ビッグマック（1個）': '🍔', 'ガソリン（1L）': '⛽', '外食（安めの店・1食）': '🍜', '電気・水道・ガス（月額）': '💡', '家賃（1LDK・首都圏市内）': '🏠', '平均月収（手取り）': '💴', 'Netflix（スタンダード）': '📺' };

  function formatValueWithCommas(val) {
    if (!val || val === 'データなし') return val;
    // 数値部分（カンマ・ドット含む）を抽出して、カンマを除去してから再フォーマットし、太字化
    return val.replace(/[\d,\.]+/g, (m) => {
      const n = parseFloat(m.replace(/,/g, ''));
      return isNaN(n) ? m : `<span style="font-weight:900; font-size:15px;">${n.toLocaleString()}</span>`;
    });
  }

  if (bukkaData.length > 0) {
    const bukkaRows = bukkaData.map(d => {
      const emoji = bukkaEmoji[d['項目']] || '';
      const rawVal = d[countryName] || d['対象国'] || 'データなし';
      let displayP = rawVal;

      if (rawVal !== 'データなし') {
        // 数字部分（カンマ含む）を抽出
        const numMatch = rawVal.match(/[\d,\.]+/);
        if (numMatch) {
          const num = parseFloat(numMatch[0].replace(/,/g, ''));
          const yen = Math.round(num * currentRate);
          // 対象国側の通貨表示もカンマを入れ、メインの数字を太字化
          displayP = `<span style="font-weight:900; font-size:15px;">${currencySymbol}${num.toLocaleString()}</span> <span style="font-size:12px; color:#666;">（${yen.toLocaleString()}円）</span>`;
        }
      }

      // 日本側の価格もカンマを入れる
      const japanVal = formatValueWithCommas(d['日本'] || 'データなし');

      return [`${emoji} ${d['項目'] || ''}`, displayP, japanVal];
    });

    // 5番セクション専用の改行ヘッダー
    const bukkaCountryLabel = capital ? `${countryName}<br>（${capital}）` : countryName;
    const bukkaJapanLabel = '日本<br>（東京）';

    article += makeTable(['項目', bukkaCountryLabel, bukkaJapanLabel], bukkaRows, ['35%', '32%', '33%']);

    // 為替レートの注釈表示
    const rateMatch = raw.match(/為替レート[は：]([^\n]+)/);
    if (rateMatch) {
      const rateText = rateMatch[1].trim().replace('現在', '').replace(/^は/, '');
      article += `<p class="citation" style="${citationStyle}">※為替レートは${rateText}時点のレートを使用</p>\n`;
    }
    article += `<p class="citation" style="${citationStyle}">※アルコール禁止の国においては、ノンアルコールビールの価格を記載しています。<br>※Numbeoのデータは流動的であり、リサーチ時のタイミングにより変動する場合があります。</p>\n`;
    article += `<div style="height: 10px;"></div>\n`;
    const bukkaCites = [...new Set(bukkaData.map(d => d['出典']).filter(Boolean))];
    const netflixSheetCite = sheetData.data?.固定データ?.物価?.Netflix_出典 || 'Netflix公式サイト';
    const numbeoBase = 'Numbeo';
    const bukkaOuten = bukkaCites.length > 0 ? bukkaCites.join(' / ') : `${numbeoBase} / ${netflixSheetCite}`;
    article += `<p class="citation" style="${citationStyle}">出典：${bukkaOuten}</p>\n`;
  }

  const bukkaNeko = getNekoBubbleForSection('⑤');
  article += makeNekoBubble(bukkaNeko);

  // --- 11. ⑥ 歴史的背景 ---
  article += `<h2 style="${h2Style}">⑥ 歴史的背景（近代100年）</h2>\n`;
  const rekishiData = parseLines(raw, '歴史');
  if (rekishiData.length > 0) {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;font-size:14px;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thStyle = `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#e0f5f5,#f0f8f8);text-align:left;`;
    let rekishiHtml = `<table style="${tableStyle}"><thead><tr>`;
    rekishiHtml += `<th style="${thStyle}width:10%;">年</th><th style="${thStyle}width:20%;">事象名</th><th style="${thStyle}width:15%;">種別</th><th style="${thStyle}width:55%;">概要</th>`;
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
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['概要'] || ''}${d['出典'] ? `<br><span style="font-size:11px;color:#aaa;">出典：${d['出典']}</span>` : ''}</td>`;
      rekishiHtml += `</tr>`;
    });
    rekishiHtml += `</tbody></table>`;
    article += rekishiHtml;
    article += `
<div style="text-align:center;margin:30px 0;">
  <a href="#deep-dive" style="display:inline-block;padding:12px 30px;background:#1a237e;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:14px;box-shadow:0 4px 12px rgba(26,35,126,0.3);">
    ✦ Deep Dive で深掘りする
  </a>
</div>\n`;

  }

  // --- 12. ⑦ 直近の動向 ---
  article += `<h2 style="${h2Style}">⑦ 直近の動向</h2>\n`;
  const dohContent = extractTextBetween(raw, '<p>【政治経済社会】</p>', '🐱 エラーネコ：');
  if (dohContent) {
    const formattedDoh = dohContent.replace(/<p>/g, '<p style="margin-bottom:1.5em;">');
    article += `<p>【政治経済社会】</p>\n${formattedDoh}\n`;
    // 【動的出典】直近の動向の出典をシートから取得（ない場合は信頼できるフォールバックを表示）
    let dohCite = sheetData.data?.対象国データ_記事?.直近の動向?.出典 || '';
    if (!dohCite || dohCite === '欠測' || dohCite === 'データなし') {
      dohCite = '日本経済新聞 / 首相官邸 / 総務省 / 外務省';
    }
    article += `<p class="citation" style="${citationStyle}">出典：${dohCite}</p>\n`;
  }

  const dohNeko = getNekoBubbleForSection('⑦');
  article += makeNekoBubble(dohNeko);

  // --- 13. ⑧ 映像で知る${countryName} ---
  article += `<h2 style="${h2Style}">⑧ 映像で知る${countryName}</h2>\n`;
  const eizouData = parseLines(raw, '映像');
  if (eizouData.length > 0) {
    const eizouData2 = sheetData.data?.対象国データ_記事?.映像作品 || [];
    eizouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      const apiData = eizouData2.find(api => api['タイトル_日本語'] === d['タイトル'] || api['原題'] === d['タイトル']) || {};
      const directorActorStr = apiData['監督_主演'] ? ` &nbsp;•&nbsp; ${apiData['監督_主演']}` : '';
      const posterPath = apiData['poster_path'];
      const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w200${posterPath}` : '';
      const movieInfo = (apiData?.概要 || moviesData.find(m => m.name === d['タイトル'])?.info || '').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
      const imdbId = apiData?.imdb_id || null;
      const imdbBtn = imdbId ? `<a href="https://www.imdb.com/title/${imdbId}/" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

      const linkHtml = `<div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' trailer')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>
        ${imdbBtn}
      </div>`;

      const posterHtml = posterUrl
        ? `<div style="flex-shrink:0;"><img src="${posterUrl}" alt="${d['タイトル'] || ''}" style="width:80px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);"></div>`
        : '';

      article += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="display:flex;gap:16px;align-items:flex-start;">
    <div style="flex:1;">
      <div style="font-weight:800;font-size:16px;color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;display:inline-block;margin-bottom:6px;" data-movie-title='${(d['タイトル'] || '').replace(/'/g, '&#39;')}' data-movie-info='${movieInfo}'>${isSerious ? '⚠️ ' : ''}${d['タイトル'] || ''}</div>
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${d['種別'] || ''} &nbsp;•&nbsp; ${d['公開年'] || ''}${directorActorStr}</div>
      ${linkHtml}
    </div>
    ${posterHtml}
  </div>
</div>`;
    });
    const eizouCites = [...new Set(eizouData2.map(d => d.出典).filter(Boolean))];
    if (eizouCites.length > 0) {
      article += `<p class="citation" style="${citationStyle}">出典：${eizouCites.join(' / ')}</p>\n`;
    }
  }

  const eizouNeko = getNekoBubbleForSection('⑧');
  article += makeNekoBubble(eizouNeko);

  // --- 14. ⑨ 特別枠：${countryName} おすすめ映画・映像作品 ---
  article += `<h2 style="${h2Style}">⑨ 特別枠：${countryName} おすすめ映画・映像作品</h2>\n`;
  const kougyouData = parseLines(raw, 'おすすめ').filter(d => d['タイトル'] && d['タイトル'] !== '欠測');
  if (kougyouData.length > 0) {
    const kougyouData2 = sheetData.data?.対象国データ_記事?.おすすめ映画ランキング || [];
    kougyouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      const apiData = kougyouData2.find(api => api['タイトル_日本語'] === d['タイトル'] || api['原題'] === d['タイトル']) || {};
      const posterPath = apiData['poster_path'];
      const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w200${posterPath}` : '';
      const rankingInfo = (apiData?.概要 || moviesData.find(m => m.name === d['タイトル'])?.info || '').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
      const imdbId = apiData?.imdb_id || null;
      const imdbBtn = imdbId ? `<a href="https://www.imdb.com/title/${imdbId}/" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

      const linkHtml = `<div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent((d['タイトル'] || '') + ' trailer')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>
        ${imdbBtn}
      </div>`;

      const posterHtml = posterUrl
        ? `<div style="flex-shrink:0;"><img src="${posterUrl}" alt="${d['タイトル'] || ''}" style="width:80px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);"></div>`
        : '';

      article += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#ff4500;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:8px;">
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span style="background:#ff4500;color:#fff;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">${d['順位'] || ''}</span>
        <span style="font-weight:800;font-size:16px;color:#20B2AA;border-bottom:1px dashed #20B2AA;cursor:pointer;" data-movie-title='${(d['タイトル'] || '').replace(/'/g, '&#39;')}' data-movie-info='${rankingInfo}'>${d['タイトル'] || ''}</span>
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:10px;">
        📅 ${d['公開年'] || ''}
        ${d['監督_主演'] && d['監督_主演'] !== '欠測' && d['監督_主演'] !== 'データなし' ? `<br><span style="color:#555;font-size:12px;">🎬 監督・主演：${d['監督_主演']}</span>` : ''}
      </div>
      ${linkHtml}
    </div>
    ${posterHtml}
  </div>
</div>`;
    });
    const kougyouCites = [...new Set(kougyouData2.map(d => d.出典).filter(Boolean))];
    if (kougyouCites.length > 0) {
      article += `<p class="citation" style="${citationStyle}">出典：${kougyouCites.join(' / ')}</p>\n`;
    }
  }

  const kougyouNeko = getNekoBubbleForSection('⑨');
  article += makeNekoBubble(kougyouNeko);

  // --- 15. ライブログ ---
  const logMatch = raw.match(/(### 【ライブ検索[\s\S]*$)/);
  if (logMatch) article += '\n' + logMatch[1];

  // --- 16. Deep-Dive ---
  let deepDiveArticle = '';
  try {
    deepDiveArticle = $('リンク挿入').first().json?.deepDiveArticle || '';
  } catch (e) {
    // リンク挿入ノードが接続されていないか名前が違う場合は整形3から直接取得を試みる
    try { deepDiveArticle = $('整形3').first().json?.article || ''; } catch (e2) { }
  }

  if (deepDiveArticle) {
    // --- Deep Dive セクション仕切り ---
    article += `
<div id="deep-dive" style="border-top:4px solid #1a237e; margin:80px 0 40px; padding-top:40px;">
  <div style="display:inline-block; background:#1a237e; color:#fff; padding:5px 18px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;">✦ Deep Dive</div>
</div>\n`;

    // ディープダイブの「■ 主な出典」セクションのみをピンポイントで薄い色で小さくスタイルする
    let styledDD = deepDiveArticle;
    styledDD = styledDD.replace(/(■\s*主な出典[\s\S]*?)(?=(?:<h[1-4]|<\/div>\s*$|$))/gi, (match) => {
      let cleanedMatch = match.replace(/font-size:\s*14px/g, 'font-size:11px');
      cleanedMatch = cleanedMatch.replace(/color:\s*#333/g, 'color:#aaa');
      return `<div style="font-size:11px; color:#aaa; line-height:1.6; margin-top:30px; border-top:1px dashed #eee; padding-top:15px; margin-bottom:20px;">\n\n` + cleanedMatch + `\n\n</div>`;
    });
    article += styledDD;
  }

  // --- 17. リンクポップアップHTMLの最終挿入（はりボテリンク解消） ---
  const moviePopupScript = `
<script>
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-movie-title]');
  if (!el) return;
  const title = el.getAttribute('data-movie-title');
  const info = el.getAttribute('data-movie-info');
  document.getElementById('tenbin-popup-title').textContent = title;
  document.getElementById('tenbin-popup-info').textContent = info;
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

  const finalArticleText = article + '\n\n' + moviePopupScript + '\n\n' + popupHTML;

  // --- WordPressカテゴリーID自動振り分け設定 ---
  // ※WordPress側のカテゴリーIDに合わせて右側の数値を変更・調整してください
  const categoryIdMap = {
    "アジア": 15,
    "ヨーロッパ": 16,
    "アフリカ": 17,
    "中東": 18,
    "オセアニア": 19,
    "北米": 20,
    "南米": 21,
    "その他": 1
  };
  const regionName = $('国名変換Code').first().json.region || "その他";
  const categoryId = categoryIdMap[regionName] || 1;
  const countryEn = $('国名変換Code').first().json.countryEn || "";

  return {
    json: {
      article: finalArticleText,
      title: title,
      country: countryName,
      countryEn: countryEn,
      capital: capital,
      category_name: regionName,
      category_id: categoryId,
      categories: [categoryId] // WordPressノードのcategoriesフィールドにそのまま渡せる配列形式
    }
  };
});

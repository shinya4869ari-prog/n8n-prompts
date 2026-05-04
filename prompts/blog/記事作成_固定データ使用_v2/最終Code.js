const promptBody = $input.first()?.json?.externalPrompt ?? "";

return $input.all().map(item => {
  const inputData = item.json;
  const sheetData = $('整形ノード1').first().json;
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
        const parts = l.replace(prefix + '｜', '').split('｜');
        const obj = {};
        parts.forEach(p => {
          const idx = p.indexOf('：');
          if (idx !== -1) obj[p.substring(0, idx).trim()] = p.substring(idx + 1).trim();
        });
        return obj;
      });
  }

  // --- 3. HTML生成ヘルパー ---
  const h2Style = `margin-top:60px;padding-top:20px;border-top:3px solid #00bcd4;font-size:16px;font-weight:900;color:#111;`;
  const h3Style = `font-size:14px;font-weight:800;color:#333;margin-top:30px;margin-bottom:10px;`;

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

  // --- データ事前抽出（ヘッダーで使用するため） ---
  const geoItems = ['位置', '面積', '公用語', '日本からの飛行距離'];
  const geoData = geoItems.map(item => {
    const line = rawLines.find(l => l.startsWith(item + '：'));
    const val = line ? line.replace(item + '：', '').trim() : 'データなし';
    return { 項目: item, 値: val };
  });

  let article = '';

  // --- 4. ヒーローステータスカード（冒頭） ---
  const kikenLevelRaw = inputData.data?.固定データ?.治安指標?.外務省危険レベル?.レベル || 'データなし';
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

  // --- 5. 導入文 ---
  const introEndIdx = rawLines.findIndex(l => l.includes('① 制度'));
  if (introEndIdx !== -1) {
    article += rawLines.slice(0, introEndIdx).join('\n') + '\n';
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

  const seidoNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('① 制度')) && l.includes('🐱 エラーネコ：'));
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
  article += `<p class="citation">出典：${econCite}</p>\n`;

  const econExplanation = extractTextBetween(raw, '出典：World Bank', '🐱 エラーネコ：');
  if (econExplanation) article += `\n${econExplanation}\n`;

  const econNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('② 地理と経済')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(econNeko);

  // --- 8. ③ 治安と平和の衡量 ---
  article += `<h2 style="${h2Style}">③ 治安と平和の衡量</h2>\n`;
  const chiAnItems = ['殺人率（10万人あたり）', '交通事故死亡率（10万人あたり）', '自殺率（10万人あたり）', '失業率', '貧困率', 'ジニ係数', '刑務所収容率', '刑務所総収容者数', 'GPI（世界平和度指数）'];
  const chiAnData = chiAnItems.map(item => {
    const line = rawLines.find(l => l.startsWith(item + '｜'));
    if (!line) return { 項目: item, [countryName]: 'データなし', 日本: 'データなし' };
    const parts = line.replace(item + '｜', '').split('｜');
    const obj = { 項目: item };
    parts.forEach(p => { const idx = p.indexOf('：'); if (idx !== -1) obj[p.substring(0, idx).trim()] = p.substring(idx + 1).trim(); });
    return obj;
  });
  const chiAnRows = chiAnData.map(d => [d.項目, d[countryName] || 'データなし', d['日本'] || 'データなし']);
  article += makeTable(['治安・社会指標', countryLabel, japanLabel], chiAnRows, ['35%', '32%', '33%']);


  // 危険レベル警告
  const kikenMatch = raw.match(/[⚠️🚨] 外務省から[^\n]+/);
  if (kikenMatch) article += `<p style="color:#d32f2f;font-weight:bold;background:#fff3f3;padding:10px;border-radius:8px;">${kikenMatch[0]}</p>\n`;

  const prisonData = parseLines(raw, '刑務所推移');
  if (prisonData.length > 0) {
    article += `<h3 style="${h3Style}">刑務所収容者数の推移</h3>\n`;

    // グラフ用データの準備
    const labels = prisonData.map(d => d['年']);
    const targetData = prisonData.map(d => parseInt(d[`${countryName}総収容者数`]?.replace(/,/g, '')) || 0);
    const japanData = prisonData.map(d => parseInt(d['日本総収容者数']?.replace(/,/g, '')) || 0);

    const chartConfig = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: `${countryName} (右軸)`,
            data: targetData,
            borderColor: '#00bcd4',
            backgroundColor: 'rgba(0, 188, 212, 0.1)',
            yAxisID: 'y1',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 4
          },
          {
            label: '日本 (左軸)',
            data: japanData,
            borderColor: '#ff4500',
            backgroundColor: 'transparent',
            yAxisID: 'y',
            fill: false,
            tension: 0.3,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3
          }
        ]
      },
      options: {
        title: { display: true, text: '総収容者数の推移比較', fontSize: 16, fontColor: '#333' },
        scales: {
          yAxes: [
            { id: 'y', type: 'linear', position: 'left', scaleLabel: { display: true, labelString: '日本 (人)', fontColor: '#ff4500' }, ticks: { fontColor: '#ff4500' } },
            { id: 'y1', type: 'linear', position: 'right', scaleLabel: { display: true, labelString: `${countryName} (人)`, fontColor: '#00bcd4' }, ticks: { fontColor: '#00bcd4' }, gridLines: { drawOnChartArea: false } }
          ]
        }
      }
    };

    const chartUrl = `https://quickchart.io/chart?width=800&height=400&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
    article += `<div style="margin: 20px 0; text-align: center;"><img src="${chartUrl}" alt="刑務所収容者数の推移グラフ" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></div>\n`;

    article += `<p class="citation">出典：World Prison Brief</p>\n`;
  }

  const shiinData = parseLines(raw, '死因');
  if (shiinData.length > 0) {
    article += `<h3 style="${h3Style}">主要な死因トップ10</h3>\n`;
    const shiinRows = shiinData.map(d => [d['順位'], d[countryName] || 'データなし', d['日本'] || 'データなし']);
    article += makeTable(['順位', countryName, '日本'], shiinRows);
    if (citation) article += `<p class="citation">${citation}</p>\n`;
  }

  const chianNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('③ 治安と平和')) && l.includes('🐱 エラーネコ：'));
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
    article += `<p class="citation">出典：${boekiCiteStr}</p>\n`;
  }

  const boekiExplanation = extractTextBetween(raw, '貿易相手｜順位：10位｜', '🐱 エラーネコ：');
  if (boekiExplanation) article += `\n${boekiExplanation}\n`;

  const boekiNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('④ 貿易の衡量')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(boekiNeko);

  // --- 10. ⑤ 生活・価値の衡量（物価比較） ---
  article += `<h2 style="${h2Style}">⑤ 生活・価値の衡量（物価比較）</h2>\n`;

  // 為替レートが1（または未取得）の場合、テキストから抽出を試みる
  let currentRate = rate;
  if (currentRate === 1) {
    const rateTextMatch = raw.match(/為替レート[は：]\s*1\s*[A-Z]+\s*\(.*?\)\s*=\s*([\d\.]+)\s*JPY/i);
    if (rateTextMatch) {
      currentRate = parseFloat(rateTextMatch[1]);
    }
  }

  const bukkaData = parseLines(raw, '物価');
  const bukkaEmoji = { 'ビール（レストラン500ml）': '🍺', 'タバコ（マルボロ1箱）': '🚬', 'ミネラルウォーター（500ml）': '💧', 'ビッグマック（1個）': '🍔', 'ガソリン（1L）': '⛽', '外食（安めの店・1食）': '🍜', '電気・水道・ガス（月額）': '💡', '家賃（1LDK・首都圏市内）': '🏠', '平均月収（手取り）': '💴', 'Netflix（スタンダード）': '📺' };

  function formatValueWithCommas(val) {
    if (!val || val === 'データなし') return val;
    // 数値部分（カンマ・ドット含む）を抽出して、カンマを除去してから再フォーマット
    return val.replace(/[\d,\.]+/g, (m) => {
      const n = parseFloat(m.replace(/,/g, ''));
      return isNaN(n) ? m : n.toLocaleString();
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
          // 対象国側の通貨表示もカンマを入れる
          displayP = `${currencySymbol}${num.toLocaleString()} （${yen.toLocaleString()}円）`;
        }
      }

      // 日本側の価格もカンマを入れる
      const japanVal = formatValueWithCommas(d['日本'] || 'データなし');

      return [`${emoji} ${d['項目'] || ''}`, displayP, japanVal];
    });
    article += makeTable(['項目', countryLabel, japanLabel], bukkaRows, ['35%', '32%', '33%']);

    // 為替レートの注釈表示
    const rateMatch = raw.match(/為替レート[は：]([^\n]+)/);
    if (rateMatch) {
      const rateText = rateMatch[1].trim().replace('現在', '').replace(/^は/, '');
      article += `<p class="citation">※為替レートは${rateText}時点のレートを使用</p>\n`;
    }
    article += `<p class="citation">※アルコール禁止の国においては、ノンアルコールビールの価格を記載しています。<br>※Numbeoのデータは流動的であり、リサーチ時のタイミングにより変動する場合があります。</p>\n`;
    article += `<div style="height: 10px;"></div>\n`;
    article += `<p class="citation">出典：Numbeo / Netflix公式サイト</p>\n`;
  }

  const bukkaNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('⑤ 生活・価値')) && l.includes('🐱 エラーネコ：'));
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
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['概要'] || ''}</td>`;
      rekishiHtml += `</tr>`;
    });
    rekishiHtml += `</tbody></table>`;
    article += rekishiHtml;

  }

  // --- 12. ⑦ 直近の動向 ---
  article += `<h2 style="${h2Style}">⑦ 直近の動向</h2>\n`;
  const dohContent = extractTextBetween(raw, '<p>【政治経済社会】</p>', '🐱 エラーネコ：');
  if (dohContent) {
    article += `<p>【政治経済社会】</p>\n${dohContent}\n`;
    const dohCite = sheetData.data?.対象国データ_記事?.直近の動向?.出典 || '';
    if (dohCite) article += `<p class="citation">出典：${dohCite}</p>\n`;
  }

  const dohNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('⑦ 直近の動向')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(dohNeko);

  // --- 13. ⑧ 映像で知る${countryName} ---
  article += `<h2 style="${h2Style}">⑧ 映像で知る${countryName}</h2>\n`;
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

  const eizouNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('⑧ 映像で知る')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(eizouNeko);

  // --- 14. ⑨ 特別枠：${countryName}映画 歴代興行収入 ---
  article += `<h2 style="${h2Style}">⑨ 特別枠：${countryName}映画 歴代興行収入</h2>\n`;
  const kougyouData = parseLines(raw, '興行').filter(d => d['タイトル'] && d['タイトル'] !== '欠測');
  if (kougyouData.length > 0) {
    kougyouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      article += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#ff4500;"></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
    <span style="background:#ff4500;color:#fff;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">${d['順位'] || ''}</span>
    <span style="font-weight:800;font-size:16px;">${d['タイトル'] || ''}</span>
  </div>
  <div style="font-size:13px;color:#666;margin-bottom:12px;">📅 ${d['公開年'] || ''} &nbsp;|&nbsp; 👥 ${d['動員数'] || 'データなし'}</div>
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

  const kougyouNeko = rawLines.find((l, i) => i > rawLines.findIndex(lx => lx.includes('⑨ 特別枠')) && l.includes('🐱 エラーネコ：'));
  article += makeNekoBubble(kougyouNeko);

  // --- 15. ライブログ ---
  const logMatch = raw.match(/(### 【ライブ検索[\s\S]*$)/);
  if (logMatch) article += '\n' + logMatch[1];

  // --- 16. Deep-Dive ---
  const deepDiveMatch = raw.match(/<h2>Deep Dive<\/h2>([\s\S]*)/);
  if (deepDiveMatch) {
    const ddTitle = `<h2 style="${h2Style}">Deep Dive</h2>`;
    let ddBody = deepDiveMatch[1];
    const ddRows = [];
    const ddRegex = /<h3>(.*?)<\/h3>([\s\S]*?)(?=<h3|$)/g;
    let match;
    while ((match = ddRegex.exec(ddBody)) !== null) {
      const title = match[1].trim();
      const content = match[2].trim().replace(/\n/g, '<br>');
      ddRows.push([`💡 ${title}`, content]);
    }

    if (ddRows.length > 0) {
      article += '\n' + ddTitle + makeTable(['項目', '内容'], ddRows, ['30%', '70%']);
    }
  }

  return {
    json: {
      article: promptBody ? `${promptBody}\n\n${article}` : article,
      title: title,
      country: countryName,
      capital: capital
    }
  };
});

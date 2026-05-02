const promptBody = $input.first()?.json?.externalPrompt ?? "";

return $input.all().map(item => {
  const inputData = item.json;
  let raw = inputData?.article ?? "";
  
  // --- 1. 見出しの重複削除（AIが出したプレーンな見出しを消す） ---
  raw = raw.replace(/^[①-⑨] .*$/gm, '');

const countryName = $('国名変換Code').first().json.country || inputData.country || '対象国';

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

  // --- 3. 各セクションデータ抽出 ---
  const seidoItems = ['国家の形と統治機構','行政トップ','立法と選挙制度','司法と法制度','社会保障・医療・年金','教育制度','徴税・財政制度','安全保障と兵役','基本権と価値観'];
  const seidoData = seidoItems.map(item => {
    const line = raw.split('\n').find(l => l.startsWith(item + '｜'));
    if (!line) return { 項目: item, [countryName]: 'データなし', 日本: 'データなし' };
    const parts = line.replace(item + '｜', '').split('｜');
    const obj = { 項目: item };
    parts.forEach(p => { const idx = p.indexOf('：'); if (idx !== -1) obj[p.substring(0,idx).trim()] = p.substring(idx+1).trim(); });
    return obj;
  });

  const chiAnItems = ['殺人率（10万人あたり）','交通事故死亡率（10万人あたり）','自殺率（10万人あたり）','貧困率','ジニ係数','刑務所収容率','刑務所総収容者数','GPI（世界平和度指数）'];
  const chiAnData = chiAnItems.map(item => {
    const line = raw.split('\n').find(l => l.startsWith(item + '｜'));
    if (!line) return { 項目: item, [countryName]: 'データなし', 日本: 'データなし' };
    const parts = line.replace(item + '｜', '').split('｜');
    const obj = { 項目: item };
    parts.forEach(p => { const idx = p.indexOf('：'); if (idx !== -1) obj[p.substring(0,idx).trim()] = p.substring(idx+1).trim(); });
    return obj;
  });

  const econItems = ['総人口','GDP（名目・USドル）','一人当たりGDP','GDP成長率','政府債務残高（GDP比）','経常収支（GDP比）','インフレ率','失業率'];
  const econData = econItems.map(item => {
    const line = raw.split('\n').find(l => l.startsWith(item + '｜'));
    if (!line) return { 項目: item, [countryName]: 'データなし', 日本: 'データなし' };
    const parts = line.replace(item + '｜', '').split('｜');
    const obj = { 項目: item };
    parts.forEach(p => { const idx = p.indexOf('：'); if (idx !== -1) obj[p.substring(0,idx).trim()] = p.substring(idx+1).trim(); });
    return obj;
  });

  const geoItems = ['位置','面積','公用語','日本からの飛行距離','外務省危険レベル'];
  const geoData = geoItems.map(item => {
    const line = raw.split('\n').find(l => l.startsWith(item + '：'));
    const val = line ? line.replace(item + '：', '').trim() : 'データなし';
    return { 項目: item, 値: val };
  });

  const prisonData = parseLines(raw, '刑務所推移');
  const shiinData = parseLines(raw, '死因');
  const yushutsuData = parseLines(raw, '輸出');
  const yunyuData = parseLines(raw, '輸入');
  const boekiAiteData = parseLines(raw, '貿易相手');
  const bukkaData = parseLines(raw, '物価');
  const rekishiData = parseLines(raw, '歴史');
  const eizouData = parseLines(raw, '映像');
  const kougyouData = parseLines(raw, '興行');

  // --- 4. HTML生成ヘルパー ---
  const h2Style = `margin-top:60px;padding-top:20px;border-top:3px solid #00bcd4;font-size:16px;font-weight:900;color:#111;`;
  const h3Style = `font-size:14px;font-weight:800;color:#333;margin-top:30px;margin-bottom:10px;`;

  function makeTable(headers, rows, widths) {
    const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#e0f5f5,#f0f8f8);text-align:left;font-size:14px;${w ? 'width:'+w+';' : ''}`;
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

  // --- 5. テキスト抽出ヘルパー ---
  // startMarkerを含む行の次の行から、endMarkerを含む行の前までのテキストを抽出
  // パイプ区切り行・出典行を除く
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

  function formatValue(item, val) {
    if (!val || val === 'データなし') return val;
    if (val.includes('%')) return val;

    const numMatch = val.match(/([\d,]+\.?\d*)/);
    if (!numMatch) return val;
    let num = parseFloat(numMatch[1].replace(/,/g, ''));
    let rest = val.replace(numMatch[1], '').trim();

    // --- 1. GDP / 一人当たりGDP (USD系) ---
    if (item.includes('GDP') && !item.includes('成長率') && !item.includes('比')) {
      const unit = 'USD';
      const unitRest = rest.replace(/USドル|USD|ドル/g, '').trim();
      
      if (val.includes('億')) {
        if (num >= 10000) {
          const unitRestClean = unitRest.replace('億','').trim();
          return `${(num / 10000).toFixed(2)}兆${unit} ${unitRestClean}`.trim();
        }
        return `${num.toFixed(2).toLocaleString()}億${unit} ${unitRest.replace('億','')}`.trim();
      } else {
        if (num >= 10000) {
          return `${(num / 10000).toFixed(2)}万${unit} ${unitRest}`.trim();
        }
        return `${Math.round(num).toLocaleString()}${unit} ${unitRest}`.trim();
      }
    }

    // --- 2. 総人口 (人系) ---
    if (item.includes('人口')) {
      const unitRest = rest.replace(/万人|万|人/g, '').trim();
      if (val.includes('万')) {
        if (num >= 10000) {
          const oku = Math.floor(num / 10000);
          const man = Math.round(num % 10000);
          return `${oku}億${man.toLocaleString()}万人 ${unitRest}`.trim();
        }
        const roundedMan = Math.round(num * 10) / 10;
        return `${roundedMan.toLocaleString()}万人 ${unitRest}`.trim();
      } else {
        if (num >= 100000000) {
          const oku = Math.floor(num / 100000000);
          const man = Math.round((num % 100000000) / 10000);
          return `${oku}億${man.toLocaleString()}万人 ${unitRest}`.trim();
        } else if (num >= 10000) {
          return `${Math.round(num / 10000).toLocaleString()}万人 ${unitRest}`.trim();
        }
        return `${Math.round(num).toLocaleString()}人 ${unitRest}`.trim();
      }
    }
    return val;
  }

  let article = '';

  // --- 6. 導入文（「数字と事実」で終わる行まで） ---
  const rawLines = raw.split('\n');
  let introText = '';
  for (const l of rawLines) {
    introText += l + '\n';
    if (l.includes('数字と事実（Fact）から、国家の真実を紐解きます')) break;
  }
  article += introText + '\n';

  // --- 7. ① 制度の9つの皿 ---
  article += `<h2 style="${h2Style}">① 制度の9つの皿</h2>\n`;
  const seidoRows = seidoData.map(d => [d['項目'], d[countryName] || 'データなし', d['日本'] || 'データなし']);
  article += makeTable(['項目', countryName, '日本'], seidoRows, ['25%', '37%', '38%']);

  // 比較文：基本権と価値観パイプ行の後、位置：行の前
  const seidoCompText = extractTextBetween(raw, '基本権と価値観｜', '位置：');
  if (seidoCompText) article += `\n${seidoCompText}\n`;

  // --- 8. ② 地理と経済の衡量 ---
  article += `<h2 style="${h2Style}">② 地理と経済の衡量</h2>\n`;
  const geoRows = geoData.map(d => [d['項目'], d['値']]);
  article += makeTable(['項目', countryName], geoRows, ['30%', '70%']);

  const econRows = econData.map(d => {
    return [
      d['項目'], 
      formatValue(d['項目'], d[countryName] || 'データなし'), 
      formatValue(d['項目'], d['日本'] || 'データなし')
    ];
  });
  article += makeTable(['指標', countryName, '日本'], econRows, ['35%', '32%', '33%']);
  article += `<p class="citation">出典：World Bank / IMF（各値の年度は表内に記載）</p>\n`;

  // 経済トレンド：経常収支行の後、殺人率行の前
  const econTrendText = extractTextBetween(raw, '経常収支（GDP比）｜', '殺人率（10万人あたり）｜');
  if (econTrendText) article += `\n${econTrendText}\n`;

  // --- 9. ③ 治安と平和の衡量 ---
  article += `<h2 style="${h2Style}">③ 治安と平和の衡量</h2>\n`;
  article += `<h3 style="${h3Style}">治安指標</h3>\n`;
  const chiAnRows2 = chiAnData.map(d => [d['項目'], d[countryName] || 'データなし', d['日本'] || 'データなし']);
  article += makeTable(['項目', countryName, '日本'], chiAnRows2, ['35%', '32%', '33%']);

  const levelMatch = raw.match(/⚠️[^\n]+ニャ[^\n]*/);
  if (levelMatch) article += `<p>${levelMatch[0]}</p>\n`;

  // 刑務所グラフ
  article += `<h3 style="${h3Style}">刑務所収容者数の推移</h3>\n`;
  if (prisonData.length > 0) {
    const years = prisonData.map(d => d['年']).filter(Boolean);
    const targetNums = prisonData.map(d => {
      const key = Object.keys(d).find(k => k.includes('総収容者数') && !k.includes('日本'));
      const v = key ? d[key] : null;
      return v && v !== 'データなし' ? parseInt(v.replace(/,/g, '')) || null : null;
    });
    const japanNums = prisonData.map(d => {
      const v = d['日本総収容者数'];
      return v && v !== 'データなし' ? parseInt(v.replace(/,/g, '')) || null : null;
    });
    const chartId = 'prison' + Math.random().toString(36).slice(2, 8);
    article += `
<div style="position:relative;width:100%;height:300px;">
  <canvas id="${chartId}"></canvas>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"><\/script>
<script>
(function(){
  var ctx = document.getElementById('${chartId}');
  if(!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ${JSON.stringify(years)},
      datasets: [
        { label: '${countryName}', data: ${JSON.stringify(targetNums)}, borderColor: '#E24B4A', backgroundColor: 'rgba(226,75,74,0.08)', borderWidth: 2, pointRadius: 4, tension: 0.3, spanGaps: true },
        { label: '日本', data: ${JSON.stringify(japanNums)}, borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.08)', borderWidth: 2, pointRadius: 4, tension: 0.3, borderDash: [6,3], spanGaps: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: false, ticks: { callback: function(v){ return v.toLocaleString() + '人'; } } } }
    }
  });
})();
<\/script>
<p class="citation">出典：World Prison Brief</p>\n`;
  }

  // 死因比較表
  article += `<h3 style="${h3Style}">死因比較</h3>\n`;
  if (shiinData.length > 0) {
    const shiinRows = shiinData.map(d => [d['順位'] || '', d[countryName] || d['韓国'] || 'データなし', d['日本'] || 'データなし']);
    article += makeTable(['順位', countryName, '日本'], shiinRows, ['15%', '42%', '43%']);
    const shiinCite = raw.split('\n').find(l => l.startsWith('出典：') && l.includes('死亡原因'));
    article += `<p class="citation">${shiinCite || `出典：${countryName}統計 / 日本：厚生労働省 2025年人口動態統計`}</p>\n`;
  }

  // --- 10. ④ 貿易の衡量 ---
  article += `<h2 style="${h2Style}">④ 貿易の衡量</h2>\n`;
  if (yushutsuData.length > 0 && yunyuData.length > 0) {
    const maxLen = Math.max(yushutsuData.length, yunyuData.length);
    const boekiRows = Array.from({length: maxLen}, (_, i) => [
      (i + 1) + '位',
      yushutsuData[i] ? yushutsuData[i]['品目'] || '' : '',
      yunyuData[i] ? yunyuData[i]['品目'] || '' : ''
    ]);
    article += makeTable(['順位', '輸出品目', '輸入品目'], boekiRows, ['10%', '45%', '45%']);
    const boekiCite = raw.split('\n').find(l => l.startsWith('出典：') && (l.includes('関税') || l.includes('貿易') || l.includes('OEC')));
    if (boekiCite) article += `<p class="citation">${boekiCite}</p>\n`;
  }

  article += `<h3 style="${h3Style}">主要貿易相手国</h3>\n`;
  if (boekiAiteData.length > 0) {
    const aiteRows = boekiAiteData.map(d => {
      let share = d['シェア'] || 'データなし';
      // 0.184 のような小数を 18% に変換、または 18.4% を 18% に丸める
      let shareStr = share.toString();
      let num = parseFloat(shareStr.replace('%',''));
      if (!isNaN(num)) {
        if (num < 1 && !shareStr.includes('%')) num = num * 100;
        share = Math.round(num) + '%';
      }
      return [d['順位'] || '', d['国名'] || 'データなし', share];
    });
    article += makeTable(['順位', '国名', 'シェア'], aiteRows, ['10%', '60%', '30%']);
    const aiteCite = raw.split('\n').find(l => l.startsWith('出典：') && (l.includes('Trade') || l.includes('IMF')));
    article += `<p class="citation">${aiteCite || '出典：IMF Direction of Trade Statistics / Trade Map'}</p>\n`;
  }

  // 貿易解説：貿易相手10位行の後、物価行の前
  const boekiText = extractTextBetween(raw, '貿易相手｜順位：10位｜', '物価｜項目：');
  if (boekiText) article += `\n${boekiText}\n`;

// --- 11. ⑤ 物価比較 ---
article += `<h2 style="${h2Style}">⑤ 生活・価値の衡量（物価比較）</h2>\n`;
const bukkaEmoji = { 'ビール（市販500ml）':'🍺', 'タバコ（マルボロ1箱）':'🚬', 'ミネラルウォーター（500ml）':'💧', 'ビッグマック（1個）':'🍔', 'ガソリン（1L）':'⛽', '外食（安めの店・1食）':'🍜', '電気・水道・ガス（月額）':'💡', '家賃（1LDK・市内）':'🏠', '平均月収（手取り）':'💴', 'Netflix（スタンダード）':'📺' };
if (bukkaData.length > 0) {
  const bukkaRows = bukkaData.map(d => {
    const emoji = bukkaEmoji[d['項目']] || '';
    return [`${emoji} ${d['項目'] || ''}`, d[countryName] || d['韓国'] || 'データなし', d['日本'] || 'データなし'];
  });
  article += makeTable(['項目', countryLabel, japanLabel], bukkaRows, ['35%', '32%', '33%']);
  const rateMatch = raw.match(/為替レート：([^\n]+)/);
  if (rateMatch) {
    const rateText = rateMatch[1].trim().replace('現在', '');
    article += `<p class="citation">※為替レートは${rateText}時点のレートを使用</p>\n`;
  }
  article += `<p class="citation">※アルコール禁止の国においては、ノンアルコールビールの価格を記載しています。</p>\n`;
  article += `<div style="height: 10px;"></div>\n`;
  article += `<p class="citation">出典：Numbeo / Netflix公式サイト</p>\n`;
}

  // --- 12. ⑥ 歴史的背景 ---
  article += `<h2 style="${h2Style}">⑥ 歴史的背景（近代100年）</h2>\n`;
  if (rekishiData.length > 0) {
    const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;font-size:14px;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
    const thStyle = `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#e0f5f5,#f0f8f8);text-align:left;`;
    let rekishiHtml = `<table style="${tableStyle}"><thead><tr>`;
    rekishiHtml += `<th style="${thStyle}width:10%;">年</th><th style="${thStyle}width:25%;">事象名</th><th style="${thStyle}width:65%;">概要</th>`;
    rekishiHtml += `</tr></thead><tbody>`;
    rekishiData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? 'background:#fff3f3;' : '';
      rekishiHtml += `<tr style="${bg}">`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['年'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['事象名'] || ''}</td>`;
      rekishiHtml += `<td style="border:1px solid #eee;padding:12px 14px;">${d['概要'] || ''}</td>`;
      rekishiHtml += `</tr>`;
    });
    rekishiHtml += `</tbody></table>`;
    article += rekishiHtml;
    const rekishiCite = raw.split('\n').find(l => l.startsWith('出典：') && (l.includes('Wikipedia') || l.includes('政府')));
    if (rekishiCite) article += `<p class="citation">${rekishiCite}</p>\n`;
  }

  // --- 13. ⑦ 直近の動向 ---
  article += `<h2 style="${h2Style}">⑦ 直近の動向</h2>\n`;
  // <p>タグがある行を歴史行の後、映像行の前から抽出
  const dohStart = rawLines.findIndex(l => l.startsWith('<p>') && !l.includes('citation'));
  const dohEnd = rawLines.findIndex(l => l.startsWith('映像｜'));
  if (dohStart !== -1 && dohEnd !== -1 && dohStart < dohEnd) {
    article += rawLines.slice(dohStart, dohEnd).join('\n') + '\n';
    const dohCite = raw.split('\n').find(l => l.startsWith('出典：') && (l.includes('ロイター') || l.includes('BBC') || l.includes('メディア')));
    if (dohCite) article += `<p class="citation">${dohCite}</p>\n`;
  }

  // エラー猫
  const nekoMatch = raw.match(/🐱[^\n]+/);
  if (nekoMatch) article += `<p>${nekoMatch[0]}</p>\n`;

  // --- 14. ⑧ 映像作品カード ---
  article += `<h2 style="${h2Style}">⑧ 映像で知る${countryName}</h2>\n`;
  if (eizouData.length > 0) {
    eizouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      const cite = d['出典'] || '';
      const wikiUrl = d['wikipedia_url'] || (cite.includes('wikipedia.org') ? cite : '');
      const imdbUrl = d['imdb_url'] || (cite.includes('imdb.com') ? cite : '');
      const wikiBtn = wikiUrl && wikiUrl !== 'データなし' ? `<a href="${wikiUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#4CAF50;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;margin-right:6px;">Wiki</a>` : '';
      const imdbBtn = imdbUrl && imdbUrl !== 'データなし' ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#F5C518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;margin-right:6px;">IMDb</a>` : '';
      const citeHtml = cite ? `<div style="font-size:10px;color:#999;margin-top:8px;">出典：${cite.startsWith('http') ? `<a href="${cite}" target="_blank" style="color:#999;">${cite}</a>` : cite}</div>` : '';
      article += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
  <div style="font-weight:800;font-size:16px;color:#222;margin-bottom:6px;">${isSerious ? '⚠️ ' : ''}${d['タイトル'] || ''}</div>
  <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${d['種別'] || ''} &nbsp;•&nbsp; ${d['公開年'] || ''}</div>
  <div style="font-size:14px;color:#444;line-height:1.6;margin-bottom:12px;">${d['概要'] || ''}</div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;">
    <div>${wikiBtn}${imdbBtn}</div>
    ${citeHtml}
  </div>
</div>`;
    });
  }

  // --- 15. ⑨ 興行収入ランキングカード ---
  article += `<h2 style="${h2Style}">⑨ 特別枠：${countryName}映画 歴代ランキング</h2>\n`;
  if (kougyouData.length > 0) {
    kougyouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      const cite = d['出典'] || '';
      const wikiUrl = d['wikipedia_url'] || (cite.includes('wikipedia.org') ? cite : '');
      const imdbUrl = d['imdb_url'] || (cite.includes('imdb.com') ? cite : '');
      const genTitle = d['原題'] || d['タイトル'] || '';
      const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(genTitle + ' trailer')}`;
      const wikiBtn = wikiUrl && wikiUrl !== 'データなし' ? `<a href="${wikiUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#4CAF50;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;margin-right:6px;">Wiki</a>` : '';
      const imdbBtn = imdbUrl && imdbUrl !== 'データなし' ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#F5C518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;margin-right:6px;">IMDb</a>` : '';
      const ytBtn = `<a href="${ytUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;margin-right:6px;">▶ Trailer</a>`;
      const citeHtml = cite ? `<div style="font-size:10px;color:#999;margin-top:8px;">出典：${cite.startsWith('http') ? `<a href="${cite}" target="_blank" style="color:#999;">${cite}</a>` : cite}</div>` : '';
      article += `
<div style="background:${bg};border:1px solid #eee;border-radius:12px;padding:16px;margin:15px 0;box-shadow:0 4px 12px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#ff4500;"></div>
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
    <span style="background:#ff4500;color:#fff;border-radius:6px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">${d['順位'] || ''}</span>
    <span style="font-weight:800;font-size:16px;">${d['タイトル'] || ''}</span>
  </div>
  <div style="font-size:13px;color:#666;margin-bottom:12px;">📅 ${d['公開年'] || ''} &nbsp;|&nbsp; 👥 ${d['動員数'] || 'データなし'}</div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;">
    <div>${wikiBtn}${imdbBtn}${ytBtn}</div>
    ${citeHtml}
  </div>
</div>`;
    });
  }

  // --- 16. ライブログ ---
  const logMatch = raw.match(/(### 【ライブ検索[\s\S]*$)/);
  if (logMatch) article += '\n' + logMatch[1];

  // --- 16.5. Deep-Dive ---
const deepDiveMatch = raw.match(/<h2>Deep Dive<\/h2>([\s\S]*)/);
if (deepDiveMatch) {
  const ddTitle = `<h2 style="${h2Style}">Deep Dive</h2>`;
  let ddBody = deepDiveMatch[1];
  // 小見出し（h2, h3）を太字の段落に変換してサイズを抑える
  ddBody = ddBody.replace(/<(h[23])>(.*?)<\/\1>/g, '<p style="font-weight:bold; margin-top:20px; margin-bottom:5px;">$2</p>');
  article += '\n' + ddTitle + ddBody;
}

// --- 17. 最終出力 ---
  return {
    json: {
      article: promptBody ? `${promptBody}\n\n${article}` : article,
      title: title,
      country: countryName,
      capital: capital,
      japanCapital: japanCapital,
      countryLabel: countryLabel,
      japanLabel: japanLabel,
      processedAt: new Date().toISOString()
    }
  };
});

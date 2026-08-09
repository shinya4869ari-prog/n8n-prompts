const promptBody = $input.first()?.json?.externalPrompt ?? "";

const allItems = $input.all();
const mainItem = allItems.find(i => i.json?.article != null);
const deepDiveItem = allItems.find(i => i.json?.deepDiveArticle != null);
const articleItem = mainItem || allItems[0];
return [articleItem].map(item => {
  const inputData = item.json;
  const sheetData = $('整形ノード1').first().json;
  const moviesData = [];
  let raw = inputData?.article ?? inputData?.output ?? "";
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
  const h2Style = `margin-top:60px;padding:14px 20px;background:var(--color-background-secondary,#f5f5f5);border:0.5px solid #e0e0e0;border-left:3px solid #00bcd4;border-radius:8px;font-size:16px;font-weight:500;color:#111;`;
  const h3Style = `font-size:14px;font-weight:500;color:#e67e22;margin-top:30px;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #e67e22;display:inline-block;`;
  const h3NewsStyle = `font-size:14px;font-weight:500;color:#6f42c1;margin-top:30px;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #6f42c1;display:inline-block;`;
  const h3NewsBadge = `<span style="background:#6f42c1;color:#fff;border-radius:4px;padding:2px 8px;font-size:10px;margin-right:8px;vertical-align:middle;font-weight:bold;">Perplexity</span>`;
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

  function cleanMarkdown(text) {
    if (!text) return '';
    return text
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (trimmed === '') return true;
        if (/^#+\s*$/.test(trimmed)) return false;
        if (/^[-\u2014\u2015=*_\s]+$/.test(trimmed)) return false;
        if (/^#*\s*(🐱\s*)?エラーネコ/.test(trimmed)) return false;
        if (/^#*\s*出典\s*$/.test(trimmed)) return false;
        return true;
      })
      .join('\n')
      .trim();
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
    const citeMatch = text.match(/\n出典\s*[:：]\s*([\s\S]*)$/i);
    const mainText = cleanMarkdown(citeMatch ? text.replace(citeMatch[0], '') : text);
    const citeText = cleanMarkdown(citeMatch ? citeMatch[1] : '')
      .replace(/https?:\/\/([^\/\s]+)[^\s]*/g, 'https://$1');
    
    const formatted = mainText
      .replace(/^##\s*\[貿易解説\][：:]?\s*/gm, '')
      .replace(/^##\s*\[死因解説\][：:]?\s*/gm, '')
      .replace(/^##\s*\[犯罪解説\][：:]?\s*/gm, '')
      .replace(/\n—+\n/g, '\n')
      .replace(/\n-{3,}\n/g, '\n')
      .replace(/\n##\s*\n/g, '\n')
      .replace(/^—+$/gm, '')
      .replace(/^##\s*$/gm, '')
      .replace(/^：(.+)$/gm, '<p style="font-size:15px;font-weight:700;color:#555;margin:0 0 16px;padding:8px 12px;background:#f0f7f7;border-radius:6px;">$1</p>')
      .replace(/^### (.+)$/gm, '<h4 style="font-size:14px;font-weight:900;color:#333;margin:20px 0 6px;padding-left:10px;border-left:3px solid #b2ebf2;">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;font-weight:900;color:#e67e22;margin:24px 0 8px;border-left:4px solid #e67e22;padding-left:10px;">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/<br>—+<br>/g, '<br>')
      .replace(/<br>##\s*<br>/g, '<br>');
    
    return { formatted, citeText };
  };

  // --- データ事前抽出（ヘッダーで使用するため） ---
  const geoItems = ['位置', '面積', '公用語', '日本からの飛行距離'];
  const geoData = geoItems.map(item => {
    const line = rawLines.find(l => l.startsWith(item + '：'));
    let val = line ? line.replace(item + '：', '').trim() : 'データなし';
    if (item === '面積') {
      if (val.includes('データなし') || val === 'データなし') {
        const areaRaw = sheetData.data?.対象国データ?.地理?.面積_km2;
        if (areaRaw && areaRaw !== 'データなし') {
          const areaNum = parseFloat(String(areaRaw).replace(/,/g, ''));
          if (!isNaN(areaNum)) {
            const ratio = areaNum / 377900;
            const ratioStr = ratio < 0.1 ? ratio.toFixed(2) : ratio.toFixed(1);
            if (val === 'データなし') {
              val = `${areaNum.toLocaleString()}km²（日本の面積の約${ratioStr}倍）`;
            } else {
              val = val.replace('データなし', ratioStr);
            }
          }
        }
      }
    }
    return { 項目: item, 値: val };
  });

  let boekiKaisetu = '';
  let shiinKaisetu = '';
  let hanzaiKaisetu = '';
  let chirigeiKaisetu = '';
  let bukkaKaisetu = '';
  try {
    const aiText = $('検索結果まとめ記事').first().json?.text || $('検索結果まとめ記事').first().json?.content?.parts?.[0]?.text || $('検索結果まとめ記事').first().json?.output || '';
    const boekiMatch = aiText.match(/(?:\[貿易解説\]|##\s*貿易解説)([\s\S]*?)(?=(?:\[|##\s*)(?:死因解説|犯罪解説|地理・経済解説|物価解説)|$)/);
    const shiinMatch = aiText.match(/(?:\[死因解説\]|##\s*死因解説)([\s\S]*?)(?=(?:\[|##\s*)(?:犯罪解説|地理・経済解説|物価解説)|$)/);
    const hanzaiMatch = aiText.match(/(?:\[犯罪解説\]|##\s*犯罪解説)([\s\S]*?)(?=(?:\[|##\s*)(?:地理・経済解説|物価解説)|$)/);
    const chirigeiMatch = aiText.match(/(?:\[地理・経済解説\]|##\s*地理・経済解説)([\s\S]*?)(?=(?:\[|##\s*)物価解説|$)/);
    const bukkaMatch = aiText.match(/(?:\[物価解説\]|##\s*物価解説)([\s\S]*?)$/);
    boekiKaisetu = boekiMatch ? boekiMatch[1].trim() : '';
    shiinKaisetu = shiinMatch ? shiinMatch[1].trim() : '';
    hanzaiKaisetu = hanzaiMatch ? hanzaiMatch[1].trim() : '';
    chirigeiKaisetu = chirigeiMatch ? chirigeiMatch[1].trim() : '';
    bukkaKaisetu = bukkaMatch ? bukkaMatch[1].trim() : '';
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
<style>
  .entry-title, .post-title, .page-title { display: none !important; }
</style>
<div id="top" style="background:${headerBg}; border:1px solid #eee; border-left:8px solid ${statusColor}; border-radius:12px; padding:24px; margin-bottom:35px; box-shadow:0 4px 15px rgba(0,0,0,0.06); position:relative; overflow:hidden;">
  <div style="position:absolute; top:-20px; right:-20px; font-size:100px; color:${statusColor}; opacity:0.05; transform:rotate(-15deg); font-weight:bold; z-index:0;">FACT</div>
  <div style="display:flex; justify-content:space-between; align-items:flex-start; position:relative; z-index:1;">
    <div>
      <div style="font-size:12px; color:${statusColor}; font-weight:bold; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">National Profile</div>
      <h1 style="margin:0; font-size:28px; font-weight:900; color:#111; letter-spacing:-0.5px;">${countryName}</h1>
      <div style="margin:8px 0 0; font-size:14px; color:#555; display:flex; gap:12px; align-items:center;">
        <span style="white-space: nowrap;">📍 ${capital || '首都不明'}</span>
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

  article += `
<div style="background:#f9fafa;border:1px solid #e0eeee;border-radius:12px;padding:20px 24px;margin:30px 0;">
  <div style="font-size:13px;font-weight:700;color:#00bcd4;margin-bottom:12px;">📋 目次</div>
  <ol style="margin:0;padding-left:20px;line-height:2.2;font-size:14px;">
    <li><a href="#section-1" style="color:#333;text-decoration:none;">制度の9つの皿</a></li>
    <li><a href="#section-2" style="color:#333;text-decoration:none;">地理と経済の衡量</a></li>
    <li><a href="#section-3" style="color:#333;text-decoration:none;">治安と平和の衡量</a></li>
    <li><a href="#section-4" style="color:#333;text-decoration:none;">貿易の衡量</a></li>
    <li><a href="#section-5" style="color:#333;text-decoration:none;">生活・価値の衡量（物価比較）</a></li>
    <li><a href="#section-6" style="color:#333;text-decoration:none;">歴史的背景</a></li>
    <li><a href="#section-7" style="color:#333;text-decoration:none;">直近の動向</a></li>
    <li><a href="#section-8" style="color:#333;text-decoration:none;">映像で知る${countryName}</a></li>
    <li><a href="#section-9" style="color:#333;text-decoration:none;">おすすめ映画・映像作品</a></li>
    <li><a href="#deep-dive" style="color:#333;text-decoration:none;">✦ Deep Dive</a></li>
  </ol>
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
        if (!cleanP || cleanP.toUpperCase().includes('FACT') || cleanP.startsWith('①') || cleanP.includes('｜')) return '';
        return `<p style="font-size:15px; line-height:2.0; color:#333; margin:18px 0; text-align:justify; text-justify:inter-ideograph;">${cleanP.split('\n').join('<br>')}</p>`;
      })
      .filter(Boolean)
      .join('\n');
    article += introHtml + '\n';
  }

  // --- 6. ① 制度の9つの皿 ---
  article += `<!-- SECTION:seido:START -->\n`;
  article += `<h2 id="section-1" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">①</span> 制度の9つの皿</h2>\n`;
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

  const seidoExplanation = cleanMarkdown(extractTextBetween(raw, '基本権と価値観｜', '🐱 エラーネコ：'));
  if (seidoExplanation) article += `\n${seidoExplanation}\n`;

  const spotlight = sheetData.data?.対象国データ?.制度の9つの皿?.制度スポットライト || null;

  // 整形ノード1経由で取得
  const spotlightData = $('整形ノード1').first().json?.data?.対象国データ?.制度の9つの皿?.制度スポットライト || null;

  if (spotlightData?.記事) {
    article += `<h3 style="font-size:14px;font-weight:500;color:#e67e22;margin-top:30px;margin-bottom:10px;padding-bottom:6px;border-bottom:1.5px solid #e67e22;display:inline-block;">📌 制度スポットライト：${spotlightData.選定項目 || ''}</h3>\n`;
    const _sentences = spotlightData.記事.split('。').map(s => s.trim()).filter(Boolean).map(s => s + '。');
    const _paras = [];
    for (let i = 0; i < _sentences.length; i += 2) {
      _paras.push(_sentences.slice(i, i + 2).join(''));
    }
    const spotlightText = _paras
      .map(p => `<p style="font-size:14px;line-height:1.9;color:#333;margin:0 0 14px;">${p}</p>`)
      .join('');
    article += `<div style="margin:20px 0;padding:16px;background:var(--color-background-secondary,#f5f5f5);border-left:3px solid #00bcd4;border-radius:0 8px 8px 0;">${spotlightText}</div>\n`;
  }

  const seidoNeko = getNekoBubbleForSection('①');
  article += makeNekoBubble(seidoNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:seido:END -->\n`;

  // --- 7. ② 地理と経済の衡量 ---
  article += `<!-- SECTION:chiri_keizai:START -->\n`;
  article += `<h2 id="section-2" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">②</span> 地理と経済の衡量</h2>\n`;
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

  const econExplanation = cleanMarkdown(extractTextBetween(raw, '出典：World Bank', '🐱 エラーネコ：'));
  if (econExplanation) article += `\n${econExplanation}\n`;
  // ② エラー猫の直前
  if (chirigeiKaisetu) {
    const { formatted, citeText } = formatKaisetu(chirigeiKaisetu);
    article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 地理・経済トピック</h3>\n`;
    article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
    if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
  }

  const econNeko = getNekoBubbleForSection('②');
  article += makeNekoBubble(econNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:chiri_keizai:END -->\n`;

  // --- 8. ③ 治安と平和の衡量 ---
  article += `<!-- SECTION:chian:START -->\n`;
  article += `<h2 id="section-3" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">③</span> 治安と平和の衡量</h2>\n`;
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
    const formatSource = (val) => {
      const main = val.replace(/\s*[（(].*$/, '');
      const source = val.match(/\s*([（(].*)$/);
      return `<span style="font-weight:900; font-size:15px;">${main}</span>` + (source ? `<br><span style="font-size:11.5px; color:#888; font-weight:normal; line-height:1.4; display:inline-block; margin-top:2px;">${source[1]}</span>` : '');
    };
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
  const crimeFeature = cleanMarkdown(extractTextBetween(raw, '犯罪の傾向', '重大犯罪｜'));
  if (crimeFeature) {
    article += `\n${crimeFeature}\n`;
  } else {
    const fallbackCrimeFeature = cleanMarkdown(extractTextBetween(raw, '犯罪の傾向', '死因｜順位：1位'));
    if (fallbackCrimeFeature) article += `\n${fallbackCrimeFeature}\n`;
  }

  // 重大犯罪事件テーブル
  const majorCrimeData = parseLines(raw, '重大犯罪');
  if (majorCrimeData.length > 0) {
    article += `<h3 style="${h3Style}">国内の重大犯罪事件（2000年以降）</h3>\n`;
    const majorCrimeRows = majorCrimeData.map(d => [
      d['発生年'] || '不明',
      `<strong>${d['事件名'] || '不明'}</strong>${d['犯人名'] ? '<br>犯人：<span class="no-link">' + d['犯人名'] + '</span>' : ''}`,
      d['被害者属性'] || '不明',
      (d['概要'] || '') + (d['出典'] ? '<br><span style="font-size:11px;color:#aaa;">出典：' + d['出典'] + '</span>' : '')
    ]);
    article += makeTable(['発生年', '事件名', '被害者属性', '概要'], majorCrimeRows, ['10%', '25%', '20%', '45%']);
  }

  article += `<div style="border-top:1px solid #b2ebf2;margin:30px 0;"></div>\n`;

  if (hanzaiKaisetu) {
    article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 最新情報：犯罪傾向</h3>\n`;
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
      article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 最新情報：死因・健康統計</h3>\n`;
      const { formatted, citeText } = formatKaisetu(shiinKaisetu);
      article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
      if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
    }
  }

  const chianNeko = getNekoBubbleForSection('③');
  article += makeNekoBubble(chianNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:chian:END -->\n`;

  // --- 9. ④ 貿易の衡量 ---
  article += `<!-- SECTION:boeki:START -->\n`;
  article += `<h2 id="section-4" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">④</span> 貿易の衡量</h2>\n`;
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
    article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 最新情報：貿易動向</h3>\n`;
    const { formatted, citeText } = formatKaisetu(boekiKaisetu);
    article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
    if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
  }

  const boekiNeko = getNekoBubbleForSection('④');
  article += makeNekoBubble(boekiNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:boeki:END -->\n`;

  // --- 10. ⑤ 生活・価値の衡量（物価比較） ---
  article += `<!-- SECTION:bukka:START -->\n`;
  article += `<h2 id="section-5" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑤</span> 生活・価値の衡量（物価比較）</h2>\n`;

  // 為替レートをsheetData（整形ノード1）から直接取得、なければ国名変換Codeの値を使用
  const sheetRate = parseFloat(sheetData.data?.固定データ?.物価?.為替レート) || 0;
  let currentRate = sheetRate > 1 ? sheetRate : rate;
  if (currentRate <= 1) {
    const rateTextMatch = raw.match(/為替レート[は：]\s*1\s*[A-Z]+\s*[（(].*?[)）]\s*=\s*([\d\.]+)\s*JPY/i);
    if (rateTextMatch) currentRate = parseFloat(rateTextMatch[1]);
  }

  const bukkaData = parseLines(raw, '物価');
  const bukkaEmoji = { 'ビール（レストラン500ml）': '🍺', 'タバコ（マルボロ1箱）': '🚬', 'ミネラルウォーター（500ml）': '💧', 'ビッグマック（1個）': '🍔', 'ガソリン（1L）': '⛽', '外食（安めの店・1食）': '🍜', '電気・水道・ガス（月額）': '💡', '家賃1LDK(市中心)': '🏠', '平均月収（手取り）': '💴', 'Netflix（スタンダード）': '📺' };

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
      // 項目名の表記ゆれを正規化（絵文字除去と代表キーワードによるマッピング）
      let itemName = d['項目'] || '';
      // 絵文字を除去
      itemName = itemName.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, '').trim();
      
      const canonicalItems = {
        'ビール': 'ビール（レストラン500ml）',
        'タバコ': 'タバコ（マルボロ1箱）',
        'ミネラルウォーター': 'ミネラルウォーター（500ml）',
        'ビッグマック': 'ビッグマック（1個）',
        'ガソリン': 'ガソリン（1L）',
        '外食': '外食（安めの店・1食）',
        '電気': '電気・水道・ガス（月額）',
        '光熱費': '電気・水道・ガス（月額）',
        'ガス': '電気・水道・ガス（月額）',
        '家賃': '家賃1LDK(市中心)',
        '賃': '家賃1LDK(市中心)',
        '月収': '平均月収（手取り）',
        'Netflix': 'Netflix（スタンダード）'
      };

      let matched = false;
      for (const [key, canonical] of Object.entries(canonicalItems)) {
        if (itemName.includes(key)) {
          d['項目'] = canonical;
          matched = true;
          break;
        }
      }

      if (!matched && itemName.includes('水') && !itemName.includes('水道')) {
        d['項目'] = 'ミネラルウォーター（500ml）';
      }

      const emoji = bukkaEmoji[d['項目']] || '';
      let rawVal = d[countryName] || d['対象国'] || 'データなし';

      // 対象国の価格データが欠測・データなしの場合、スプレッドシートデータから直接補完するフォールバック
      if (String(rawVal).includes('データなし') || String(rawVal).includes('欠測')) {
        const itemKeyMap = {
          'ビール（レストラン500ml）': 'ビール',
          'タバコ（マルボロ1箱）': 'タバコ',
          'ミネラルウォーター（500ml）': '水',
          'ビッグマック（1個）': 'ビッグマック',
          'ガソリン（1L）': 'ガソリン',
          '外食（安めの店・1食）': '外食',
          '電気・水道・ガス（月額）': '光熱費',
          '家賃1LDK(市中心)': '家賃',
          '平均月収（手取り）': '月収',
          'Netflix（スタンダード）': 'Netflix'
        };
        const sheetItemKey = itemKeyMap[d['項目']];
        if (sheetItemKey) {
          const sheetItem = sheetData.data?.固定データ?.物価?.[sheetItemKey];
          if (sheetItem && sheetItem.現地通貨 && String(sheetItem.現地通貨) !== 'データなし' && !String(sheetItem.現地通貨).includes('欠測')) {
            rawVal = String(sheetItem.現地通貨);
          }
        }
      }

      let displayP = rawVal;

      // ビールが欠測の場合、スプレッドシートの出典（アルコール禁止のため 等）を値として表示する。なければデフォルトで「アルコール禁止のため」とする
      if (d['項目'].includes('ビール') && (String(rawVal).includes('欠測') || String(rawVal).includes('データなし'))) {
        const beerCite = sheetData.data?.固定データ?.物価?.ビール?.出典 || '';
        if (beerCite && (String(beerCite).includes('禁止') || String(beerCite).includes('未進出') || String(beerCite).includes('prohibited') || String(beerCite).includes('banned') || String(beerCite).includes('illegal') || String(beerCite).includes('no alcohol') || String(beerCite).includes('販売なし') || String(beerCite).includes('販売禁止') || String(beerCite).includes('法律'))) {
          displayP = String(beerCite);
        } else {
          displayP = 'アルコール禁止';
        }
      }

      // ビッグマックが欠測の場合、スプレッドシートの出典（マクドナルド未進出のため 等）を値として表示する
      if (d['項目'].includes('ビッグマック') && (String(rawVal).includes('欠測') || String(rawVal).includes('データなし'))) {
        const bmCite = sheetData.data?.固定データ?.物価?.ビッグマック?.出典 || '';
        if (bmCite && (String(bmCite).includes('未進出') || String(bmCite).includes('店舗なし') || String(bmCite).includes('not present') || String(bmCite).includes('not officially') || String(bmCite).includes('no store') || String(bmCite).includes('not in') || String(bmCite).includes('店舗なし'))) {
          displayP = String(bmCite);
        }
      }

      // Netflixの表示処理（USD/EUR請求の場合の金額・通貨表記ブレを補正）
      let isNetflixHandled = false;
      if (d['項目'].includes('Netflix')) {
        const netflixItem = sheetData.data?.固定データ?.物価?.Netflix;
        if (netflixItem && netflixItem.現地通貨 && String(netflixItem.現地通貨) !== 'データなし') {
          const localVal = String(netflixItem.現地通貨).trim();
          const yenVal = netflixItem.円換算 ? Math.round(parseFloat(String(netflixItem.円換算))) : null;
          
          let displayLocal = localVal;
          if (!localVal.startsWith('$') && !localVal.startsWith('€') && !localVal.startsWith('£') && currencySymbol) {
            displayLocal = currencySymbol + localVal;
          }
          
          if (yenVal) {
            displayP = `<span style="font-weight:900; font-size:15px;">${displayLocal}</span> <span style="font-size:12px; color:#666;">（${yenVal.toLocaleString()}円）</span>`;
          } else {
            displayP = `<span style="font-weight:900; font-size:15px;">${displayLocal}</span>`;
          }
          isNetflixHandled = true;
        }
      }

      if (!isNetflixHandled) {
        // データのクリーンアップ：「データなし（〜円）」や「欠測（〜円）」などのノイズを排除して単一表記に統一
        if (String(displayP).includes('データなし')) {
          displayP = 'データなし';
        } else if (String(displayP).includes('欠測') && !d['項目'].includes('ビール')) {
          displayP = '欠測';
        }

        const isReason = String(displayP).includes('禁止') || String(displayP).includes('未進出') || String(displayP).includes('店舗なし') || String(displayP).includes('not') || String(displayP).includes('ban') || String(displayP).includes('illegal') || String(displayP).includes('no ') || String(displayP).includes('法律') || String(displayP).includes('販売なし');
        if (displayP !== 'データなし' && displayP !== '欠測' && !isReason) {
          // 数字部分（カンマ含む）を抽出。Nu. のようなピリオド付き通貨記号のピリオドを誤認しないよう、必ず数字からマッチさせる
          const numMatch = String(displayP).match(/\d[\d,\.]*/);
          if (numMatch) {
            const num = parseFloat(numMatch[0].replace(/,/g, ''));
            const yen = Math.round(num * currentRate);
            // 対象国側の通貨表示もカンマを入れ、メインの数字を太字化
            displayP = `<span style="font-weight:900; font-size:15px;">${currencySymbol}${num.toLocaleString()}</span> <span style="font-size:12px; color:#666;">（${yen.toLocaleString()}円）</span>`;
          }
        }
      }

      // 日本側の価格もカンマを入れる（欠測・データなしの場合はスプレッドシートから補完）
      let japanVal = d['日本'] || 'データなし';
      if (japanVal === 'データなし' || String(japanVal).includes('欠測')) {
        const sheetItemKey = {
          'ビール（レストラン500ml）': 'ビール（レストラン500ml）',
          'タバコ（マルボロ1箱）': 'タバコ（マルボロ1箱20本）',
          'ミネラルウォーター（500ml）': 'ミネラルウォーター（500ml）',
          'ビッグマック（1個）': 'ビッグマック（1個）',
          'ガソリン（1L）': 'ガソリン（1L）',
          '外食（安めの店・1食）': '外食（安めの店・1食）',
          '電気・水道・ガス（月額）': '電気・水道・ガス（月額・85㎡）',
          '家賃1LDK(市中心)': '家賃1LDK(市中心)',
          '平均月収（手取り）': '平均月収（手取り）',
          'Netflix（スタンダード）': 'Netflix（スタンダード・広告なし）'
        }[d['項目']];
        if (sheetItemKey) {
          const jSheetItem = sheetData.data?.日本固定データ?.物価?.[sheetItemKey];
          if (jSheetItem && jSheetItem['値（円）'] && String(jSheetItem['値（円）']) !== 'データなし') {
            japanVal = String(jSheetItem['値（円）']);
          }
        }
      }
      japanVal = formatValueWithCommas(String(japanVal));

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
    article += `<p class="citation" style="${citationStyle}">※Numbeoのデータは流動的であり、リサーチ時のタイミングにより変動する場合があります。</p>\n`;
    article += `<div style="height: 10px;"></div>\n`;
    const bukkaCites = [...new Set(bukkaData.map(d => d['出典']).filter(Boolean))];
    const netflixSheetCite = sheetData.data?.固定データ?.物価?.Netflix_出典 || 'Netflix公式サイト';
    const numbeoBase = 'Numbeo';
    const bukkaOuten = bukkaCites.length > 0 ? bukkaCites.join(' / ') : `${numbeoBase} / ${netflixSheetCite}`;
    article += `<p class="citation" style="${citationStyle}">出典：${bukkaOuten}</p>\n`;
  }

  // ⑤ エラー猫の直前
  if (bukkaKaisetu) {
    const { formatted, citeText } = formatKaisetu(bukkaKaisetu);
    article += `<h3 style="${h3NewsStyle}">${h3NewsBadge} 物価・生活コストトピック</h3>\n`;
    article += `<div style="font-size:14px;line-height:1.9;color:#333;margin:20px 0;">${formatted}</div>\n`;
    if (citeText) article += `<p class="citation" style="${citationStyle}">出典：${citeText.replace(/\n/g,'<br>')}</p>\n`;
  }

  const bukkaNeko = getNekoBubbleForSection('⑤');
  article += makeNekoBubble(bukkaNeko);
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:bukka:END -->\n`;

  // --- 11. ⑥ 歴史的背景 ---
  article += `<!-- SECTION:rekishi:START -->\n`;
  article += `<h2 id="section-6" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑥</span> 歴史的背景（近代100年）</h2>\n`;
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
<div style="text-align:right;margin:10px 0 30px;">
  <a href="#deep-dive" style="display:inline-block;padding:6px 16px;background:rgba(26,35,126,0.35);color:#fff;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;opacity:0.6;">
    ✦ Deep Dive で深掘りする
  </a>
</div>\n`;
    article += `<!-- SECTION:rekishi:END -->\n`;
  } else {
    article += `<!-- SECTION:rekishi:END -->\n`;
  }

  // --- 12. ⑦ 直近の動向 ---
  article += `<!-- SECTION:doukou:START -->\n`;
  article += `<h2 id="section-7" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑦</span> 直近の動向</h2>\n`;
  const dohContent = cleanMarkdown(extractTextBetween(raw, '<p>【政治経済社会】</p>', '🐱 エラーネコ：'));
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
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `<!-- SECTION:doukou:END -->\n`;

  // --- 13. ⑧ 映像で知る${countryName} ---
  article += `<!-- SECTION:eizou:START -->\n`;
  article += `<h2 id="section-8" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑧</span> 映像で知る${countryName}</h2>\n`;
  const eizouData = parseLines(raw, '映像');
  if (eizouData.length > 0) {
    const eizouData2 = sheetData.data?.対象国データ_記事?.映像作品 || [];
    eizouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      const cleanTitle = (d['タイトル'] || '').replace(/<[^>]+>/g, '').trim();
      const apiData = eizouData2.find(api => 
        (api['タイトル_日本語'] && (String(api['タイトル_日本語']) === cleanTitle || String(api['タイトル_日本語']).includes(cleanTitle) || cleanTitle.includes(String(api['タイトル_日本語'])))) || 
        (api['原題'] && (String(api['原題']) === cleanTitle || String(api['原題']).includes(cleanTitle) || cleanTitle.includes(String(api['原題']))))
      ) || {};
      const titleJa = d['タイトル'] || apiData['タイトル_日本語'] || apiData['title'] || '';
      const titleOrig = (d['原題'] || apiData['原題'] || apiData['origin_title'] || '');
      const origTitleSpan = (titleOrig && titleOrig !== titleJa) ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${titleOrig})</span>` : '';

      const director = d['director'] && d['director'] !== '空白' && d['director'] !== '-' ? d['director'] : (apiData['director'] || '');
      const cast = d['cast'] && d['cast'] !== '空白' && d['cast'] !== '-' ? d['cast'] : (apiData['cast'] || '');
      const type = d['種別'] || apiData['genres'] || '';
      const year = d['公開年'] || apiData['公開年'] || apiData['year'] || '';

      const directorStr = director ? ` &nbsp;•&nbsp; 監督：<span class="no-link">${director}</span>` : '';
      const castHtml = cast ? `<div style="font-size:12px;color:#666;margin-bottom:10px;line-height:1.5;">👥 キャスト：<span class="no-link">${cast}</span></div>` : '';
      const posterPath = apiData['poster_path'] || apiData['poster_url'];
      let posterUrl = '';
      if (posterPath) {
        if (String(posterPath).startsWith('http')) {
          posterUrl = posterPath;
        } else {
          const prefix = posterPath.startsWith('/') ? '' : '/';
          posterUrl = `https://image.tmdb.org/t/p/w200${prefix}${posterPath}`;
        }
      }
      const movieInfo = (
        apiData?.概要 || 
        moviesData.find(m => m.name && (m.name === cleanTitle || m.name.includes(cleanTitle) || cleanTitle.includes(m.name)))?.info || 
        ''
      ).replace(/\"/g, '&quot;').replace(/'/g, '&#39;');

      const imdbId = apiData?.imdb_id || (d['imdb_url'] ? d['imdb_url'].replace(/.*\/title\//, '').replace(/\/.*/, '') : null);
      const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : ((titleOrig || titleJa) ? `https://www.imdb.com/find/?q=${encodeURIComponent(titleOrig || titleJa)}` : '');
      const imdbBtn = imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

      const linkHtml = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(titleJa + ' trailer')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>
        ${imdbBtn}
      </div>`;

      const posterHtml = posterUrl
        ? `<div style="flex-shrink:0;margin-left:12px;"><img src="${posterUrl}" alt="${titleJa}" style="width:90px;max-height:135px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>`
        : '';

      article += `
<div style="background:${bg};border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.06);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#20B2AA;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="font-weight:800;font-size:17px;color:#111;margin-bottom:8px;">${isSerious ? '⚠️ ' : ''}${titleJa} ${origTitleSpan}</div>
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${type}${(type && year) ? ' &nbsp;•&nbsp; ' : ''}${year}${directorStr}</div>
      ${castHtml}
      ${movieInfo ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:14px;letter-spacing:0.02em;">${movieInfo}</div>` : ''}
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
  article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  article += `\n<!-- SECTION:eizou:END -->\n\n`;

  // --- 14. Deep-Dive ---
  let deepDiveArticle = '';
  try { deepDiveArticle = (deepDiveItem || articleItem).json?.deepDiveArticle || ''; } catch(e) {}
  console.log('deepDiveArticle length:', deepDiveArticle.length);

  if (deepDiveArticle) {
    article += `<!-- SECTION:deep_dive:START -->\n`;
    // --- Deep Dive セクション仕切り ---
    article += `
<div id="deep-dive" style="border-top:4px solid #1a237e; margin:80px 0 40px; padding-top:40px;">
  <div style="display:inline-block; background:#1a237e; color:#fff; padding:5px 18px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;">✦ Deep Dive</div>
</div>\n`;

    // 本文中に残っている丸括弧で囲まれたマークダウンリンク（[出典](URL)）を括弧ごと除去
    let cleanedDD = deepDiveArticle.replace(/[（\(]\s*\[[^\]]+\]\(https?:\/\/[^)]+\)(?:\s*[\/／,、\s]*\[[^\]]+\]\(https?:\/\/[^)]+\))*\s*[）\)]/g, '');

    // ディープダイブの「■ 主な出典」を全箇所まとめてメイン記事の出典スタイルに統一
    let styledDD = cleanedDD.replace(/■\s*主な出典([\s\S]*?)(?=\u3010|<h[1-6]|$)/gi, (match, citeContent) => {
      const citeHtml = citeContent
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" style="color:#aaa;word-break:break-all;">$1</a>')
        .replace(/[-–]\s*/g, '')
        .replace(/\n+/g, '<br>')
        .trim();
      if (!citeHtml) return '';
      return `<p class="citation" style="${citationStyle}">出典：${citeHtml}</p>\n`;
    });
    article += styledDD;
    article += `<!-- SECTION:deep_dive:END -->\n`;
  }

  // --- 15. ⑨ 特別枠：${countryName} おすすめ映画・映像作品 ---
  article += `\n<!-- SECTION:osusume:START -->\n`;
  const rawKougyou = parseLines(raw, 'おすすめ').filter(d => d['タイトル'] && d['タイトル'] !== '欠測');
  const kougyouData2 = sheetData.data?.対象国データ_記事?.おすすめ映画 || sheetData.data?.対象国データ_記事?.おすすめ映画ランキング || [];
  
  let kougyouData = [];
  if (rawKougyou.length > 0) {
    kougyouData = rawKougyou;
  } else if (Array.isArray(kougyouData2) && kougyouData2.length > 0) {
    kougyouData = kougyouData2.map(item => ({
      'タイトル': item['タイトル_日本語'] || item.title || '',
      '原題': item['原題'] || item.origin_title || '',
      '公開年': item['公開年'] || item.year || '',
      '種別': item['種別'] || item.genres || '',
      'director': item.director || '',
      'cast': item.cast || '',
      '深刻': 'false',
      'imdb_url': item.imdb_id ? `https://www.imdb.com/title/${item.imdb_id}/` : '',
      'poster_path': item.poster_path || item.poster_url || ''
    }));
  }

  if (kougyouData.length > 0) {
    article += `<h2 id="section-10" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑨</span> 特別枠：${countryName} おすすめ映画・映像作品</h2>\n`;
    kougyouData.forEach(d => {
      const isSerious = d['深刻'] === 'true';
      const bg = isSerious ? '#fff3f3' : '#ffffff';
      const cleanTitle = (d['タイトル'] || '').replace(/<[^>]+>/g, '').trim();
      const apiData = kougyouData2.find(api => 
        (api['タイトル_日本語'] && (String(api['タイトル_日本語']) === cleanTitle || String(api['タイトル_日本語']).includes(cleanTitle) || cleanTitle.includes(String(api['タイトル_日本語'])))) || 
        (api['原題'] && (String(api['原題']) === cleanTitle || String(api['原題']).includes(cleanTitle) || cleanTitle.includes(String(api['原題'])))) ||
        (api['title'] && (String(api['title']) === cleanTitle || String(api['title']).includes(cleanTitle) || cleanTitle.includes(String(api['title']))))
      ) || {};
      const titleJa = d['タイトル'] || apiData['タイトル_日本語'] || apiData['title'] || '';
      const titleOrig = (d['原題'] || apiData['原題'] || apiData['origin_title'] || '');
      const origTitleSpan = (titleOrig && titleOrig !== titleJa) ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${titleOrig})</span>` : '';

      const posterPath = d['poster_path'] || apiData['poster_path'] || apiData['poster_url'] || '';
      let posterUrl = '';
      if (posterPath) {
        if (String(posterPath).startsWith('http')) {
          posterUrl = posterPath;
        } else {
          const prefix = posterPath.startsWith('/') ? '' : '/';
          posterUrl = `https://image.tmdb.org/t/p/w200${prefix}${posterPath}`;
        }
      }
      const rankingInfo = (
        apiData?.概要 || 
        moviesData.find(m => m.name && (m.name === cleanTitle || m.name.includes(cleanTitle) || cleanTitle.includes(m.name)))?.info || 
        ''
      ).replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
      const imdbId = apiData?.imdb_id || (d['imdb_url'] ? d['imdb_url'].replace(/.*\/title\//, '').replace(/\/.*/, '') : null);
      const imdbBtn = imdbId ? `<a href="https://www.imdb.com/title/${imdbId}/" target="_blank" style="display:inline-block;padding:4px 14px;background:#f5c518;color:#000;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">▶ IMDb</a>` : '';

      const linkHtml = `<div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(titleJa + ' trailer')}" target="_blank" style="display:inline-block;padding:4px 14px;background:#ff0000;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;">▶ YouTube予告編</a>
        ${imdbBtn}
      </div>`;

      const posterHtml = posterUrl
        ? `<div style="flex-shrink:0;margin-left:12px;"><img src="${posterUrl}" alt="${titleJa}" style="width:90px;max-height:135px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>`
        : '';

      const director = d['director'] && d['director'] !== '空白' && d['director'] !== '-' ? d['director'] : (apiData['director'] || '');
      const cast = d['cast'] && d['cast'] !== '空白' && d['cast'] !== '-' ? d['cast'] : (apiData['cast'] || '');
      const type = d['種別'] || apiData['genres'] || '';
      const year = d['公開年'] || apiData['公開年'] || apiData['year'] || '';

      const directorStr = director ? ` &nbsp;•&nbsp; 監督：<span class="no-link">${director}</span>` : '';
      const castHtml = cast ? `<div style="font-size:12px;color:#666;margin-bottom:10px;line-height:1.5;">👥 キャスト：<span class="no-link">${cast}</span></div>` : '';

      article += `
<div style="background:${bg};border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#00bcd4;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
        <span style="background:#00bcd4;color:#fff;border-radius:6px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0;">🎬</span>
        <span style="font-weight:800;font-size:17px;color:#111;">${isSerious ? '⚠️ ' : ''}${titleJa} ${origTitleSpan}</span>
      </div>
      <div style="font-size:12px;color:#008080;font-weight:bold;margin-bottom:10px;">${type}${(type && year) ? ' &nbsp;•&nbsp; ' : ''}${year}${directorStr}</div>
      ${castHtml}
      ${rankingInfo ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:14px;letter-spacing:0.02em;">${rankingInfo}</div>` : ''}
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

    const kougyouNeko = getNekoBubbleForSection('⑨');
    article += makeNekoBubble(kougyouNeko);
    article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  }
  article += `<!-- SECTION:osusume:END -->\n`;

  // --- 16. ⑩ 特別枠：${countryName} おすすめ音楽・ナショナルサウンドトラック ---
  article += `\n<!-- SECTION:music:START -->\n`;
  const rawMusic = parseLines(raw, '音楽').filter(d => d['曲名'] && d['曲名'] !== '欠測');
  const musicData2 = sheetData.data?.対象国データ_記事?.おすすめ音楽 || sheetData.data?.対象国データ_記事?.recommend_music || [];

  let musicData = [];
  if (rawMusic.length > 0) {
    musicData = rawMusic;
  } else if (Array.isArray(musicData2) && musicData2.length > 0) {
    musicData = musicData2.map(item => ({
      '曲名': item['track_name'] || item['曲名'] || '',
      '曲名_英語': item['track_name_en'] || item['曲名_英語'] || '',
      'アーティスト': item['artist_name'] || item['アーティスト'] || '',
      'アーティスト_英語': item['artist_name_en'] || item['アーティスト_英語'] || '',
      'リリース年': item['release_year'] || item['年'] || '',
      'preview_url': item['preview_url'] || '',
      'itunes_url': item['itunes_url'] || item['spotify_url'] || '',
      'ジャケット': item['album_cover'] || item['ジャケット'] || '',
      '概要': item['description'] || item['概要'] || ''
    }));
  }

  if (musicData.length > 0) {
    const musicH2Style = `margin-top:60px;padding:14px 20px;background:var(--color-background-secondary,#f5f5f5);border:0.5px solid #e0e0e0;border-left:3px solid #ff4081;border-radius:8px;font-size:16px;font-weight:500;color:#111;`;
    article += `<h2 id="section-11" style="${musicH2Style}"><span style="background:#ff4081;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑩</span> 特別枠：${countryName} おすすめ音楽・ナショナルサウンドトラック</h2>\n`;
    musicData.forEach((d, idx) => {
      const trackName = d['曲名'] || d['track_name'] || '';
      const trackNameEn = d['曲名_英語'] || d['track_name_en'] || '';
      const artistName = d['アーティスト'] || d['artist_name'] || '';
      const artistNameEn = d['アーティスト_英語'] || d['artist_name_en'] || '';
      const releaseYear = d['リリース年'] || d['release_year'] || '';
      const previewUrl = d['preview_url'] || '';
      const itunesUrl = d['itunes_url'] || '';
      const coverUrl = d['ジャケット'] || d['album_cover'] || '';
      const description = d['概要'] || d['description'] || '';

      const isSameTrack = !trackNameEn || trackNameEn.trim().toLowerCase() === trackName.trim().toLowerCase();
      const isSameArtist = !artistNameEn || artistNameEn.trim().toLowerCase() === artistName.trim().toLowerCase();

      const trackTitleSpan = !isSameTrack ? `<span style="font-size:13px;color:#666;font-weight:normal;margin-left:6px;">(${trackNameEn})</span>` : '';
      const artistSpan = !isSameArtist ? `<span style="font-size:12px;color:#888;font-weight:normal;margin-left:4px;">(${artistNameEn})</span>` : '';

      function encText(t) {
        try { return btoa(unescape(encodeURIComponent(t || ''))); }
        catch (e) { return ''; }
      }

      const searchQuery = `${artistName} ${trackName}`;
      const mapUrl = `https://map.seronworks.dev/?mode=music&q=${encodeURIComponent(searchQuery)}`;
      const linkHTML = `<br><br><a href="${mapUrl}" target="history_gallery" style="display:inline-block;padding:10px 20px;background:#ff4081;color:#fff;text-decoration:none;border-radius:25px;font-weight:bold;font-size:13px;">🏛️ 国家の天秤 歴史館で詳しく見る</a>`;
      const popupTitleStr = `${trackName} - ${artistName}`;
      const n = encText(popupTitleStr);
      const i = encText(linkHTML);
      const onclick = `var d=function(s){return decodeURIComponent(escape(atob(s)));};document.getElementById("tenbin-popup-title").textContent=d("${n}");document.getElementById("tenbin-popup-info").innerHTML=d("${i}");document.getElementById("tenbin-popup").style.display="block";document.getElementById("tenbin-overlay").style.display="block";`;

      const titleLinkHtml = `<span style="color:#ff4081;border-bottom:1px dashed #ff4081;cursor:pointer;font-weight:bold;" onclick='${onclick}'>${trackName}</span> ${trackTitleSpan}`;

      let audioPlayerHtml = '';
      if (previewUrl && previewUrl.startsWith('http')) {
        audioPlayerHtml = `
          <div style="margin-top:10px;margin-bottom:12px;">
            <audio controls src="${previewUrl}" style="width:100%;max-width:360px;height:36px;outline:none;border-radius:18px;"></audio>
          </div>`;
      }

      let appleMusicBtn = '';
      if (itunesUrl && itunesUrl.startsWith('http')) {
        appleMusicBtn = `<a href="${itunesUrl}" target="_blank" style="display:inline-block;padding:4px 14px;background:#fc3c44;color:#fff;border-radius:20px;text-decoration:none;font-size:11px;font-weight:bold;">🎵 Apple Musicで聴く</a>`;
      }

      const coverHtml = coverUrl ? `<div style="flex-shrink:0;margin-left:12px;"><img src="${coverUrl}" alt="${trackName}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" onerror="this.style.display='none';"></div>` : '';

      article += `
<div style="background:#ffffff;border:1px solid #eef2f5;border-radius:12px;padding:18px 20px;margin:20px 0;box-shadow:0 4px 15px rgba(0,0,0,0.05);position:relative;overflow:hidden;">
  <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#ff4081;"></div>
  <div style="display:flex;gap:16px;align-items:flex-start;padding-left:6px;">
    <div style="flex:1;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
        <span style="background:#ff4081;color:#fff;border-radius:6px;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;">${idx + 1}</span>
        <span style="font-weight:800;font-size:17px;color:#111;">${titleLinkHtml}</span>
      </div>
      <div style="font-size:13px;color:#ff4081;font-weight:bold;margin-bottom:8px;">🎤 ${artistName} ${artistSpan}${releaseYear ? ` &nbsp;•&nbsp; ${releaseYear}年` : ''}</div>
      ${audioPlayerHtml}
      ${description ? `<div style="font-size:14px;color:#2c3e50;line-height:1.75;margin-bottom:12px;letter-spacing:0.02em;">${description}</div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${appleMusicBtn}
      </div>
    </div>
    ${coverHtml}
  </div>
</div>`;
    });

    const musicNeko = getNekoBubbleForSection('⑩');
    article += makeNekoBubble(musicNeko);
    article += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(255,64,129,0.15);color:#ff4081;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
  }
  article += `<!-- SECTION:music:END -->\n`;

  // --- 17. ライブログ ---
  const logMatch = raw.match(/(### 【ライブ検索[\s\S]*$)/);
  if (logMatch) article += '\n' + logMatch[1];

  const finalArticleText = article;

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

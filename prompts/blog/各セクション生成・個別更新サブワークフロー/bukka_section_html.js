/**
 * ==============================================================================
 * 【セクション個別更新サブワークフロー】
 * 物価セクション HTML生成コード (bukka_section_html.js)
 * ==============================================================================
 * 
 * 役割:
 *   Googleスプレッドシート（またはDB / 前段ノード）から渡された
 *   「物価比較データ（10品目）」「為替レート」「取得日」などの最新データから、
 *   ブログ記事用の「⑤ 生活・価値の衡量（物価比較）」HTMLセクションを瞬時に自動構築します。
 * 
 * 出力:
 *   section_html: WordPress本文置換用の完全なHTML（<!-- SECTION:bukka:START -->付き）
 *   section_type: 'bukka'
 */

const input = $input.first()?.json || {};

// 安全な前段ノード探索ヘルパー（ノードが存在しなくてもエラーにならない）
function getSafeNodeJson(names) {
  for (const name of names) {
    try {
      const data = $(name).first()?.json;
      if (data && Object.keys(data).length > 0) return data;
    } catch (e) {}
  }
  return {};
}

const triggerData = getSafeNodeJson([
  'Switch1', 'Switch', 'Switch (セクション分岐)',
  'Execute Workflow Trigger', 'Workflow Trigger', 'Subworkflow Trigger',
  'On form submission', 'Form Trigger', 'フォーム', 'トリガー', 'Webhook'
]);

// 全入力アイテムから対象国と日本の行を自動判別
const allItems = $input.all().map(item => item.json || {});
let targetRow = null;
let japanRow = null;

for (const row of allItems) {
  const c = row['国名（日本語）'] || row.country || row.countryName || row.国名 || '';
  if (c === '日本' || c === 'Japan') {
    japanRow = row;
  } else if (!targetRow) {
    targetRow = row;
  }
}
if (!targetRow) targetRow = allItems[0] || {};

if (!japanRow) {
  const possibleJapanNodes = ['Google Sheets (日本)', 'Google Sheets 日本', '日本物価データ', '日本の物価', 'Google Sheets1', 'Google Sheets2'];
  for (const name of possibleJapanNodes) {
    try {
      const d = $(name).first()?.json;
      if (d && (d['国名（日本語）'] === '日本' || d['ビール（レストラン500ml）'] || d['ビッグマック（1個）'])) {
        japanRow = d;
        break;
      }
    } catch (e) {}
  }
}

// 1. 基本パラメータの取得
const countryName = targetRow['国名（日本語）'] || targetRow.country || targetRow.countryName || targetRow.国名 || triggerData.country || '対象国';
const capital = targetRow.capital || targetRow['首都'] || targetRow['首都（日本語）'] || triggerData.capital || '';
const currencyCode = targetRow.currencyCode || targetRow.通貨コード || targetRow.currency || triggerData.currencyCode || '';
const currencyName = targetRow.currencyName || targetRow.通貨名 || currencyCode;

// 為替レート
let rate = parseFloat(targetRow.為替レート || targetRow.rate || targetRow.data?.固定データ?.物価?.為替レート || 0);
const rateDate = targetRow.為替取得日 || targetRow.rate_date || targetRow.data?.固定データ?.物価?.為替取得日 || '';

// 2. 物価データの抽出（様々な入力形式に対応）
const rawBukka = targetRow.bukka || targetRow.物価 || targetRow.物価データ || targetRow.data?.固定データ?.物価 || targetRow;
const rawJapanBukka = japanRow ? (japanRow.bukka || japanRow.物価 || japanRow.物価データ || japanRow) : {};

// 日本の基準物価（固定デフォルト）
const defaultJapanBukka = {
  'ビール（レストラン500ml）': '500円',
  'タバコ（マルボロ1箱）': '600円',
  'ミネラルウォーター（500ml）': '120円',
  'ビッグマック（1個）': '480円',
  'ガソリン（1L）': '175円',
  '外食（安めの店・1食）': '900円',
  '電気・水道・ガス（月額）': '22,000円',
  '家賃1LDK(市中心)': '95,000円',
  '平均月収（手取り）': '280,000円',
  'Netflix（スタンダード）': '1,490円'
};

const bukkaEmoji = {
  'ビール（レストラン500ml）': '🍺',
  'タバコ（マルボロ1箱）': '🚬',
  'ミネラルウォーター（500ml）': '💧',
  'ビッグマック（1個）': '🍔',
  'ガソリン（1L）': '⛽',
  '外食（安めの店・1食）': '🍜',
  '電気・水道・ガス（月額）': '💡',
  '家賃1LDK(市中心)': '🏠',
  '平均月収（手取り）': '💴',
  'Netflix（スタンダード）': '📺'
};

// 3. 各品目のデータ整形
const itemsList = [
  { label: 'ビール（レストラン500ml）', keys: ['ビール_現地通貨', 'ビール', 'ビール（レストラン500ml）'] },
  { label: 'タバコ（マルボロ1箱）', keys: ['タバコ_現地通貨', 'タバコ', 'タバコ（マルボロ1箱）'] },
  { label: 'ミネラルウォーター（500ml）', keys: ['水_現地通貨', '水', 'ミネラルウォーター', 'ミネラルウォーター（500ml）'] },
  { label: 'ビッグマック（1個）', keys: ['ビッグマック_現地通貨', 'ビッグマック', 'ビッグマック（1個）'] },
  { label: 'ガソリン（1L）', keys: ['ガソリン_現地通貨', 'ガソリン', 'ガソリン（1L）'] },
  { label: '外食（安めの店・1食）', keys: ['外食_現地通貨', '外食', '外食（安めの店・1食）'] },
  { label: '電気・水道・ガス（月額）', keys: ['光熱費_現地通貨', '光熱費', '電気・水道・ガス', '電気・水道・ガス（月額）'] },
  { label: '家賃1LDK(市中心)', keys: ['家賃1LDK(市中心)_現地通貨', '家賃1LDK(市中心)', '家賃_現地通貨', '家賃1LDK', '家賃'] },
  { label: '平均月収（手取り）', keys: ['月収_現地通貨', '月収', '平均月収', '平均月収（手取り）'] },
  { label: 'Netflix（スタンダード）', keys: ['Netflix_現地通貨', 'Netflix', 'Netflix（スタンダード）'] }
];

// ヘルパー: 円換算の計算（オリジナルデザイン準拠：太字の現地通貨 + 横並びのグレー円換算）
function parseAndConvert(valStr, yenVal, itemRate) {
  if (!valStr || valStr === '-' || valStr === 'データなし' || valStr === '欠測') return 'データなし';
  const str = String(valStr).trim();
  
  let yen = null;
  if (yenVal !== undefined && yenVal !== null && yenVal !== '' && yenVal !== 'データなし' && yenVal !== '欠測') {
    const yNum = parseFloat(String(yenVal).replace(/,/g, ''));
    if (!isNaN(yNum)) yen = Math.round(yNum);
  } else if (itemRate > 0) {
    const numMatch = str.replace(/,/g, '').match(/[\d\.]+/);
    if (numMatch) {
      const localNum = parseFloat(numMatch[0]);
      if (!isNaN(localNum)) yen = Math.round(localNum * itemRate);
    }
  }

  // 1枚目と完全に同じインライン表記：$7,250 （377円）
  if (yen !== null) {
    return `<span style="font-weight:900; font-size:15px;">${str}</span> <span style="font-size:12px; color:#666;">（${yen.toLocaleString()}円）</span>`;
  }
  return `<span style="font-weight:900; font-size:15px;">${str}</span>`;
}

function formatJapanVal(val) {
  if (!val || val === 'データなし' || val === '欠測') return 'データなし';
  const numMatch = String(val).match(/[\d,\.]+/);
  if (numMatch) {
    const n = parseFloat(numMatch[0].replace(/,/g, ''));
    if (!isNaN(n)) return `<span style="font-weight:900; font-size:15px;">${n.toLocaleString()}</span>円`;
  }
  return String(val);
}

const tableRows = itemsList.map(item => {
  let val = '';
  for (const k of item.keys) {
    if (rawBukka[k] !== undefined && rawBukka[k] !== null && String(rawBukka[k]).trim() !== '') {
      val = rawBukka[k];
      break;
    }
  }
  
  // 円換算列の探索（例: 家賃1LDK(市中心)_円換算）
  let yenVal = '';
  for (const k of item.keys) {
    const cleanK = k.replace(/_現地通貨$/, '');
    const yCol = `${cleanK}_円換算`;
    if (rawBukka[yCol] !== undefined && rawBukka[yCol] !== null && String(rawBukka[yCol]).trim() !== '') {
      yenVal = rawBukka[yCol];
      break;
    }
  }

  let japanRaw = '';
  for (const k of item.keys) {
    if (rawJapanBukka[k] !== undefined && rawJapanBukka[k] !== null && String(rawJapanBukka[k]).trim() !== '') {
      japanRaw = String(rawJapanBukka[k]).trim();
      break;
    }
  }

  const emoji = bukkaEmoji[item.label] || '🛒';
  const japanVal = japanRaw || defaultJapanBukka[item.label] || 'データなし';

  return {
    label: `${emoji} ${item.label}`,
    country: parseAndConvert(val, yenVal, rate),
    japan: formatJapanVal(japanVal)
  };
});

// 4. オリジナルHTMLテーブルの生成（main-blog-lowcost / 最終Code.js と100%同一スタイル）
const h2Style = `margin-top:60px;padding:14px 20px;background:var(--color-background-secondary,#f5f5f5);border:0.5px solid #e0e0e0;border-left:3px solid #00bcd4;border-radius:8px;font-size:16px;font-weight:500;color:#111;`;
const citationStyle = `font-size:12px;color:#aaa;text-align:right;margin-top:4px;margin-bottom:24px;`;

const thStyle = (w) => `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#e0f5f5,#f0f8f8);text-align:left;font-size:14px;${w ? 'width:' + w + ';' : ''}`;
const tdStyle = `border:1px solid #eee;padding:12px 14px;font-size:14px;`;
const tdBoldStyle = `border:1px solid #eee;padding:12px 14px;font-weight:bold;font-size:14px;`;
const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;

const bukkaCountryLabel = capital ? `${countryName}<br>（${capital}）` : countryName;
const bukkaJapanLabel = '日本<br>（東京）';

let html = `<!-- SECTION:bukka:START -->
<h2 id="section-5" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑤</span> 生活・価値の衡量（物価比較）</h2>
<table style="${tableStyle}">
  <thead>
    <tr>
      <th style="${thStyle('35%')}">項目</th>
      <th style="${thStyle('32%')}">${bukkaCountryLabel}</th>
      <th style="${thStyle('33%')}">${bukkaJapanLabel}</th>
    </tr>
  </thead>
  <tbody>
`;

tableRows.forEach((row, ri) => {
  const bg = ri % 2 === 1 ? 'background:#fafafa;' : '';
  html += `    <tr style="${bg}">
      <td style="${tdBoldStyle}">${row.label}</td>
      <td style="${tdStyle}">${row.country}</td>
      <td style="${tdStyle}">${row.japan}</td>
    </tr>\n`;
});

html += `  </tbody>
</table>
`;

// 注釈（1枚目のコロンビアと同一仕様）
if (rate > 0) {
  const cDesc = currencyName ? `${currencyCode}（${currencyName}）` : currencyCode;
  const dDesc = rateDate ? `（${rateDate}）` : '';
  html += `<p class="citation" style="${citationStyle}">※為替レートは1 ${cDesc} = ${rate} JPY${dDesc}時点のレートを使用</p>\n`;
}
html += `<p class="citation" style="${citationStyle}">※Numbeoのデータは流動的であり、リサーチ時のタイミングにより変動する場合があります。</p>\n`;
html += `<div style="height: 10px;"></div>\n`;
html += `<p class="citation" style="${citationStyle}">出典：Numbeo / Netflix公式サイト</p>\n`;
html += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
html += `<!-- SECTION:bukka:END -->`;

return [{
  json: {
    section_type: 'bukka',
    post_id: input.post_id || triggerData.post_id || null,
    country: countryName,
    section_html: html
  }
}];

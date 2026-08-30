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
  { label: 'ビール（レストラン500ml）', keys: ['ビール', 'ビール_現地通貨', 'ビール（レストラン500ml）'] },
  { label: 'タバコ（マルボロ1箱）', keys: ['タバコ', 'タバコ_現地通貨', 'タバコ（マルボロ1箱）'] },
  { label: 'ミネラルウォーター（500ml）', keys: ['水', 'ミネラルウォーター', '水_現地通貨', 'ミネラルウォーター（500ml）'] },
  { label: 'ビッグマック（1個）', keys: ['ビッグマック', 'ビッグマック_現地通貨', 'ビッグマック（1個）'] },
  { label: 'ガソリン（1L）', keys: ['ガソリン', 'ガソリン_現地通貨', 'ガソリン（1L）'] },
  { label: '外食（安めの店・1食）', keys: ['外食', '外食_現地通貨', '外食（安めの店・1食）'] },
  { label: '電気・水道・ガス（月額）', keys: ['光熱費', '電気・水道・ガス', '光熱費_現地通貨', '電気・水道・ガス（月額）'] },
  { label: '家賃1LDK(市中心)', keys: ['家賃', '家賃_現地通貨', '家賃1LDK(市中心)'] },
  { label: '平均月収（手取り）', keys: ['月収', '平均月収', '月収_現地通貨', '平均月収（手取り）'] },
  { label: 'Netflix（スタンダード）', keys: ['Netflix', 'Netflix_現地通貨', 'Netflix（スタンダード）'] }
];

// ヘルパー: 円換算の計算
function parseAndConvert(valStr, itemRate) {
  if (!valStr || valStr === '-' || valStr === 'データなし' || valStr === '欠測') return 'データなし';
  const str = String(valStr).trim();
  
  // すでに「(〇〇円)」と入っている場合
  const yenMatch = str.match(/[（(]([\d,\.]+)\s*円[)）]/);
  if (yenMatch) {
    const rawLocal = str.replace(/[（(].*?[)）]/, '').trim();
    return `<span style="font-weight:900; font-size:15px;">${rawLocal}</span><br><span style="font-size:11.5px; color:#e67e22; font-weight:bold;">（約${yenMatch[1]}円）</span>`;
  }

  // 数値部分を抽出して換算
  const numMatch = str.replace(/,/g, '').match(/[\d\.]+/);
  if (numMatch && itemRate > 0) {
    const localNum = parseFloat(numMatch[0]);
    if (!isNaN(localNum)) {
      const jpy = Math.round(localNum * itemRate);
      return `<span style="font-weight:900; font-size:15px;">${str}</span><br><span style="font-size:11.5px; color:#e67e22; font-weight:bold;">（約${jpy.toLocaleString()}円）</span>`;
    }
  }

  return `<span style="font-weight:900; font-size:15px;">${str}</span>`;
}

const tableRows = itemsList.map(item => {
  let val = '';
  for (const k of item.keys) {
    if (rawBukka[k] !== undefined && rawBukka[k] !== '') {
      val = rawBukka[k];
      break;
    }
  }
  let japanRaw = '';
  for (const k of item.keys) {
    if (rawJapanBukka[k] !== undefined && rawJapanBukka[k] !== null && String(rawJapanBukka[k]).trim() !== '') {
      japanRaw = String(rawJapanBukka[k]).trim();
      if (!japanRaw.endsWith('円') && !isNaN(parseFloat(japanRaw.replace(/,/g, '')))) {
        japanRaw = `${Number(japanRaw.replace(/,/g, '')).toLocaleString()}円`;
      }
      break;
    }
  }

  const emoji = bukkaEmoji[item.label] || '🛒';
  const japanVal = japanRaw || defaultJapanBukka[item.label] || 'データなし';

  return {
    label: `${emoji} ${item.label}`,
    country: parseAndConvert(val, rate),
    japan: `<span style="font-weight:600; font-size:13.5px; color:#333;">${japanVal}</span>`
  };
});

// 4. HTMLテーブルの生成
const thStyle = 'background:#f4fbfc; color:#00838f; padding:12px 14px; font-weight:700; font-size:13px; border:1px solid #e0eeee; text-align:center;';
const tdLabelStyle = 'padding:12px 14px; font-weight:600; font-size:13px; border:1px solid #e0eeee; background:#fafdfd; color:#333;';
const tdValStyle = 'padding:12px 14px; font-size:13px; border:1px solid #e0eeee; text-align:center; background:#fff;';

let html = `<!-- SECTION:bukka:START -->
<h2 id="section-5" style="font-size:20px; font-weight:700; color:#111; margin:40px 0 20px; padding-bottom:8px; border-bottom:2px solid #00bcd4; display:flex; align-items:center; gap:8px;">
  <span style="background:#00bcd4; color:#fff; border-radius:6px; padding:2px 10px; font-size:13px; font-weight:500;">⑤</span> 生活・価値の衡量（物価比較）
</h2>
`;

// 為替レートバッジ
if (rate > 0) {
  const cDesc = currencyName ? `${currencyCode}（${currencyName}）` : currencyCode;
  const dDesc = rateDate ? `（${rateDate}現在）` : '';
  html += `
<div style="background:#fdfaf6; border:1px solid #fae6cf; border-left:4px solid #e67e22; padding:10px 16px; border-radius:8px; margin:15px 0 20px; font-size:13px; color:#666; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
  <div>💱 <strong>為替レート基準：</strong> 1 ${cDesc} ＝ <span style="font-weight:900; color:#e67e22; font-size:15px;">${rate.toLocaleString()}</span> JPY ${dDesc}</div>
  <div style="font-size:11.5px; color:#999;">出典：Numbeo / The Economist</div>
</div>
`;
}

html += `
<div style="overflow-x:auto; margin:20px 0; box-shadow:0 2px 8px rgba(0,0,0,0.03); border-radius:8px;">
  <table style="width:100%; border-collapse:collapse; text-align:left; border-radius:8px; overflow:hidden;">
    <thead>
      <tr>
        <th style="${thStyle} width:36%;">品目</th>
        <th style="${thStyle} width:32%;">${countryName}（現地価格・円換算）</th>
        <th style="${thStyle} width:32%;">日本（参考価格）</th>
      </tr>
    </thead>
    <tbody>
`;

tableRows.forEach(r => {
  html += `      <tr>
        <td style="${tdLabelStyle}">${r.label}</td>
        <td style="${tdValStyle}">${r.country}</td>
        <td style="${tdValStyle}">${r.japan}</td>
      </tr>\n`;
});

html += `    </tbody>
  </table>
</div>
`;

// 5. エラーネコの一言
const customNeko = input.neko_comment || input.neko || triggerData.neko_comment || '';
const defaultNeko = `${countryName}の物価と為替データを最新版にリフレッシュしたニャ！食料品や家賃、平均月収を日本円換算で比べると、現地でのリアルな生活水準や購買力平価の差がはっきり見えてくるニャ！`;
const nekoContent = customNeko || defaultNeko;

html += `
<div style="margin:25px 0 15px; display:flex; align-items:flex-start; gap:12px;">
  <div style="font-size:24px; line-height:1;">🐱</div>
  <div style="position:relative; background:#f0f7f7; border:1px solid #e0eeee; border-radius:12px; padding:12px 16px; font-size:13px; line-height:1.6; color:#444; flex:1;">
    <div style="position:absolute; top:12px; left:-8px; width:0; height:0; border-top:8px solid transparent; border-bottom:8px solid transparent; border-right:8px solid #f0f7f7;"></div>
    <strong style="color:#00838f;">エラーネコの一言：</strong><br>${nekoContent}
  </div>
</div>

<div style="text-align:right; margin:10px 0 30px;">
  <a href="#top" style="display:inline-block; padding:6px 16px; background:rgba(0,188,212,0.15); color:#00bcd4; text-decoration:none; border-radius:20px; font-size:11px;">▲ 先頭に戻る</a>
</div>
<!-- SECTION:bukka:END -->`;

return [{
  json: {
    section_type: 'bukka',
    post_id: input.post_id || triggerData.post_id || null,
    country: countryName,
    section_html: html
  }
}];

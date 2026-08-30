/**
 * ==============================================================================
 * 【セクション個別更新サブワークフロー】
 * 治安セクション HTML生成コード (chian_section_html.js)
 * ==============================================================================
 * 
 * 役割:
 *   Googleスプレッドシート（またはDB / 前段ノード）から渡された
 *   「治安指標」「刑務所推移」「死因トップ10」などの最新データから、
 *   ブログ記事用の「③ 治安と平和の衡量」HTMLセクションを瞬時に自動構築します。
 * 
 * 出力:
 *   section_html: WordPress本文置換用の完全なHTML（<!-- SECTION:chian:START -->付き）
 *   section_type: 'chian'
 */

const input = $input.first()?.json || {};

// 1. 基本パラメータの取得
const countryName = input.country || input.countryName || input.国名 || $('On form submission')?.first()?.json?.country || '対象国';
const capital = input.capital || input.首都 || '';
const countryLabel = capital ? `${countryName}<br>（${capital}）` : countryName;
const japanLabel = '日本<br>（東京）';

// 2. 治安データの抽出（様々な入力形式に対応）
const rawChian = input.chian || input.治安 || input.治安指標 || input.data?.固定データ?.治安指標 || input;
const rawJapanChian = input.japan_chian || input.日本_治安 || input.data?.日本固定データ?.治安指標 || {};

// 日本の基準値（固定デフォルト）
const defaultJapan = {
  殺人率: '0.2（警察庁・2023年）',
  交通事故死亡率: '2.1（警察庁・2023年）',
  自殺率: '17.5（厚生労働省・2023年）',
  失業率: '2.6%（総務省・2023年）',
  貧困率: '15.4%（厚生労働省・2021年）',
  ジニ係数: '33.4（厚生労働省・2021年）',
  刑務所稼働率: '54.2%（法務省・2023年）',
  刑務所総収容者数: '41,000人（法務省・2023年）',
  GPI: 'スコア 1.336・17位（Vision of Humanity・2024年）'
};

// ヘルパー: 値のフォーマット（太字化＋出典の小文字化）
function formatMetric(val, defaultVal = 'データなし') {
  if (!val || val === '-' || val === 'データなし' || val === '欠測') return 'データなし';
  const str = String(val).trim();
  const sourceMatch = str.match(/\s*[（(](.*?)[)）]$/);
  if (sourceMatch) {
    const mainVal = str.replace(/\s*[（(].*?[)）]$/, '').trim();
    return `<span style="font-weight:900; font-size:15px; color:#111;">${mainVal}</span><br><span style="font-size:11.5px; color:#888; font-weight:normal; line-height:1.4; display:inline-block; margin-top:2px;">（${sourceMatch[1]}）</span>`;
  }
  return `<span style="font-weight:900; font-size:15px; color:#111;">${str}</span>`;
}

// 3. 指標テーブルの行データ構築
const metricsList = [
  { name: '殺人率（10万人あたり）', key: '殺人率', keyAlt: '殺人率_値', yearKey: '殺人率_年', srcKey: '殺人率_出典' },
  { name: '交通事故死亡率（10万人あたり）', key: '交通事故死亡率', keyAlt: '交通事故死亡率_値', yearKey: '交通事故死亡率_年', srcKey: '交通事故死亡率_出典' },
  { name: '自殺率（10万人あたり）', key: '自殺率', keyAlt: '自殺率_値', yearKey: '自殺率_年', srcKey: '自殺率_出典' },
  { name: '失業率', key: '失業率', keyAlt: '失業率_値', yearKey: '失業率_年', srcKey: '失業率_出典' },
  { name: '貧困率', key: '貧困率', keyAlt: '貧困率_値', yearKey: '貧困率_年', srcKey: '貧困率_出典' },
  { name: 'ジニ係数', key: 'ジニ係数', keyAlt: 'ジニ係数_値', yearKey: 'ジニ係数_年', srcKey: 'ジニ係数_出典' },
  { name: '刑務所稼働率', key: '刑務所稼働率', keyAlt: '稼働率', yearKey: '稼働率_年', srcKey: '稼働率_出典' },
  { name: '刑務所総収容者数', key: '刑務所総収容者数', keyAlt: '総収容者数', yearKey: '収容者_年', srcKey: '収容者_出典' },
  { name: 'GPI（世界平和度指数）', key: 'GPI', keyAlt: 'GPIスコア', yearKey: 'GPI年', srcKey: 'GPI出典' }
];

const tableRows = metricsList.map(m => {
  let countryVal = rawChian[m.key] || rawChian[m.keyAlt] || '';
  const cYear = rawChian[m.yearKey] || '';
  const cSrc = rawChian[m.srcKey] || '';
  
  if (countryVal && (cYear || cSrc)) {
    const meta = [cSrc, cYear ? `${cYear}年` : ''].filter(Boolean).join('・');
    countryVal = `${countryVal}（${meta}）`;
  }

  const japanVal = rawJapanChian[m.key] || defaultJapan[m.key] || 'データなし';
  return {
    name: m.name,
    country: formatMetric(countryVal),
    japan: formatMetric(japanVal)
  };
});

// 4. HTMLテーブルの生成
const thStyle = 'background:#f4fbfc; color:#00838f; padding:12px 14px; font-weight:700; font-size:13px; border:1px solid #e0eeee; text-align:center;';
const tdLabelStyle = 'padding:12px 14px; font-weight:600; font-size:13px; border:1px solid #e0eeee; background:#fafdfd; color:#333;';
const tdValStyle = 'padding:12px 14px; font-size:13px; border:1px solid #e0eeee; text-align:center; background:#fff;';

let html = `<!-- SECTION:chian:START -->
<h2 id="section-3" style="font-size:20px; font-weight:700; color:#111; margin:40px 0 20px; padding-bottom:8px; border-bottom:2px solid #00bcd4; display:flex; align-items:center; gap:8px;">
  <span style="background:#00bcd4; color:#fff; border-radius:6px; padding:2px 10px; font-size:13px; font-weight:500;">③</span> 治安と平和の衡量
</h2>

<div style="overflow-x:auto; margin:20px 0; box-shadow:0 2px 8px rgba(0,0,0,0.03); border-radius:8px;">
  <table style="width:100%; border-collapse:collapse; text-align:left; border-radius:8px; overflow:hidden;">
    <thead>
      <tr>
        <th style="${thStyle} width:35%;">治安・社会指標</th>
        <th style="${thStyle} width:32%;">${countryLabel}</th>
        <th style="${thStyle} width:33%;">${japanLabel}</th>
      </tr>
    </thead>
    <tbody>
`;

tableRows.forEach(r => {
  html += `      <tr>
        <td style="${tdLabelStyle}">${r.name}</td>
        <td style="${tdValStyle}">${r.country}</td>
        <td style="${tdValStyle}">${r.japan}</td>
      </tr>\n`;
});

html += `    </tbody>
  </table>
</div>
`;

// 5. 外務省危険レベルの警告表示
const kikenLevel = parseInt(input.外務省危険レベル || input.kiken_level || rawChian.外務省危険レベル || 0);
if (kikenLevel >= 1) {
  const kikenMessages = {
    1: '⚠️ 外務省から「レベル1：十分注意してください」が発出されています。渡航・滞在にあたっては現地の最新治安情報を確認してください。',
    2: '⚠️ 外務省から「レベル2：不要不急の渡航は止めてください」が発出されています。',
    3: '🚨 外務省から「レベル3：渡航中止勧告」が発出されています。どのような目的であれ渡航は止めてください。',
    4: '🚨 外務省から「レベル4：退避勧告」が発出されています。直ちに退避してください。'
  };
  const msg = kikenMessages[kikenLevel] || `⚠️ 外務省危険レベル ${kikenLevel} が発出されています。`;
  html += `
<div style="background:#fff3f3; border-left:4px solid #d32f2f; padding:14px 16px; border-radius:6px; margin:20px 0; color:#d32f2f; font-weight:bold; font-size:13.5px; line-height:1.6;">
  ${msg}
</div>
`;
}

// 6. エラーネコの一言
const customNeko = input.neko_comment || input.neko || $('On form submission')?.first()?.json?.neko_comment || '';
const defaultNeko = `${countryName}の治安指標を最新データに更新したニャ！殺人率や失業率などの急激な変化は、国内情勢や法制度の変化を鋭く反映しているニャ。日本との治安格差にも要注目ニャ！`;
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
<!-- SECTION:chian:END -->`;

return [{
  json: {
    section_type: 'chian',
    post_id: input.post_id || $('On form submission')?.first()?.json?.post_id || null,
    country: countryName,
    section_html: html
  }
}];

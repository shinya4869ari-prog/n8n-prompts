/**
 * ==============================================================================
 * 日本版 ① 貿易の衡量 セクション個別更新 HTML生成コード
 * ==============================================================================
 * 入力: 輸出入トップ10、貿易相手国トップ10、解説テキスト
 * 出力: <!-- SECTION:boeki:START --> ... <!-- SECTION:boeki:END -->
 * ==============================================================================
 */

const rawInput = $input.first()?.json || {};

let trig = {};
try {
  trig = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
} catch (e) {}

const merged = { ...trig, ...rawInput };

const themeColor = '#d32f2f';
const h2Style = `margin-top:60px;padding:14px 20px;background:#fffafa;border-left:4px solid ${themeColor};border-radius:8px;font-size:16px;font-weight:800;color:#111;`;
const h3Style = `font-size:14px;font-weight:800;color:#333;margin-top:30px;margin-bottom:10px;`;
const citationStyle = `font-size:12px;color:#aaa;text-align:right;margin-top:4px;margin-bottom:24px;`;
const backToTopBtn = `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(211,47,47,0.12);color:#d32f2f;text-decoration:none;border-radius:20px;font-weight:600;font-size:11px;transition:0.2s;">▲ 先頭に戻る</a></div>`;

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

// 貿易データの取得
const boekiData = merged.貿易 || merged.trade || merged.data?.固定データ?.貿易 || {};
const yushutsuList = boekiData.輸出 || merged.輸出 || [];
const yunyuList = boekiData.輸入 || merged.輸入 || [];
const aiteList = boekiData.貿易相手国 || boekiData.主要な貿易相手国 || merged.貿易相手国 || [];

let html = `<!-- SECTION:boeki:START -->\n`;
html += `<h2 id="section-1" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">①</span> 貿易の衡量</h2>\n`;

if (yushutsuList.length > 0 || yunyuList.length > 0) {
  const tradeRows = [];
  const maxLen = Math.max(yushutsuList.length, yunyuList.length, 10);
  for (let i = 0; i < maxLen; i++) {
    const yItem = yushutsuList[i];
    const uItem = yunyuList[i];
    tradeRows.push([
      `${i + 1}位`,
      (typeof yItem === 'object' ? yItem.品目 || yItem.item : yItem) || '-',
      (typeof uItem === 'object' ? uItem.品目 || uItem.item : uItem) || '-'
    ]);
  }
  html += makeTable(['順位', '輸出主要品目', '輸入主要品目'], tradeRows, ['10%', '45%', '45%']);
}

if (aiteList.length > 0) {
  html += `<h3 style="${h3Style}">主要な貿易相手国</h3>\n`;
  const partnerRows = aiteList.map((d, i) => [
    d.順位 || `${i + 1}位`,
    d.国名 || d.country || '-',
    d.シェア || d.share || '-'
  ]);
  html += makeTable(['順位', '相手国', 'シェア'], partnerRows, ['10%', '60%', '30%']);
  const boekiCite = merged.貿易出典_日本 || merged.出典 || '財務省貿易統計 / UN Comtrade';
  html += `<p style="${citationStyle}">出典：${boekiCite}</p>\n`;
}

// 解説文
const explanation = merged.explanation || merged.解説 || merged.content || '';
if (explanation && typeof explanation === 'string') {
  const cleanExp = explanation
    .split(/\n{2,}/)
    .map(p => {
      const c = p.trim();
      return c ? `<p style="font-size:15px; line-height:2.0; color:#333; margin:16px 0; text-align:justify; text-justify:inter-ideograph;">${c.split('\n').join('<br>')}</p>` : '';
    })
    .filter(Boolean)
    .join('\n');
  html += cleanExp + '\n';
}

// エラーネコの一言
const customNeko = trig.neko_comment || trig.error_neko || merged.neko_comment || '';
const nekoText = customNeko || '輸出の上位を自動車・半導体製造装置が占める一方、輸入のトップは原油・天然ガス・石炭といったエネルギー資源が独占しています。典型的な加工貿易構造と、資源の海外依存度の高さが数字に顕著に表れています。';

html += `
<div style="margin: 25px 0; display: flex; align-items: flex-start; gap: 12px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #fffafa; border: 1px solid #ffebee; border-radius: 12px; padding: 14px 18px; font-size: 13px; line-height: 1.6; color: #444; flex: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #fffafa;"></div>
    <strong>エラーネコの一言：</strong><br>${nekoText}
  </div>
</div>\n`;

html += backToTopBtn;
html += `<!-- SECTION:boeki:END -->\n`;

return [{
  json: {
    section_type: 'boeki',
    section_html: html,
    html: html,
    country: '日本'
  }
}];

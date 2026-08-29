/**
 * ==============================================================================
 * 日本版 ② 歴史的背景（近代100年）セクション個別更新 HTML生成コード
 * ==============================================================================
 * 入力: 日本近代100年の主要事象リスト（年、事象名、種別、概要、出典）
 * 出力: <!-- SECTION:rekishi:START --> ... <!-- SECTION:rekishi:END -->
 * ==============================================================================
 */

const items = $input.all().map(item => item.json);
if (!items || items.length === 0) {
  return [{ json: { html: '', section_html: '' } }];
}

let trig = {};
try {
  trig = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
} catch (e) {}

let historyList = [];
if (items[0]?.歴史的背景 && Array.isArray(items[0].歴史的背景)) {
  historyList = items[0].歴史的背景;
} else if (items[0]?.history && Array.isArray(items[0].history)) {
  historyList = items[0].history;
} else if (Array.isArray(items) && (items[0]?.事象名 || items[0]?.年)) {
  historyList = items;
} else {
  historyList = items;
}

const themeColor = '#d32f2f';
const h2Style = `margin-top:60px;padding:14px 20px;background:#fffafa;border-left:4px solid ${themeColor};border-radius:8px;font-size:16px;font-weight:800;color:#111;`;
const tableStyle = `border-collapse:separate;border-spacing:0;width:100%;font-size:14px;margin:20px 0;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);`;
const thStyle = `border:1px solid #eee;padding:12px 14px;background:linear-gradient(135deg,#fffafa,#ffebee);text-align:left;font-weight:bold;`;
const backToTopBtn = `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(211,47,47,0.12);color:#d32f2f;text-decoration:none;border-radius:20px;font-weight:600;font-size:11px;transition:0.2s;">▲ 先頭に戻る</a></div>`;

let html = `<!-- SECTION:rekishi:START -->\n`;
html += `<h2 id="section-2" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">②</span> 歴史的背景（近代100年）</h2>\n`;

if (historyList.length > 0) {
  html += `<table style="${tableStyle}"><thead><tr>`;
  html += `<th style="${thStyle}width:10%;">年</th><th style="${thStyle}width:20%;">事象名</th><th style="${thStyle}width:15%;">種別</th><th style="${thStyle}width:55%;">概要</th>`;
  html += `</tr></thead><tbody>`;

  historyList.forEach(d => {
    const year = d['年'] || d.year || '';
    const name = d['事象名'] || d.title || d.event || '';
    const type = d['種別'] || d.type || d.category || '';
    let ganyou = d['概要'] || d.overview || d.description || '';
    const cite = d['出典'] || d.source || '';

    let bg = '';
    if (type.includes('戦争') || type.includes('虐殺')) bg = 'background:#fff3f3;';
    else if (type.includes('事件') || type.includes('事故')) bg = 'background:#f0f7ff;';
    else if (type.includes('政治') || type.includes('体制')) bg = 'background:#f0fff4;';

    if (cite && cite !== '欠測' && cite !== '未確認' && cite !== 'データなし') {
      ganyou += `<span style="color:#888;font-size:12px;display:block;margin-top:4px;">（出典：${cite}）</span>`;
    }

    html += `<tr style="${bg}">`;
    html += `<td style="border:1px solid #eee;padding:12px 14px;font-weight:bold;">${year}</td>`;
    html += `<td style="border:1px solid #eee;padding:12px 14px;">${name}</td>`;
    html += `<td style="border:1px solid #eee;padding:12px 14px;font-size:11px;">${type}</td>`;
    html += `<td style="border:1px solid #eee;padding:12px 14px;">${ganyou}</td>`;
    html += `</tr>`;
  });

  html += `</tbody></table>\n`;
}

// 重大犯罪事件テーブル（存在する場合）
const crimeList = items[0]?.重大犯罪事件 || items[0]?.crimes || [];
if (Array.isArray(crimeList) && crimeList.length > 0) {
  html += `<h3 style="font-size:14px;font-weight:800;color:#333;margin-top:30px;margin-bottom:10px;">国内の重大犯罪事件</h3>\n`;
  html += `<table style="${tableStyle}"><thead><tr>`;
  html += `<th style="${thStyle}width:12%;">発生年</th><th style="${thStyle}width:26%;">事件名</th><th style="${thStyle}width:18%;">被害者属性</th><th style="${thStyle}width:44%;">概要</th>`;
  html += `</tr></thead><tbody>`;
  crimeList.forEach((c, ci) => {
    const bg = ci % 2 === 1 ? 'background:#fafafa;' : '';
    const cite = c['出典'] ? `<br><span style="font-size:11px;color:#aaa;">出典：${c['出典']}</span>` : '';
    const criminal = c['犯人名'] ? `<br><span style="font-size:12px;color:#666;">犯人：${c['犯人名']}</span>` : '';
    html += `<tr style="${bg}">`;
    html += `<td style="border:1px solid #eee;padding:12px 14px;font-weight:bold;">${c['発生年'] || '不明'}</td>`;
    html += `<td style="border:1px solid #eee;padding:12px 14px;"><strong>${c['事件名'] || '不明'}</strong>${criminal}</td>`;
    html += `<td style="border:1px solid #eee;padding:12px 14px;">${c['被害者属性'] || '不明'}</td>`;
    html += `<td style="border:1px solid #eee;padding:12px 14px;">${c['概要'] || ''}${cite}</td>`;
    html += `</tr>`;
  });
  html += `</tbody></table>\n`;
}

// エラーネコの一言
const customNeko = trig.neko_comment || trig.error_neko || items[0]?.neko_comment || '';
const nekoText = customNeko || '焦土からの奇跡的な高度経済成長、バブル経済の熱狂と崩壊、そして幾度もの巨大震災。日本の近代100年は、未曾有の災禍とそこからの驚異的な回復力（レジリエンス）の連続でした。';

html += `
<div style="margin: 25px 0; display: flex; align-items: flex-start; gap: 12px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #fffafa; border: 1px solid #ffebee; border-radius: 12px; padding: 14px 18px; font-size: 13px; line-height: 1.6; color: #444; flex: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #fffafa;"></div>
    <strong>エラーネコの一言：</strong><br>${nekoText}
  </div>
</div>\n`;

html += backToTopBtn;
html += `<!-- SECTION:rekishi:END -->\n`;

return [{
  json: {
    section_type: 'rekishi',
    section_html: html,
    html: html,
    country: '日本',
    count: historyList.length
  }
}];

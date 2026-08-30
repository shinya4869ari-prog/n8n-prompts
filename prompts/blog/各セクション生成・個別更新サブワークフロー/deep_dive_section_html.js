/**
 * 【Deep Dive (✦ ディープダイブ) セクション HTML生成コード】
 * AIノード (Deep Dive再リサーチ/ライター) またはフォームから受け取った文章を
 * 公式の Deep Dive デザインコンテナ HTMLに整列・成形します。
 */

const items = $input.all().map(item => item.json);
if (!items || items.length === 0) {
  return [{ json: { html: '', section_html: '' } }];
}

let rawText = items[0].text || items[0].article || items[0].content || items[0].output || '';
if (!rawText && items[0].deep_dive) rawText = items[0].deep_dive;

if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 20) {
  return [{ json: { html: '', section_html: '' } }];
}

const sectionId = 'deep_dive';
const citationStyle = 'font-size:12px;color:#888;margin-top:15px;line-height:1.6;';

// 本文中に残っている [出典](URL) や (出典) を綺麗に成形
let cleanedText = rawText
  .replace(/<!--\s*SECTION:[^>]+?:START\s*-->/gi, '')
  .replace(/<!--\s*SECTION:[^>]+?:END\s*-->/gi, '')
  .replace(/[（\(]\s*\[[^\]]+\]\(https?:\/\/[^)]+\)(?:\s*[\/／,、\s]*\[[^\]]+\]\(https?:\/\/[^)]+\))*\s*[）\)]/g, '')
  .trim();

// 主な出典をメイン記事デザインに統一
let styledText = cleanedText.replace(/■\s*主な出典([\s\S]*?)(?=\u3010|<h[1-6]|$)/gi, (match, citeContent) => {
  const citeHtml = citeContent
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" style="color:#aaa;word-break:break-all;">$1</a>')
    .replace(/[-–]\s*/g, '')
    .replace(/\n+/g, '<br>')
    .trim();
  if (!citeHtml) return '';
  return `<p class="citation" style="${citationStyle}">出典：${citeHtml}</p>\n`;
});

// Markdown の段落改行やH2/H3見出しを簡易HTML装飾
if (!styledText.includes('<p>') && !styledText.includes('<h2')) {
  styledText = styledText
    .split(/\n{2,}/)
    .map(paragraph => {
      const p = paragraph.trim();
      if (p.startsWith('### ')) return `<h3 style="font-size:16px;font-weight:bold;color:#1a237e;margin-top:24px;margin-bottom:12px;">${p.replace('### ', '')}</h3>`;
      if (p.startsWith('## ')) return `<h2 style="font-size:18px;font-weight:bold;color:#1a237e;margin-top:30px;margin-bottom:14px;border-bottom:2px solid #1a237e;padding-bottom:6px;">${p.replace('## ', '')}</h2>`;
      return `<p style="font-size:15px;line-height:2.0;color:#333;margin:18px 0;text-align:justify;">${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

let html = `<!-- SECTION:${sectionId}:START -->\n`;
html += `<div id="deep-dive" style="border-top:4px solid #1a237e; margin:80px 0 40px; padding-top:40px;">\n`;
html += `  <div style="display:inline-block; background:#1a237e; color:#fff; padding:5px 18px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;">✦ Deep Dive</div>\n`;
html += `</div>\n`;
html += `${styledText}\n`;
html += `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(26,35,126,0.15);color:#1a237e;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>\n`;
html += `<!-- SECTION:${sectionId}:END -->\n`;

let countryName = '対象国';
let postId = null;
try {
  const trig = $('On form submission').first()?.json || $('トリガー').first()?.json || $('Execute Workflow Trigger').first()?.json || {};
  countryName = trig.country_name || trig.country_ja || trig.country || countryName;
  postId = trig.post_id || null;
} catch (e) {}

if (countryName === '対象国' && items[0]) {
  countryName = items[0].countryJa || items[0].country_name || items[0].country_ja || items[0].country || countryName;
}

return [{
  json: {
    html: html,
    section_html: html,
    section_type: sectionId,
    country: countryName,
    post_id: postId
  }
}];

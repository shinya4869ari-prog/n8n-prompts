/**
 * ==============================================================================
 * 日本版 ✦ Deep Dive (ディープダイブ) セクション HTML生成コード
 * ==============================================================================
 * AIノード (Deep Dive再リサーチ/ライター) またはフォームから受け取った文章を
 * 日本版公式の Deep Dive デザインコンテナ HTMLに整列・成形します。
 * ==============================================================================
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
const themeColor = '#d32f2f';
const citationStyle = 'font-size:12px;color:#888;margin-top:15px;line-height:1.6;';
const backToTopBtn = `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(211,47,47,0.12);color:#d32f2f;text-decoration:none;border-radius:20px;font-weight:600;font-size:11px;transition:0.2s;">▲ 先頭に戻る</a></div>`;

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
      if (p.startsWith('### ')) return `<h3 style="font-size:16px;font-weight:bold;color:${themeColor};margin-top:24px;margin-bottom:12px;">${p.replace('### ', '')}</h3>`;
      if (p.startsWith('## ')) return `<h2 style="font-size:18px;font-weight:bold;color:${themeColor};margin-top:30px;margin-bottom:14px;border-bottom:2px solid ${themeColor};padding-bottom:6px;">${p.replace('## ', '')}</h2>`;
      return `<p style="font-size:15px;line-height:2.0;color:#333;margin:18px 0;text-align:justify;">${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

let html = `<!-- SECTION:${sectionId}:START -->\n`;
html += `<div id="deep-dive" style="border-top:4px solid ${themeColor}; margin:80px 0 40px; padding-top:40px;">\n`;
html += `  <div style="display:inline-block; background:${themeColor}; color:#fff; padding:5px 18px; border-radius:4px; font-size:10px; font-weight:800; letter-spacing:2px; text-transform:uppercase; margin-bottom:14px;">✦ Deep Dive</div>\n`;
html += `</div>\n`;
html += `${styledText}\n`;
html += backToTopBtn;
html += `<!-- SECTION:${sectionId}:END -->\n`;

return [{
  json: {
    html: html,
    section_html: html,
    section_type: sectionId,
    country: '日本'
  }
}];

const item = $input.first().json;

const raw = (typeof item?.message === 'string' ? item.message : null)
         ?? item?.message?.content
         ?? item?.choices?.[0]?.message?.content
         ?? item?.content?.[0]?.text 
         ?? item?.content?.parts?.[0]?.text 
         ?? item?.output 
         ?? (typeof item === 'string' ? item : "");

const cleaned = raw
  .replace(/【Layer \d の文章】\s*/g, '')
  .split('\\n').join('\n')
  .split('\\t').join('\t')
  .trim();

// 最初の行をタイトルとして抽出
const lines = cleaned.split('\n');
let title = "Deep Dive";
let bodyMd = cleaned;
if (lines.length > 0) {
  const firstLine = lines[0].trim();
  if (firstLine) {
    title = firstLine.replace(/^#+\s*/, '');
    bodyMd = lines.slice(1).join('\n').trim();
  }
}

function markdownToHtml(md) {
  return md
    .replace(/^\|[\s\-\—]+\|[\s\-\—]+\|.*$/gm, '')
    .replace(/^[\—\-]{2,}$/gm, '')
    .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:800;color:#333;margin:20px 0 8px;padding-left:10px;border-left:3px solid #aaa;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-size:14px;font-weight:900;color:#1a237e;border-left:4px solid #5c6bc0;padding:6px 12px;background:#f3f4f9;border-radius:0 6px 6px 0;margin:30px 0 12px;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="font-size:18px;font-weight:900;color:#1a237e;border-bottom:3px solid #1a237e;padding-bottom:10px;margin:40px 0 16px;">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:2px dashed #ddd;margin:30px 0;">')
    .replace(/^—$/gm, '<hr style="border:none;border-top:2px dashed #ddd;margin:30px 0;">')
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      const tag = cells.some(c => c.startsWith('**')) ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    })
    .replace(/<tr><t[hd]><\/t[hd]>(<t[hd]>-+<\/t[hd]>)+<\/tr>/g, '')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #5c6bc0;padding:10px 16px;background:#f3f4f9;margin:16px 0;border-radius:0 8px 8px 0;color:#444;font-style:italic;">$1</blockquote>')
    .replace(/\n\n/g, '</p><p style="font-size:14px;line-height:1.9;color:#333;margin:12px 0;">')
    .replace(/\n/g, '<br>');
}

// Mermaidブロックを退避してから変換し、最後に復元する
const mermaidPlaceholders = [];
const withoutMermaid = bodyMd.replace(/```mermaid[\s\S]*?```/g, (match) => {
  const idx = mermaidPlaceholders.length;
  mermaidPlaceholders.push(match);
  return `%%MERMAID_${idx}%%`;
});

const titleHtml = `
<div style="margin: 25px 0 20px 0; padding: 16px 20px; background: linear-gradient(135deg, #f5f7fa 0%, #e2e8f0 100%); border-left: 6px solid #1a237e; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
  <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: #1a237e; letter-spacing: -0.3px; line-height: 1.4;">${title}</h3>
</div>
`;

let html = `<div style="font-size:14px;line-height:1.9;color:#333;">${titleHtml}${markdownToHtml(withoutMermaid)}</div>`;

// Mermaidブロックを元に戻す
mermaidPlaceholders.forEach((block, idx) => {
  html = html.replace(`%%MERMAID_${idx}%%`, block);
});

return [{
  json: {
    article: html,
    country: title
  }
}];

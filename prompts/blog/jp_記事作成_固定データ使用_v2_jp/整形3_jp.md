const item = $input.first().json;

const raw = item?.content?.[0]?.text 
         ?? item?.content?.parts?.[0]?.text 
         ?? item?.message?.content
         ?? item?.output 
         ?? "";

const cleaned = raw
  .replace(/【Layer \d の文章】\s*/g, '')
  .split('\\n').join('\n')
  .split('\\t').join('\t')
  .trim();

const titleMatch = cleaned.match(/^#{1,3}\s*(.+)/m);
const title = titleMatch ? titleMatch[1].trim() : "Deep Dive";

function markdownToHtml(md) {
  return md
    .replace(/^\|[\s\-\—]+\|[\s\-\—]+\|.*$/gm, '')
    .replace(/^[\—\-]{2,}$/gm, '')
    .replace(/^### (.+)$/gm, '<h3 style="margin-top:48px;margin-bottom:20px;padding-top:16px;font-size:13px!important;font-weight:900;color:#000;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="margin-top:80px;margin-bottom:24px;padding-top:24px;font-size:15px!important;font-weight:900;color:#000;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^—$/gm, '<hr>')
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      const tag = cells.some(c => c.startsWith('**')) ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    })
    .replace(/<tr><t[hd]><\/t[hd]>(<t[hd]>-+<\/t[hd]>)+<\/tr>/g, '')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

const mermaidPlaceholders = [];
const withoutMermaid = cleaned.replace(/```mermaid[\s\S]*?```/g, (match) => {
  const idx = mermaidPlaceholders.length;
  mermaidPlaceholders.push(match);
  return `%%MERMAID_${idx}%%`;
});

let html = markdownToHtml(withoutMermaid);

mermaidPlaceholders.forEach((block, idx) => {
  html = html.replace(`%%MERMAID_${idx}%%`, block);
});

return [{
  json: {
    article: html,
    target_country: title
  }
}];
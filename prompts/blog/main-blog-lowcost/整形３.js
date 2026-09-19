// ==============================================================================
// 🎨 整形3: 新・文化DeepDive専用 HTML整形ノード（完全安定版）
//
// 【機能】
//   1. Perplexity出力（または★DeepDive即時保存/Supabaseキャッシュ）から本文を確実に取得
//   2. Markdown記法（見出し、引用、太字、リンク、出典リスト）をブログ用高級HTMLに変換
//   3. Markdownリンク [タイトル](URL) を target="_blank" の安全なHTMLリンクに自動変換
//   4. 記事集合・最終Codeノードへの受け渡し形式を完全保証
// ==============================================================================

const item = $input.first()?.json || {};

// --- 1. 本文テキストの安全抽出（Perplexity直後 / 保存ノード直後 / キャッシュ再開 すべてに対応） ---
let raw = (typeof item?.deep_dive === 'string' && item.deep_dive ? item.deep_dive : null)
       ?? (typeof item?.message === 'string' && item.message ? item.message : null)
       ?? item?.message?.content
       ?? item?.choices?.[0]?.message?.content
       ?? item?.content?.[0]?.text 
       ?? item?.content?.parts?.[0]?.text 
       ?? item?.output 
       ?? (typeof item === 'string' ? item : "");

// 直前ノードから取れなかった場合のフォールバック走査
if (!raw) {
  try { raw = $('★DeepDive即時保存').first()?.json?.deep_dive; } catch(e) {}
  if (!raw) {
    try { raw = $('文化DeepDive').first()?.json?.message || $('文化DeepDive').first()?.json?.output; } catch(e) {}
  }
}

const cleaned = (raw || '')
  .replace(/【Layer \d の文章】\s*/g, '')
  .split('\\n').join('\n')
  .split('\\t').join('\t')
  .trim();

// --- 2. 最初の行からタイトルを抽出 ---
const lines = cleaned.split('\n');
let title = "文化Deep Dive";
let bodyMd = cleaned;

if (lines.length > 0) {
  const firstLine = lines[0].trim();
  if (firstLine.startsWith('#')) {
    title = firstLine.replace(/^#+\s*/, '').trim();
    bodyMd = lines.slice(1).join('\n').trim();
  }
}

// --- 3. Markdown ➜ 高級ブログHTML変換関数 ---
function markdownToHtml(md) {
  return md
    // 不要な区切り線の除去
    .replace(/^\|[\s\-\—]+\|[\s\-\—]+\|.*$/gm, '')
    .replace(/^[\—\-]{3,}$/gm, '<hr style="border:none;border-top:2px dashed #e2e8f0;margin:35px 0;">')
    // 見出し (H2〜H4)
    .replace(/^### (.+)$/gm, '<h4 style="font-size:15px;font-weight:800;color:#2d3748;margin:24px 0 10px;padding-left:12px;border-left:3px solid #718096;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="font-size:16px;font-weight:900;color:#1a365d;border-left:5px solid #2b6cb0;padding:8px 14px;background:#ebf8ff;border-radius:0 8px 8px 0;margin:36px 0 16px;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="font-size:20px;font-weight:900;color:#1a365d;border-bottom:3px solid #2b6cb0;padding-bottom:10px;margin:40px 0 20px;">$1</h2>')
    // 太字
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Markdownリンク [テキスト](URL) のHTML化
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2b6cb0;text-decoration:underline;word-break:break-all;">$1</a>')
    // リストアイテム (- または *)
    .replace(/^[\-\*]\s+(.+)$/gm, '<li style="margin:6px 0;line-height:1.7;">$1</li>')
    // テーブル行の変換
    .replace(/^\|(.+)\|$/gm, (match, content) => {
      const cells = content.split('|').map(c => c.trim());
      const tag = cells.some(c => c.startsWith('**')) ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag} style="border:1px solid #e2e8f0;padding:10px 14px;">${c}</${tag}>`).join('') + '</tr>';
    })
    .replace(/<tr><t[hd][^>]*><\/t[hd]>(<t[hd][^>]*>-+<\/t[hd]>)+<\/tr>/g, '')
    // 引用ブロック (> テーマなど)
    .replace(/^>\s*(.+)$/gm, '<blockquote style="border-left:4px solid #3182ce;padding:12px 18px;background:#f7fafc;margin:20px 0;border-radius:0 8px 8px 0;color:#4a5568;font-size:14px;line-height:1.8;">$1</blockquote>')
    // 段落と改行
    .replace(/\n\n/g, '</p><p style="font-size:15px;line-height:2.0;color:#2d3748;margin:16px 0;">')
    .replace(/\n/g, '<br>');
}

// --- 4. Mermaidダイアグラムの一時退避と復元 ---
const mermaidPlaceholders = [];
const withoutMermaid = bodyMd.replace(/```mermaid[\s\S]*?```/g, (match) => {
  const idx = mermaidPlaceholders.length;
  mermaidPlaceholders.push(match);
  return `%%MERMAID_${idx}%%`;
});

// --- 5. タイトルバナーHTMLの構築 ---
const titleHtml = `
<div style="margin: 35px 0 25px 0; padding: 18px 24px; background: linear-gradient(135deg, #ebf8ff 0%, #bee3f8 100%); border-left: 6px solid #2b6cb0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
  <h2 style="margin: 0; font-size: 19px; font-weight: 900; color: #1a365d; letter-spacing: -0.3px; line-height: 1.4;">${title}</h2>
</div>
`;

let html = `<div class="deep-dive-content" style="font-size:15px;line-height:2.0;color:#2d3748;">${titleHtml}${markdownToHtml(withoutMermaid)}</div>`;

// Mermaidブロックを復元
mermaidPlaceholders.forEach((block, idx) => {
  html = html.replace(`%%MERMAID_${idx}%%`, block);
});

// --- 6. 国名の安全取得 ---
let countryName = 'インドネシア';
try { countryName = $('国名変換Code').first()?.json?.country || $('整形ノード1').first()?.json?.country || 'インドネシア'; } catch(e) {}

// --- 7. 記事集合・最終Code向けに返却 ---
return [{
  json: {
    article: html,
    deepDiveArticle: html,
    title: title,
    country: countryName
  }
}];

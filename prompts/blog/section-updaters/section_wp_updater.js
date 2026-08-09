const input = $input.first()?.json || {};

let postId = input.post_id || input.id || null;
let rawSectionType = input.section_type || input.section || 'music';

let sectionType = rawSectionType;
if (Array.isArray(sectionType)) sectionType = sectionType[0];
if (typeof sectionType === 'string' && sectionType.includes(':')) {
  const parts = sectionType.split(':').map(s => s.trim().toLowerCase());
  sectionType = parts.find(p => ['music', 'osusume', 'eizou', 'seido', 'chiri_keizai', 'chian', 'boeki', 'bukka', 'rekishi', 'doukou', 'deep_dive'].includes(p)) || parts[0];
}

let newSectionHtml = input.section_html || input.html || input.movie_section_html || '';
let currentWpHtml = input.wp_content || (typeof input.content?.rendered === 'string' ? input.content.rendered : '');

for (const item of $input.all()) {
  const j = item.json || {};
  if (!postId && (j.post_id || j.id)) postId = j.post_id || j.id;
  if (!newSectionHtml && (j.section_html || j.movie_section_html || j.html)) {
    newSectionHtml = j.section_html || j.movie_section_html || j.html;
  }
  if (!currentWpHtml && j.content?.rendered) {
    currentWpHtml = j.content.rendered;
  }
}

if (!postId) {
  try {
    postId = $('On form submission').first()?.json?.post_id || $('トリガー').first()?.json?.post_id || $('WP Get a Post').first()?.json?.id || $('Get a post').first()?.json?.id || $('WP Get Post').first()?.json?.id || null;
  } catch (e) {}
}

if (!newSectionHtml) {
  const possibleSectionNodes = ['music_section_html', 'movie_section_html', '音楽セクションHTML', '映画セクションHTML', '映画セクションHTML生成', 'Code', '映画10本の一括取得'];
  for (const name of possibleSectionNodes) {
    try {
      const n = $(name).first()?.json;
      if (n?.section_html || n?.movie_section_html || n?.html) {
        newSectionHtml = n.section_html || n.movie_section_html || n.html;
        if (!input.section_type && !input.section && (n.section_type || n.section)) {
          sectionType = n.section_type || n.section;
        }
        break;
      }
    } catch (e) {}
  }
}

if (!currentWpHtml) {
  const possibleWpNodes = ['WP Get a Post', 'Get a post', 'WP Get Post', 'WordPress', 'WordPress1', 'Get Post'];
  for (const name of possibleWpNodes) {
    try {
      const n = $(name).first()?.json;
      if (n?.content?.rendered) {
        currentWpHtml = n.content.rendered;
        break;
      } else if (typeof n?.content === 'string' && n.content.length > 20) {
        currentWpHtml = n.content;
        break;
      }
    } catch (e) {}
  }
}

if (!currentWpHtml || currentWpHtml.trim().length < 10) {
  throw new Error(`[置換エラー] 既存のWordPress記事本文(wp_content)が取得できていません。`);
}
if (!newSectionHtml || newSectionHtml.trim().length < 10) {
  throw new Error(`[置換エラー] 生成されたセクションHTML(section_html)が空です。`);
}

const sectionAliasMap = {
  '1': 'seido', '2': 'chiri_keizai', '3': 'chian', '4': 'boeki',
  '5': 'bukka', '6': 'rekishi', '7': 'doukou', '8': 'eizou',
  '9': 'osusume', '10': 'music', '11': 'music',
  movie: 'eizou', eizou: 'eizou', osusume: 'osusume', recommend: 'osusume',
  music: 'music', ongaku: 'music', deep_dive: 'deep_dive', deepdive: 'deep_dive',
  institution: 'seido', history: 'rekishi', crime: 'chian'
};

const canonicalSection = sectionAliasMap[sectionType] || sectionType;
let updatedContent = currentWpHtml.trim();
let matchFound = false;

function wrap(section, html) {
  const cleanHtml = html
    .replace(/<!--\s*SECTION:[^>]+?:START\s*-->/gi, '')
    .replace(/<!--\s*SECTION:[^>]+?:END\s*-->/gi, '')
    .trim();
  return `<!-- SECTION:${section}:START -->\n${cleanHtml}\n<!-- SECTION:${section}:END -->`;
}

// 1. 【最優先・最高精度】 コメントタグ `<!-- SECTION:<id>:START --> ... <!-- SECTION:<id>:END -->` による限定置換
const startRe = new RegExp(`<!--\\s*SECTION:${canonicalSection}:START\\s*-->`, 'gi');
const endRe = new RegExp(`<!--\\s*SECTION:${canonicalSection}:END\\s*-->`, 'gi');
const startCount = (updatedContent.match(startRe) || []).length;
const endCount = (updatedContent.match(endRe) || []).length;

if (startCount === 1 && endCount === 1) {
  const commentRe = new RegExp(`<!--\\s*SECTION:${canonicalSection}:START\\s*-->[\\s\\S]*?<!--\\s*SECTION:${canonicalSection}:END\\s*-->`, 'i');
  updatedContent = updatedContent.replace(commentRe, wrap(canonicalSection, newSectionHtml));
  matchFound = true;
} else {
  // 2. 【高精度】 見出しキーワード（「おすすめ音楽」「おすすめ映画」等）による限定置換
  const keywordsMap = {
    music: ['おすすめ音楽', 'ナショナルサウンドトラック', '⑩'],
    osusume: ['おすすめ映画', '⑨'],
    eizou: ['映像で知る', '⑧'],
    seido: ['制度の9つの皿', '①'],
    chiri_keizai: ['地理と経済', '②'],
    chian: ['治安と平和', '③'],
    boeki: ['貿易の衡量', '④'],
    bukka: ['物価比較', '⑤'],
    rekishi: ['歴史的背景', '⑥'],
    doukou: ['直近の動向', '⑦']
  };

  const keywords = keywordsMap[canonicalSection] || [];
  for (const kw of keywords) {
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const h2Regex = new RegExp(`<h2[^>]*>(?:(?!<\\/h2>)[\\s\\S])*?${escapedKw}(?:(?!<\\/h2>)[\\s\\S])*?<\\/h2>`, 'i');
    const h2Match = updatedContent.match(h2Regex);
    if (h2Match) {
      const startIndex = h2Match.index;
      const tail = updatedContent.substring(startIndex);
      const nextBoundaryMatch = tail.substring(h2Match[0].length).match(/<h2|<div id="deep-dive"|<!-- SECTION:/i);
      const boundaryOffset = nextBoundaryMatch ? h2Match[0].length + nextBoundaryMatch.index : tail.length;

      const before = updatedContent.substring(0, startIndex).trimEnd();
      const after = updatedContent.substring(startIndex + boundaryOffset).trimStart();

      updatedContent = before + '\n\n' + wrap(canonicalSection, newSectionHtml) + '\n\n' + after;
      matchFound = true;
      break;
    }
  }

  if (!matchFound) {
    throw new Error(`[置換エラー] セクション「${canonicalSection}」の挿入位置を特定できませんでした。二重挿入・消失を避けるため処理を中止しました。`);
  }
}

// 【安全自動ブロック機能】 元の本文に存在していたセクションが置換後に誤って消えていないか自動点検
const originalHasEizou = /<!--\s*SECTION:eizou:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑧(?:(?!<\/h2>)[\s\S])*?<\/h2>/i.test(currentWpHtml);
const originalHasOsusume = /<!--\s*SECTION:osusume:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑨(?:(?!<\/h2>)[\s\S])*?<\/h2>/i.test(currentWpHtml);
const originalHasMusic = /<!--\s*SECTION:music:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑩(?:(?!<\/h2>)[\s\S])*?<\/h2>/i.test(currentWpHtml);

const hasEizou = /<!--\s*SECTION:eizou:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑧(?:(?!<\/h2>)[\s\S])*?<\/h2>/i.test(updatedContent);
const hasOsusume = /<!--\s*SECTION:osusume:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑨(?:(?!<\/h2>)[\s\S])*?<\/h2>/i.test(updatedContent);
const hasMusic = /<!--\s*SECTION:music:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑩(?:(?!<\/h2>)[\s\S])*?<\/h2>/i.test(updatedContent);

if (originalHasEizou && !hasEizou) {
  throw new Error(`[安全保護エラー] 「⑧ 映像で知る」セクションが誤消去されるリスクを検知しました。WordPress投稿への送信を強制ブロックしました。`);
}
if (originalHasOsusume && !hasOsusume && canonicalSection !== 'osusume') {
  throw new Error(`[安全保護エラー] 「⑨ おすすめ映画」セクションが誤消去されるリスクを検知しました。WordPress投稿への送信を強制ブロックしました。`);
}
if (originalHasMusic && !hasMusic && canonicalSection !== 'music') {
  throw new Error(`[安全保護エラー] 「⑩ おすすめ音楽」セクションが誤消去されるリスクを検知しました。WordPress投稿への送信を強制ブロックしました。`);
}

return [{
  json: {
    post_id: postId,
    content: updatedContent,
    updated_section: canonicalSection,
    match_found: matchFound,
    safety_audit: "PASSED (他セクションの無事を確認済み)"
  }
}];
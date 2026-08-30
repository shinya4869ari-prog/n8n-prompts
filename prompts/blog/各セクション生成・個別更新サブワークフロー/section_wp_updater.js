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
    postId = $('WP Search Post')?.first()?.json?.id || $('WP Search a Post')?.first()?.json?.id || $('Search Post')?.first()?.json?.id || $('WP Get a Post')?.first()?.json?.id || $('Get a post')?.first()?.json?.id || $('WP Get Post')?.first()?.json?.id || $('Execute Workflow Trigger')?.first()?.json?.post_id || $('Switch1')?.first()?.json?.post_id || $('Switch')?.first()?.json?.post_id || $('On form submission')?.first()?.json?.post_id || $('トリガー')?.first()?.json?.post_id || null;
  } catch (e) {}
}

if (!newSectionHtml) {
  const possibleSectionNodes = [
    'chian_section_html', 'bukka_section_html', '治安セクションHTML', '物価セクションHTML', '治安', '物価',
    'doukou_section_html', '直近の動向HTML', '動向セクションHTML', 'deep_dive_section_html', 'ディープダイブHTML',
    'music_section_html', 'movie_section_html', '音楽セクションHTML', '映画セクションHTML', '映画セクションHTML生成',
    'Code', 'Code1', 'Code2', 'Code3', '映画10本の一括取得'
  ];
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
  const possibleWpNodes = ['WP Search Post', 'WP Search a Post', 'Search Post', 'WP Get a Post', 'Get a post', 'WP Get Post', 'WordPress', 'WordPress1', 'Get Post'];
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

// ★ 元々の記事に書かれていた「エラーネコの一言」の救出と完全維持
function preserveOriginalNeko(oldSectionText, newHtml) {
  if (!oldSectionText || !newHtml) return newHtml;

  // 手動でフォームから新しいコメントが明示指定されている場合のみ、それを優先
  const manualNeko = input.neko_comment || input.neko;
  if (manualNeko && String(manualNeko).trim().length > 0) return newHtml;

  // 既存の古いセクションから「エラーネコの一言」の本文を抽出
  const nekoMatch = oldSectionText.match(/<strong>エラーネコの一言：<\/strong><br>([\s\S]*?)<\/div>/i) ||
                    oldSectionText.match(/🐱\s*エラーネコ[：:]([\s\S]*?)(?:<\/div>|\n|$)/i);

  if (nekoMatch && nekoMatch[1]) {
    const originalNekoContent = nekoMatch[1].trim();
    // 新しいHTMLの中のエラーネコ吹き出し部分を、元々のオリジナルコメントで置換・復元！
    return newHtml.replace(
      /(<strong[^>]*>エラーネコの一言：<\/strong><br>)([\s\S]*?)(<\/div>)/i,
      `$1${originalNekoContent}$3`
    );
  }
  return newHtml;
}

// ★★★【治安・物価の超安全・セクション限定テーブル置換】★★★
// セクション外（② 地理経済や④ 貿易）には一切触れず、
// 対象セクション内部の「テーブル部分」だけを安全にピンポイント差し替える！
if (canonicalSection === 'chian') {
  const chianSectionRegex = /(<!--\s*SECTION:chian:START\s*-->[\s\S]*?<!--\s*SECTION:chian:END\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?③(?:(?!<\/h2>)[\s\S])*?治安[\s\S]*?)(?=(?:<h2|<div id="deep-dive"|<!-- SECTION:|$))/i;
  const secMatch = updatedContent.match(chianSectionRegex);

  if (secMatch) {
    const secText = secMatch[0];
    const chianTableRegex = /(?:<div[^>]*>[\s\r\n]*)?<table[^>]*>(?:(?!<table|<\/table>)[\s\S])*?治安・社会指標(?:(?!<\/table>)[\s\S])*?<\/table>(?:[\s\r\n]*<\/div>)?/i;
    const oldTable = secText.match(chianTableRegex);
    const newTable = newSectionHtml.match(chianTableRegex);

    if (oldTable && newTable) {
      const newSecText = secText.replace(chianTableRegex, newTable[0]);
      updatedContent = updatedContent.replace(secText, newSecText);
      matchFound = true;
    }
  }
} else if (canonicalSection === 'bukka') {
  const bukkaSectionRegex = /(<!--\s*SECTION:bukka:START\s*-->[\s\S]*?<!--\s*SECTION:bukka:END\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑤(?:(?!<\/h2>)[\s\S])*?物価[\s\S]*?)(?=(?:<h2|<div id="deep-dive"|<!-- SECTION:|$))/i;
  const secMatch = updatedContent.match(bukkaSectionRegex);

  if (secMatch) {
    const secText = secMatch[0];
    const bukkaBlockRegex = /(?:<div[^>]*>(?:(?!<div|<\/div>)[\s\S])*?為替レート基準[\s\S]*?<\/div>[\s\r\n]*)?(?:<div[^>]*>[\s\r\n]*)?<table[^>]*>(?:(?!<table|<\/table>)[\s\S])*?品目(?:(?!<\/table>)[\s\S])*?<\/table>(?:[\s\r\n]*<\/div>)?/i;
    const oldTable = secText.match(bukkaBlockRegex);
    const newTable = newSectionHtml.match(bukkaBlockRegex);

    if (oldTable && newTable) {
      const newSecText = secText.replace(bukkaBlockRegex, newTable[0]);
      updatedContent = updatedContent.replace(secText, newSecText);
      matchFound = true;
    }
  }
}

// 1. 【テーブル置換が未実行の場合のフォールバック】 コメントタグによる置換
if (!matchFound) {
  const startRe = new RegExp(`<!--\\s*SECTION:${canonicalSection}:START\\s*-->`, 'gi');
  const endRe = new RegExp(`<!--\\s*SECTION:${canonicalSection}:END\\s*-->`, 'gi');
  const startCount = (updatedContent.match(startRe) || []).length;
  const endCount = (updatedContent.match(endRe) || []).length;

  if (startCount === 1 && endCount === 1) {
    const commentRe = new RegExp(`<!--\\s*SECTION:${canonicalSection}:START\\s*-->([\\s\\S]*?)<!--\\s*SECTION:${canonicalSection}:END\\s*-->`, 'i');
    const oldMatch = updatedContent.match(commentRe);
    const oldSectionText = oldMatch ? oldMatch[1] : '';
    const finalHtml = preserveOriginalNeko(oldSectionText, newSectionHtml);
    updatedContent = updatedContent.replace(commentRe, wrap(canonicalSection, finalHtml));
    matchFound = true;
  } else {
    // 2. 【高精度】 見出しキーワードによる置換
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

      const oldSectionText = tail.substring(0, boundaryOffset);
      const finalHtml = preserveOriginalNeko(oldSectionText, newSectionHtml);

      const before = updatedContent.substring(0, startIndex).trimEnd();
      const after = updatedContent.substring(startIndex + boundaryOffset).trimStart();

      updatedContent = before + '\n\n' + wrap(canonicalSection, finalHtml) + '\n\n' + after;
      matchFound = true;
      break;
    }
  }

  if (!matchFound) {
    throw new Error(`[置換エラー] セクション「${canonicalSection}」の挿入位置を特定できませんでした。二重挿入・消失を避けるため処理を中止しました。`);
  }
}
}

// 【目次TOC自動修復】過去記事で音楽セクションが #section-11 になっていた場合の自動修復
updatedContent = updatedContent.replace(/(<a[^>]+href=["'])#section-11(["'][^>]*>[\s\S]*?おすすめ音楽)/gi, '$1#section-10$2');

// 【全セクション完全保護ブロック機能】 元の本文に存在していた全11セクションが置換後に1つでも誤消去されていないか検証
const allSectionsCheck = [
  { key: 'seido', name: '① 制度の9つの皿', regex: /<!--\s*SECTION:seido:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?①(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'chiri_keizai', name: '② 地理と経済の衡量', regex: /<!--\s*SECTION:chiri_keizai:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?②(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'chian', name: '③ 治安と平和の衡量', regex: /<!--\s*SECTION:chian:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?③(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'boeki', name: '④ 貿易の衡量', regex: /<!--\s*SECTION:boeki:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?④(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'bukka', name: '⑤ 生活・価値の衡量', regex: /<!--\s*SECTION:bukka:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑤(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'rekishi', name: '⑥ 歴史的背景', regex: /<!--\s*SECTION:rekishi:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑥(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'doukou', name: '⑦ 直近の動向', regex: /<!--\s*SECTION:doukou:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑦(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'eizou', name: '⑧ 映像で知る', regex: /<!--\s*SECTION:eizou:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑧(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'osusume', name: '⑨ おすすめ映画', regex: /<!--\s*SECTION:osusume:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑨(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'music', name: '⑩ おすすめ音楽', regex: /<!--\s*SECTION:music:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑩(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'deep_dive', name: '✦ Deep Dive', regex: /<!--\s*SECTION:deep_dive:START\s*-->|<div id="deep-dive"/i }
];

for (const sec of allSectionsCheck) {
  if (sec.key !== canonicalSection) {
    const wasPresent = sec.regex.test(currentWpHtml);
    const isPresent = sec.regex.test(updatedContent);
    if (wasPresent && !isPresent) {
      throw new Error(`[安全保護エラー] 「${sec.name}」セクションが誤消去されるリスクを検知しました。WordPress投稿への送信を強制ブロックしました。`);
    }
  }
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
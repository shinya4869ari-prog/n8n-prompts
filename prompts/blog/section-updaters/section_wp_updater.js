const input = $input.first()?.json || {};

let postId = input.post_id || input.id || null;
let sectionType = input.section_type || input.section || 'eizou';
if (Array.isArray(sectionType)) sectionType = sectionType[0];

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
  const possibleMovieNodes = ['movie_section_html', '映画セクションHTML', '映画セクションHTML生成', 'Code', '映画10本の一括取得'];
  for (const name of possibleMovieNodes) {
    try {
      const n = $(name).first()?.json;
      if (n?.section_html || n?.movie_section_html || n?.html) {
        newSectionHtml = n.section_html || n.movie_section_html || n.html;
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
  '9': 'osusume', '10': 'deep_dive',
  movie: 'eizou', institution: 'seido', history: 'rekishi', crime: 'chian'
};

const numMap = { seido: 1, chiri_keizai: 2, chian: 3, boeki: 4, bukka: 5, rekishi: 6, doukou: 7, eizou: 8, osusume: 9 };

const canonicalSection = sectionAliasMap[sectionType] || sectionType;
let updatedContent = currentWpHtml.trim();
let matchFound = false;

function wrap(section, html) {
  return `<!-- SECTION:${section}:START -->\n${html.trim()}\n<!-- SECTION:${section}:END -->`;
}

// 全ての section-N 見出しの位置を収集
function findAllSectionHeaders(text) {
  const re = /<h2[^>]*id="section-(\d+)"[^>]*>/gi;
  const list = [];
  let m;
  while ((m = re.exec(text)) !== null) list.push({ num: parseInt(m[1], 10), index: m.index });
  return list;
}

function findAllDeepDiveMarkers(text) {
  const re = /<div id="deep-dive"[^>]*>/gi;
  const list = [];
  let m;
  while ((m = re.exec(text)) !== null) list.push(m.index);
  return list;
}

function findNextBoundary(text, pos, headers, deepDives) {
  let candidates = [];
  headers.forEach(h => { if (h.index > pos) candidates.push(h.index); });
  deepDives.forEach(d => { if (d > pos) candidates.push(d); });
  if (candidates.length === 0) return text.length;
  return Math.min(...candidates);
}

// id="section-N" 基準の置換（重複があれば自動で1つに畳み込む）
function replaceNumberedSection(text, num, section, newHtml) {
  const headers = findAllSectionHeaders(text);
  const deepDives = findAllDeepDiveMarkers(text);
  const starts = headers.filter(h => h.num === num).map(h => h.index).sort((a, b) => a - b);

  if (starts.length === 0) {
    throw new Error(`[置換エラー] id="section-${num}" の見出しが見つかりませんでした。生成側のH2に id="section-${num}" が付与されているか確認してください。処理を中止しました（誤消失・重複を避けるため）。`);
  }

  const firstStart = starts[0];
  const lastStart = starts[starts.length - 1];
  const boundaryAfterLast = findNextBoundary(text, lastStart, headers, deepDives);

  let partBefore = text.substring(0, firstStart).trimEnd();
  let partAfter = text.substring(boundaryAfterLast).trimStart();

  // 見出しの手前や直後に残っている対象セクションの不要なタグ（増殖の元凶）を完全除去・掃除
  const junkRe = new RegExp(`(<p>|<br\\s*\\/?>)*\\s*<!--\\s*SECTION:${section}:(START|END)\\s*-->\\s*(<br\\s*\\/?>|<\\/p>)*`, 'gi');
  partBefore = partBefore.replace(junkRe, '').trimEnd();
  partAfter = partAfter.replace(junkRe, '').trimStart();

  return partBefore + '\n\n' + wrap(section, newHtml) + '\n\n' + partAfter;
}

// ---------------------------------------------------------------
// 0. コメントマーカーが完全な形（START/ENDが1組だけ）で存在する場合は最優先で使う
//    ⑧⑨含め、全セクション共通のルート
// ---------------------------------------------------------------
{
  const startRe = new RegExp(`<!-- SECTION:${canonicalSection}:START -->`, 'gi');
  const endRe = new RegExp(`<!-- SECTION:${canonicalSection}:END -->`, 'gi');
  const startCount = (updatedContent.match(startRe) || []).length;
  const endCount = (updatedContent.match(endRe) || []).length;

  if (startCount === 1 && endCount === 1) {
    const commentRe = new RegExp(`<!-- SECTION:${canonicalSection}:START -->[\\s\\S]*?<!-- SECTION:${canonicalSection}:END -->`, 'i');
    updatedContent = updatedContent.replace(commentRe, wrap(canonicalSection, newSectionHtml));
    matchFound = true;
  } else if (startCount > 1 || endCount > 1) {
    // コメントマーカー自体が壊れて重複している場合は、id基準（⑧⑨）以外は危険なので停止
    if (!(canonicalSection === 'eizou' || canonicalSection === 'osusume')) {
      throw new Error(`[置換エラー] 「${canonicalSection}」のSECTIONコメントが重複しています（START:${startCount}件, END:${endCount}件）。本文を手動確認してください。`);
    }
    // eizou/osusumeはこの後 id="section-N" 方式のフォールバックへ進む
  }
}

// ---------------------------------------------------------------
// 1. コメントマーカーで解決しなかった場合のフォールバック
// ---------------------------------------------------------------
if (!matchFound) {

  if (canonicalSection === 'eizou' || canonicalSection === 'osusume') {
    const num = numMap[canonicalSection];
    updatedContent = replaceNumberedSection(updatedContent, num, canonicalSection, newSectionHtml);
    matchFound = true;

  } else {
    const sectionPatterns = {
      deep_dive: [
        /<!-- SECTION:deep_dive:START -->[\s\S]*?<!-- SECTION:deep_dive:END -->/i,
        /<!-- START_DEEP_DIVE_SECTION -->[\s\S]*?<!-- END_DEEP_DIVE_SECTION -->/i,
        /<div id="deep-dive"[\s\S]*$/i
      ],
      seido: [/<h2[^>]*id="section-1"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
      chiri_keizai: [/<h2[^>]*id="section-2"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
      chian: [/<h2[^>]*id="section-3"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
      boeki: [/<h2[^>]*id="section-4"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
      bukka: [/<h2[^>]*id="section-5"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
      rekishi: [/<h2[^>]*id="section-6"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
      doukou: [/<h2[^>]*id="section-7"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i]
    };

    const patterns = sectionPatterns[canonicalSection] || [
      new RegExp(`<!-- SECTION:${canonicalSection}:START -->[\\s\\S]*?<!-- SECTION:${canonicalSection}:END -->`, 'i')
    ];

    for (const pattern of patterns) {
      if (pattern.test(updatedContent)) {
        updatedContent = updatedContent.replace(pattern, wrap(canonicalSection, newSectionHtml));
        matchFound = true;
        break;
      }
    }

    if (!matchFound) {
      throw new Error(`[置換エラー] セクション「${canonicalSection}」の挿入位置を特定できませんでした。二重挿入・消失を避けるため処理を中止しました。`);
    }
  }
}

return [{
  json: {
    post_id: postId,
    content: updatedContent,
    updated_section: canonicalSection,
    match_found: matchFound
  }
}];
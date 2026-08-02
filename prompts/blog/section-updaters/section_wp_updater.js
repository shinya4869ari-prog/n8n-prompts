/**
 * 【各セクション単体更新・万能HTML置換＆映画ゾーン全自動クリーンアップコード】
 * 
 * WordPressの既存記事本文（currentWpHtml）から、指定された section_type のセクションブロックのみを
 * 最新の生成HTMLで安全に置き換え（Update）します。
 */

const input = $input.first()?.json || {};

// postIdの取得
let postId = input.post_id || input.id || null;

// 修正したいセクション種別 ('seido', 'chiri_keizai', 'chian', 'boeki', 'bukka', 'rekishi', 'doukou', 'eizou', 'osusume', 'deep_dive')
let sectionType = input.section_type || input.section || 'eizou';
if (Array.isArray(sectionType)) sectionType = sectionType[0];

// 新しく生成・取得したセクションHTML
let newSectionHtml = input.section_html || input.html || input.movie_section_html || '';

// WordPressから取得した既存の記事本文HTML (WP Get Postノード)
let currentWpHtml = input.wp_content || (typeof input.content?.rendered === 'string' ? input.content.rendered : '');

// $inputの全アイテムから探索
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

// 他のノード名からのフォールバック取得
if (!postId) {
  try {
    postId = $('On form submission').first()?.json?.post_id || $('トリガー').first()?.json?.post_id || $('WP Get a Post').first()?.json?.id || $('Get a post').first()?.json?.id || $('WP Get Post').first()?.json?.id || null;
  } catch(e) {}
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
    } catch(e) {}
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
    } catch(e) {}
  }
}

if (!currentWpHtml || currentWpHtml.trim().length < 10) {
  throw new Error(`[置換エラー] 既存のWordPress記事本文(wp_content / content.rendered)が取得できていません。「WP Get a Post」ノードが正しく実行されているか確認してください。`);
}

if (!newSectionHtml || newSectionHtml.trim().length < 10) {
  throw new Error(`[置換エラー] 生成されたセクションHTML(section_html)が空です。「movie_section_html」ノードが正しく実行されているか確認してください。`);
}

// セクションIDエイリアス正規化マップ
const sectionAliasMap = {
  '1': 'seido',
  '2': 'chiri_keizai',
  '3': 'chian',
  '4': 'boeki',
  '5': 'bukka',
  '6': 'rekishi',
  '7': 'doukou',
  '8': 'eizou',
  '9': 'osusume',
  '10': 'deep_dive',
  movie: 'eizou',
  institution: 'seido',
  history: 'rekishi',
  crime: 'chian'
};

const canonicalSection = sectionAliasMap[sectionType] || sectionType;
let updatedContent = currentWpHtml.trim();

// --- 映画セクション（8番 eizou & 9番 osusume）のゾーン再構築アルゴリズム ---
if (canonicalSection === 'eizou' || canonicalSection === 'osusume') {
  // 1. 本文を「映画ゾーンより前(Part A)」「映画ゾーン(Movie Zone)」「Deep-Dive以降(Part B)」に完全3分割
  let partA = '';
  let movieZone = '';
  let partB = '';

  const deepDiveMatch = updatedContent.match(/(<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|<!-- START_DEEP_DIVE_SECTION -->[\s\S]*)/i);

  if (deepDiveMatch) {
    partB = deepDiveMatch[0];
    const beforeDeepDive = updatedContent.substring(0, deepDiveMatch.index);

    const movieStartMatch = beforeDeepDive.match(/(<!-- SECTION:(?:eizou|osusume):START -->|<h2[^>]*id="section-[89]"|<!-- START_(?:MOVIE|RECOMMENDED)_SECTION -->|<h2[^>]*>(?:<span[^>]*>)?[\s\S]*?(?:映像で知る|特別枠|おすすめ映画))/i);

    if (movieStartMatch) {
      partA = beforeDeepDive.substring(0, movieStartMatch.index);
      movieZone = beforeDeepDive.substring(movieStartMatch.index);
    } else {
      partA = beforeDeepDive;
      movieZone = '';
    }
  } else {
    const movieStartMatch = updatedContent.match(/(<!-- SECTION:(?:eizou|osusume):START -->|<h2[^>]*id="section-[89]"|<!-- START_(?:MOVIE|RECOMMENDED)_SECTION -->|<h2[^>]*>(?:<span[^>]*>)?[\s\S]*?(?:映像で知る|特別枠|おすすめ映画))/i);
    if (movieStartMatch) {
      partA = updatedContent.substring(0, movieStartMatch.index);
      movieZone = updatedContent.substring(movieStartMatch.index);
    } else {
      partA = updatedContent;
      movieZone = '';
    }
  }

  // 2. 既存の映画ゾーンの中から、正しい 8番(eizou) と 9番(osusume) のブロックを抽出（重複・旧ゴミは排除）
  let existingSec8 = '';
  let existingSec9 = '';

  if (movieZone) {
    const sec8Match = movieZone.match(/<!-- SECTION:eizou:START -->[\s\S]*?<!-- SECTION:eizou:END -->|<h2[^>]*id="section-8"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|$)/i);
    if (sec8Match && (sec8Match[0].includes('映像で知る') || sec8Match[0].includes('section-8') || sec8Match[0].includes('eizou'))) {
      existingSec8 = sec8Match[0].trim();
    }

    const sec9Match = movieZone.match(/<!-- SECTION:osusume:START -->[\s\S]*?<!-- SECTION:osusume:END -->|<h2[^>]*id="section-9"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|$)/i);
    if (sec9Match && (sec9Match[0].includes('特別枠') || sec9Match[0].includes('おすすめ映画') || sec9Match[0].includes('section-9') || sec9Match[0].includes('osusume'))) {
      existingSec9 = sec9Match[0].trim();
    }
  }

  // 3. 更新された最新セクションHTMLをセットし、映画ゾーンを「8番 ➔ 9番」の順序で完全固定再構築！
  let finalSec8 = canonicalSection === 'eizou' ? newSectionHtml.trim() : existingSec8;
  let finalSec9 = canonicalSection === 'osusume' ? newSectionHtml.trim() : existingSec9;

  let rebuiltMovieZone = '';
  if (finalSec8 && finalSec9) {
    rebuiltMovieZone = `${finalSec8}\n\n${finalSec9}`;
  } else if (finalSec8) {
    rebuiltMovieZone = finalSec8;
  } else if (finalSec9) {
    rebuiltMovieZone = finalSec9;
  }

  // Part A + 再構築された映画ゾーン + Part B を結合！
  updatedContent = partA.trim() + '\n\n' + rebuiltMovieZone + (partB ? '\n\n' + partB.trim() : '');
} else {
  // 他のセクション (1〜7, 10) の更新
  const newFormatRegex = new RegExp(`<!-- SECTION:${canonicalSection}:START -->[\\s\\S]*?<!-- SECTION:${canonicalSection}:END -->`, 'i');
  const legacyRegexMap = {
    deep_dive: /<!-- START_DEEP_DIVE_SECTION -->[\s\S]*?<!-- END_DEEP_DIVE_SECTION -->/i,
    seido: /<!-- START_INSTITUTION_SECTION -->[\s\S]*?<!-- END_INSTITUTION_SECTION -->/i,
    rekishi: /<!-- START_HISTORY_SECTION -->[\s\S]*?<!-- END_HISTORY_SECTION -->/i,
    chian: /<!-- START_CRIME_SECTION -->[\s\S]*?<!-- END_CRIME_SECTION -->/i
  };

  let matchFound = false;
  if (newFormatRegex.test(updatedContent)) {
    updatedContent = updatedContent.replace(newFormatRegex, newSectionHtml.trim());
    matchFound = true;
  } else if (legacyRegexMap[canonicalSection] && legacyRegexMap[canonicalSection].test(updatedContent)) {
    updatedContent = updatedContent.replace(legacyRegexMap[canonicalSection], newSectionHtml.trim());
    matchFound = true;
  }

  if (!matchFound) {
    updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
  }
}

return [{
  json: {
    post_id: postId,
    content: updatedContent,
    updated_section: canonicalSection,
    match_found: true
  }
}];

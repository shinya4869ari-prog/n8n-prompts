/**
 * 【各セクション単体更新・万能HTML置換コード】
 * 
 * WordPressの既存記事本文（currentWpHtml）から、指定された section_type のセクションブロックのみを
 * 最新の生成HTMLで安全に置き換え（Update）します。
 */

const input = $input.first()?.json || {};

// postIdの取得（input.post_id, input.id, または他ノードからの安全取得）
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

let updatedContent = currentWpHtml;

// セクションIDエイリアス正規化マップ（番号 1〜10 対応）
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
  // 旧文字エイリアス互換
  movie: 'eizou',
  institution: 'seido',
  history: 'rekishi',
  crime: 'chian'
};

const canonicalSection = sectionAliasMap[sectionType] || sectionType;

if (!currentWpHtml || currentWpHtml.trim().length < 10) {
  throw new Error(`[置換エラー] 既存のWordPress記事本文(wp_content / content.rendered)が取得できていません。「WP Get a Post」ノードが正しく実行されているか確認してください。`);
}

if (!newSectionHtml || newSectionHtml.trim().length < 10) {
  throw new Error(`[置換エラー] 生成されたセクションHTML(section_html)が空です。「movie_section_html」ノードが正しく実行されているか確認してください。`);
}

// 0. ディープダイブより下に漂流・誤追記された8番/9番セクションを事前に自動クリーンアップ
if (currentWpHtml.includes('id="deep-dive"') || currentWpHtml.includes('<!-- SECTION:deep_dive:START -->')) {
  const parts = currentWpHtml.split(/(<div id="deep-dive"|<!-- SECTION:deep_dive:START -->)/i);
  if (parts.length >= 3) {
    const headerAndBody = parts[0];
    const deepDiveMarker = parts[1];
    let deepDiveAndTail = parts.slice(2).join('');

    // 末尾に誤追記された 8番または9番セクションを除去
    deepDiveAndTail = deepDiveAndTail
      .replace(/<!-- SECTION:(?:eizou|osusume):START -->[\s\S]*?<!-- SECTION:(?:eizou|osusume):END -->/gi, '')
      .replace(/<h2[^>]*id="section-[89]"[^>]*>[\s\S]*?(?=<div id="deep-dive"|<!-- SECTION:|$)/gi, '');

    updatedContent = headerAndBody + deepDiveMarker + deepDiveAndTail;
  }
}

let matchFound = false;

// --- 映画セクション（8番・9番）およびその他セクションの個別更新 ---
if (canonicalSection === 'eizou') {
  // 【⑧ 映像作品セクション更新】 常に1番目の映画ブロック位置をターゲット
  const eizouRegex = /<!-- SECTION:eizou:START -->[\s\S]*?<!-- SECTION:eizou:END -->|<h2[^>]*id="section-8"[^>]*>[\s\S]*?(?=<h2[^>]*id="section-9"|<!-- SECTION:osusume:START -->|<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|$)/i;
  const legacyEizouRegex = /<!-- START_MOVIE_SECTION -->[\s\S]*?<!-- END_MOVIE_SECTION -->/i;

  if (eizouRegex.test(updatedContent)) {
    updatedContent = updatedContent.replace(eizouRegex, newSectionHtml.trim());
    matchFound = true;
  } else if (legacyEizouRegex.test(updatedContent)) {
    updatedContent = updatedContent.replace(legacyEizouRegex, newSectionHtml.trim());
    matchFound = true;
  } else {
    // 8番タグが消えて1番目の映画ブロックが 9番のタグになってしまっている場合の自動復元置換
    const firstSec9Regex = /(<!-- SECTION:osusume:START -->[\s\S]*?<!-- SECTION:osusume:END -->|<h2[^>]*id="section-9"[^>]*>[\s\S]*?(?=<h2[^>]*id="section-9"|<!-- SECTION:osusume:START -->|<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|$))/i;
    if (firstSec9Regex.test(updatedContent)) {
      updatedContent = updatedContent.replace(firstSec9Regex, newSectionHtml.trim());
      matchFound = true;
    }
  }
} else if (canonicalSection === 'osusume') {
  // 【⑨ おすすめ映画セクション更新】 常に2番目の映画ブロック位置（またはsection-9）をターゲット
  const osusumeBlocks = updatedContent.match(/(<!-- SECTION:osusume:START -->[\s\S]*?<!-- SECTION:osusume:END -->|<h2[^>]*id="section-9"[^>]*>[\s\S]*?(?=<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|$))/gi);
  
  if (osusumeBlocks && osusumeBlocks.length >= 2) {
    // 映画ブロックが2つ以上ある場合、1番目(8番の位置)は触らず、必ず2番目を置換！
    let count = 0;
    updatedContent = updatedContent.replace(/(<!-- SECTION:osusume:START -->[\s\S]*?<!-- SECTION:osusume:END -->|<h2[^>]*id="section-9"[^>]*>[\s\S]*?(?=<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|$))/gi, (match) => {
      count++;
      return count === 2 ? newSectionHtml.trim() : match;
    });
    matchFound = true;
  } else {
    const singleOsusumeRegex = /<!-- SECTION:osusume:START -->[\s\S]*?<!-- SECTION:osusume:END -->|<h2[^>]*id="section-9"[^>]*>[\s\S]*?(?=<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|$)/i;
    const legacyOsusumeRegex = /<!-- START_RECOMMENDED_SECTION -->[\s\S]*?<!-- END_RECOMMENDED_SECTION -->/i;

    if (singleOsusumeRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(singleOsusumeRegex, newSectionHtml.trim());
      matchFound = true;
    } else if (legacyOsusumeRegex.test(updatedContent)) {
      updatedContent = updatedContent.replace(legacyOsusumeRegex, newSectionHtml.trim());
      matchFound = true;
    }
  }
} else {
  // 他の標準セクション（制度、歴史、治安、Deep Dive等）
  const legacyRegexMap = {
    deep_dive: /<!-- START_DEEP_DIVE_SECTION -->[\s\S]*?<!-- END_DEEP_DIVE_SECTION -->/i,
    seido: /<!-- START_INSTITUTION_SECTION -->[\s\S]*?<!-- END_INSTITUTION_SECTION -->/i,
    rekishi: /<!-- START_HISTORY_SECTION -->[\s\S]*?<!-- END_HISTORY_SECTION -->/i,
    chian: /<!-- START_CRIME_SECTION -->[\s\S]*?<!-- END_CRIME_SECTION -->/i
  };

  const reg = legacyRegexMap[canonicalSection];
  if (reg && reg.test(updatedContent)) {
    updatedContent = updatedContent.replace(reg, newSectionHtml.trim());
    matchFound = true;
  }
}

if (!matchFound) {
  // 置換タグが本文内に見つからなかった場合は末尾に追記
  updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
}

return [{
  json: {
    post_id: postId,
    content: updatedContent,
    updated_section: canonicalSection,
    match_found: matchFound
  }
}];


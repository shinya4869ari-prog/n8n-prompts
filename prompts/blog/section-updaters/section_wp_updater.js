/**
 * 【各セクション単体更新・万能HTML置換コード】
 * 
 * WordPressの既存記事本文（currentWpHtml）から、指定された section_type のセクションブロックのみを
 * 最新の生成HTMLで安全に置き換え（Update）します。
 */

const input = $input.first()?.json || {};

// postIdの取得（input.post_id, input.id, または他ノードからの安全取得）
let postId = input.post_id || input.id || null;
if (!postId) {
  try {
    postId = $('On form submission').first().json.post_id || $('トリガー').first().json.post_id || $('WP Get a Post').first().json.id || $('WP Get Post').first().json.id || null;
  } catch(e) {}
}

// 修正したいセクション種別 ('seido', 'chiri_keizai', 'chian', 'boeki', 'bukka', 'rekishi', 'doukou', 'eizou', 'osusume', 'deep_dive')
let sectionType = input.section_type || input.section || 'eizou';
if (Array.isArray(sectionType)) sectionType = sectionType[0];

// 新しく生成・取得したセクションHTML
let newSectionHtml = input.section_html || input.html || input.movie_section_html || '';
if (!newSectionHtml) {
  try {
    newSectionHtml = $('movie_section_html').first().json.section_html || $('Code').first().json.section_html || '';
  } catch(e) {}
}

// WordPressから取得した既存の記事本文HTML (WP Get Postノード)
let currentWpHtml = input.wp_content || input.content?.rendered || (typeof input.content === 'string' ? input.content : '');
if (!currentWpHtml) {
  try {
    const wpNode = $('WP Get a Post').first().json || $('WP Get Post').first().json || {};
    currentWpHtml = wpNode.content?.rendered || wpNode.content || '';
  } catch(e) {}
}

let updatedContent = currentWpHtml;

// セクションIDエイリアス正規化マップ（旧互換用）
const sectionAliasMap = {
  movie: 'eizou',
  institution: 'seido',
  history: 'rekishi',
  crime: 'chian'
};

const canonicalSection = sectionAliasMap[sectionType] || sectionType;

// 置換用正規表現（新標準フォーマット: <!-- SECTION:<id>:START --> ... <!-- SECTION:<id>:END -->）
const newFormatRegex = new RegExp(`<!-- SECTION:${canonicalSection}:START -->[\\s\\S]*?<!-- SECTION:${canonicalSection}:END -->`, 'g');

// 旧フォーマットタグマップ（互換用）
const legacyRegexMap = {
  eizou: /<!-- START_MOVIE_SECTION -->[\s\S]*?<!-- END_MOVIE_SECTION -->/g,
  osusume: /<!-- START_MOVIE_SECTION -->[\s\S]*?<!-- END_MOVIE_SECTION -->/g,
  deep_dive: /<!-- START_DEEP_DIVE_SECTION -->[\s\S]*?<!-- END_DEEP_DIVE_SECTION -->/g,
  seido: /<!-- START_INSTITUTION_SECTION -->[\s\S]*?<!-- END_INSTITUTION_SECTION -->/g,
  rekishi: /<!-- START_HISTORY_SECTION -->[\s\S]*?<!-- END_HISTORY_SECTION -->/g,
  chian: /<!-- START_CRIME_SECTION -->[\s\S]*?<!-- END_CRIME_SECTION -->/g
};

let matchFound = false;

if (newFormatRegex.test(currentWpHtml)) {
  updatedContent = currentWpHtml.replace(newFormatRegex, newSectionHtml.trim());
  matchFound = true;
} else if (legacyRegexMap[canonicalSection] && legacyRegexMap[canonicalSection].test(currentWpHtml)) {
  updatedContent = currentWpHtml.replace(legacyRegexMap[canonicalSection], newSectionHtml.trim());
  matchFound = true;
} else {
  // 置換タグが本文内に存在しない場合は、本文末尾に安全にセクションを追加追記
  updatedContent = currentWpHtml + '\n\n' + newSectionHtml.trim();
}

return [{
  json: {
    post_id: postId,
    content: updatedContent,
    updated_section: canonicalSection,
    match_found: matchFound
  }
}];


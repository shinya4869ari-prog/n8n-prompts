/**
 * 【各セクション単体更新・万能HTML置換コード】
 * 
 * WordPressの既存記事本文（currentWpHtml）から、指定された section_type のセクションブロックのみを
 * 最新の生成HTMLで安全に置き換え（Update）します。
 */

const input = $input.first()?.json || {};
const postId = input.post_id || null;
// 修正したいセクション種別 ('movie', 'deep_dive', 'institution', 'history', 'crime')
const sectionType = input.section_type || 'movie';

// 新しく生成・取得したセクションHTML
const newSectionHtml = input.section_html || input.movie_section_html || '';

// WordPressから取得した既存の記事本文HTML (WP Get Postノード)
const currentWpHtml = input.wp_content || input.content?.rendered || '';

let updatedContent = currentWpHtml;

// 各セクションの置換タグ判定
const sectionPatterns = {
  movie: /<!-- START_MOVIE_SECTION -->[\s\S]*?<!-- END_MOVIE_SECTION -->/g,
  deep_dive: /<!-- START_DEEP_DIVE_SECTION -->[\s\S]*?<!-- END_DEEP_DIVE_SECTION -->/g,
  institution: /<!-- START_INSTITUTION_SECTION -->[\s\S]*?<!-- END_INSTITUTION_SECTION -->/g,
  history: /<!-- START_HISTORY_SECTION -->[\s\S]*?<!-- END_HISTORY_SECTION -->/g,
  crime: /<!-- START_CRIME_SECTION -->[\s\S]*?<!-- END_CRIME_SECTION -->/g
};

const targetRegex = sectionPatterns[sectionType];

if (targetRegex && targetRegex.test(currentWpHtml)) {
  // 既存のセクションブロックタグが存在する場合は、そこだけを綺麗に上書き置換
  updatedContent = currentWpHtml.replace(targetRegex, newSectionHtml);
} else {
  // 置換タグが本文内にまだ存在しない場合は、本文末尾にセクションを追加追記
  updatedContent = currentWpHtml + '\n\n' + newSectionHtml;
}

return [{
  json: {
    post_id: postId,
    content: updatedContent,
    updated_section: sectionType
  }
}];

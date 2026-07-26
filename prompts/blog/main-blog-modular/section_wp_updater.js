/**
 * 【モジュール 06: 各セクション差し替え・WordPress個別更新コード】
 * 
 * 指定された post_id のWordPress記事から、特定セクション（映画、Deep Dive等）のHTMLブロックだけを置換
 * または新しく生成されたセクションを結合して更新用データを生成します。
 */

const input = $input.first()?.json || {};
const postId = input.post_id || null;
const sectionType = input.section_type || 'movie'; // 'movie', 'deep_dive', 'institution' など
const newSectionHtml = input.section_html || input.movie_section_html || '';

// 既存のWP記事本文（WP Get Postノードから取得）
const currentWpHtml = input.wp_content || '';

let updatedContent = currentWpHtml;

if (sectionType === 'movie') {
  // 映画セクションの置換
  const movieSectionRegex = /<!-- START_MOVIE_SECTION -->[\s\S]*?<!-- END_MOVIE_SECTION -->/g;
  if (movieSectionRegex.test(currentWpHtml)) {
    updatedContent = currentWpHtml.replace(movieSectionRegex, newSectionHtml);
  } else {
    // タグがない場合は本文の末尾に追記
    updatedContent = currentWpHtml + '\n\n' + newSectionHtml;
  }
}

return [{
  json: {
    post_id: postId,
    content: updatedContent,
    updated_section: sectionType
  }
}];

/**
 * 【各セクション単体更新・ピンポイント置換＆位置保持コード】
 * 
 * WordPressの既存記事本文（currentWpHtml）から、指定された section_type のセクションのみを
 * 他のセクション（1〜10）を一切破壊せずピンポイントで最新HTMLに更新します。
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
let matchFound = false;

// 1. 各セクションのピンポイント置換パターン定義
const sectionPatterns = {
  eizou: [
    /<!-- SECTION:eizou:START -->[\s\S]*?<!-- SECTION:eizou:END -->/i,
    /<!-- START_MOVIE_SECTION -->[\s\S]*?<!-- END_MOVIE_SECTION -->/i,
    /<h2[^>]*id="section-8"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|<div id="deep-dive"|$)/i,
    /<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?映像で知る[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|<div id="deep-dive"|$)/i
  ],
  osusume: [
    /<!-- SECTION:osusume:START -->[\s\S]*?<!-- SECTION:osusume:END -->/i,
    /<!-- START_RECOMMENDED_SECTION -->[\s\S]*?<!-- END_RECOMMENDED_SECTION -->/i,
    /<h2[^>]*id="section-9"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|<div id="deep-dive"|$)/i,
    /<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:特別枠|おすすめ映画)[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|<div id="deep-dive"|$)/i
  ],
  deep_dive: [
    /<!-- SECTION:deep_dive:START -->[\s\S]*?<!-- SECTION:deep_dive:END -->/i,
    /<!-- START_DEEP_DIVE_SECTION -->[\s\S]*?<!-- END_DEEP_DIVE_SECTION -->/i,
    /<div id="deep-dive"[\s\S]*$/i
  ],
  seido: [/<!-- SECTION:seido:START -->[\s\S]*?<!-- SECTION:seido:END -->/i, /<!-- START_INSTITUTION_SECTION -->[\s\S]*?<!-- END_INSTITUTION_SECTION -->/i, /<h2[^>]*id="section-1"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
  chiri_keizai: [/<!-- SECTION:chiri_keizai:START -->[\s\S]*?<!-- SECTION:chiri_keizai:END -->/i, /<h2[^>]*id="section-2"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
  chian: [/<!-- SECTION:chian:START -->[\s\S]*?<!-- SECTION:chian:END -->/i, /<!-- START_CRIME_SECTION -->[\s\S]*?<!-- END_CRIME_SECTION -->/i, /<h2[^>]*id="section-3"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
  boeki: [/<!-- SECTION:boeki:START -->[\s\S]*?<!-- SECTION:boeki:END -->/i, /<h2[^>]*id="section-4"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
  bukka: [/<!-- SECTION:bukka:START -->[\s\S]*?<!-- SECTION:bukka:END -->/i, /<h2[^>]*id="section-5"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
  rekishi: [/<!-- SECTION:rekishi:START -->[\s\S]*?<!-- SECTION:rekishi:END -->/i, /<!-- START_HISTORY_SECTION -->[\s\S]*?<!-- END_HISTORY_SECTION -->/i, /<h2[^>]*id="section-6"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i],
  doukou: [/<!-- SECTION:doukou:START -->[\s\S]*?<!-- SECTION:doukou:END -->/i, /<h2[^>]*id="section-7"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|$)/i]
};

const patterns = sectionPatterns[canonicalSection] || [
  new RegExp(`<!-- SECTION:${canonicalSection}:START -->[\\s\\S]*?<!-- SECTION:${canonicalSection}:END -->`, 'i')
];

// 既存コンテンツ内から対象セクションを探して置換
for (const pattern of patterns) {
  if (pattern.test(updatedContent)) {
    updatedContent = updatedContent.replace(pattern, newSectionHtml.trim());
    matchFound = true;
    break;
  }
}

// もし既存記事内に該当セクションが見つからなかった場合のスマート挿入
if (!matchFound) {
  if (canonicalSection === 'eizou') {
    // 8番(eizou)がない場合 ➔ 9番の前、あるいは Deep Dive の前に挿入
    const osusumeMatch = updatedContent.match(/(<!-- SECTION:osusume:START -->|<h2[^>]*id="section-9"|<!-- START_RECOMMENDED_SECTION -->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:特別枠|おすすめ映画))/i);
    const deepDiveMatch = updatedContent.match(/(<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|<!-- START_DEEP_DIVE_SECTION -->)/i);
    if (osusumeMatch) {
      updatedContent = updatedContent.substring(0, osusumeMatch.index) + newSectionHtml.trim() + '\n\n' + updatedContent.substring(osusumeMatch.index);
    } else if (deepDiveMatch) {
      updatedContent = updatedContent.substring(0, deepDiveMatch.index) + newSectionHtml.trim() + '\n\n' + updatedContent.substring(deepDiveMatch.index);
    } else {
      updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
    }
  } else if (canonicalSection === 'osusume') {
    // 9番(osusume)がない場合 ➔ Deep Dive の前に挿入
    const deepDiveMatch = updatedContent.match(/(<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|<!-- START_DEEP_DIVE_SECTION -->)/i);
    if (deepDiveMatch) {
      updatedContent = updatedContent.substring(0, deepDiveMatch.index) + newSectionHtml.trim() + '\n\n' + updatedContent.substring(deepDiveMatch.index);
    } else {
      updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
    }
  } else {
    updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
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

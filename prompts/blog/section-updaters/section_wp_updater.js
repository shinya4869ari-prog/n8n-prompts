/**
 * 【各セクション単体更新・万能HTML置換コード】
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
let matchFound = false;

// --- ⑧ 映像作品セクション (eizou) の独立更新 ---
if (canonicalSection === 'eizou') {
  const hasEizou = /<!-- SECTION:eizou:START -->|<h2[^>]*id="section-8"|映像で知る/i.test(updatedContent);

  if (hasEizou) {
    updatedContent = updatedContent.replace(
      /(<!-- SECTION:eizou:START -->[\s\S]*?<!-- SECTION:eizou:END -->|<h2[^>]*id="section-8"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<div id="deep-dive"|$))/i,
      newSectionHtml.trim()
    );
    matchFound = true;
  } else {
    // 8番が存在しない場合：9番(osusume / 特別枠)の直前、またはDeep-Diveの直前に安全挿入して8番を復元
    if (/<!-- SECTION:osusume:START -->|<h2[^>]*id="section-9"|特別枠|おすすめ映画/i.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /(<!-- SECTION:osusume:START -->|<h2[^>]*id="section-9"|特別枠：|おすすめ映画)/i,
        `${newSectionHtml.trim()}\n\n$1`
      );
      matchFound = true;
    } else if (/<div id="deep-dive"|<!-- SECTION:deep_dive:START -->/i.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /(<div id="deep-dive"|<!-- SECTION:deep_dive:START -->)/i,
        `${newSectionHtml.trim()}\n\n$1`
      );
      matchFound = true;
    }
  }
}

// --- ⑨ おすすめ映画セクション (osusume) の独立更新 ---
else if (canonicalSection === 'osusume') {
  const hasOsusume = /<!-- SECTION:osusume:START -->|<h2[^>]*id="section-9"|特別枠|おすすめ映画/i.test(updatedContent);

  if (hasOsusume) {
    // 既存の9番ブロックを置換（複数ある場合は1つ目を新しい9番で更新し、余分な2つ目以降の9番は自動消去！）
    let replacedCount = 0;
    updatedContent = updatedContent.replace(
      /(<!-- SECTION:osusume:START -->[\s\S]*?<!-- SECTION:osusume:END -->|<h2[^>]*id="section-9"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<div id="deep-dive"|$))/gi,
      (match) => {
        replacedCount++;
        return replacedCount === 1 ? newSectionHtml.trim() : '';
      }
    );
    matchFound = true;
  } else {
    // 9番が存在しない場合：8番(eizou)の直後、またはDeep-Diveの直前に安全挿入
    if (/<!-- SECTION:eizou:END -->/i.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /<!-- SECTION:eizou:END -->/i,
        `<!-- SECTION:eizou:END -->\n\n${newSectionHtml.trim()}`
      );
      matchFound = true;
    } else if (/<div id="deep-dive"|<!-- SECTION:deep_dive:START -->/i.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /(<div id="deep-dive"|<!-- SECTION:deep_dive:START -->)/i,
        `${newSectionHtml.trim()}\n\n$1`
      );
      matchFound = true;
    }
  }
}

// --- 他のセクション (1〜7, 10) ---
else {
  const newFormatRegex = new RegExp(`<!-- SECTION:${canonicalSection}:START -->[\\s\\S]*?<!-- SECTION:${canonicalSection}:END -->`, 'i');
  const legacyRegexMap = {
    deep_dive: /<!-- START_DEEP_DIVE_SECTION -->[\s\S]*?<!-- END_DEEP_DIVE_SECTION -->/i,
    seido: /<!-- START_INSTITUTION_SECTION -->[\s\S]*?<!-- END_INSTITUTION_SECTION -->/i,
    rekishi: /<!-- START_HISTORY_SECTION -->[\s\S]*?<!-- END_HISTORY_SECTION -->/i,
    chian: /<!-- START_CRIME_SECTION -->[\s\S]*?<!-- END_CRIME_SECTION -->/i
  };

  if (newFormatRegex.test(updatedContent)) {
    updatedContent = updatedContent.replace(newFormatRegex, newSectionHtml.trim());
    matchFound = true;
  } else if (legacyRegexMap[canonicalSection] && legacyRegexMap[canonicalSection].test(updatedContent)) {
    updatedContent = updatedContent.replace(legacyRegexMap[canonicalSection], newSectionHtml.trim());
    matchFound = true;
  }
}

if (!matchFound) {
  // どこにも見つからなければ末尾に安全追記
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

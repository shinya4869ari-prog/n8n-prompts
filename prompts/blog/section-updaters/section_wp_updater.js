/**
 * 【各セクション単体更新・完全位置判定＆誤上書き防止コード】
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

const canonicalSection = sectionAliasMap[sectionType] || sectionType;
let updatedContent = currentWpHtml.trim();

// ====================================================================
// 映画セクション（8番 eizou & 9番 osusume）: 4ゾーン分割方式
// ====================================================================
if (canonicalSection === 'eizou' || canonicalSection === 'osusume') {

  // ---- ゾーン境界の高度特定（コメントタグ・id属性・h2内文字列の全対応） ----
  // 境界1: 8番の開始位置
  const sec8StartPattern = /(<!-- SECTION:eizou:START -->|<!-- START_MOVIE_SECTION -->|<h2[^>]*id="section-8"|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:⑧|映像で知る))/i;
  // 境界2: 9番の開始位置（最初の出現）
  const sec9StartPattern = /(<!-- SECTION:osusume:START -->|<!-- START_RECOMMENDED_SECTION -->|<h2[^>]*id="section-9"|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:⑨|特別枠|おすすめ))/i;
  // 境界3: Deep Diveの開始位置
  const deepDivePattern = /(<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|<!-- START_DEEP_DIVE_SECTION -->)/i;

  const sec8StartMatch = updatedContent.match(sec8StartPattern);
  const sec9StartMatch = updatedContent.match(sec9StartPattern);
  const deepDiveStartMatch = updatedContent.match(deepDivePattern);

  if (!deepDiveStartMatch) {
    // Deep Diveが見つからない場合は末尾に追記（フォールバック）
    updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
  } else {
    const deepDivePos = deepDiveStartMatch.index;

    if (!sec8StartMatch) {
      // 8番マーカーが存在しない場合
      if (canonicalSection === 'eizou') {
        // 8番更新：最初の9番マーカーの手前に8番を挿入
        if (sec9StartMatch) {
          updatedContent = updatedContent.substring(0, sec9StartMatch.index).trimEnd()
            + '\n\n' + newSectionHtml.trim()
            + '\n\n' + updatedContent.substring(sec9StartMatch.index);
        } else {
          updatedContent = updatedContent.substring(0, deepDivePos).trimEnd()
            + '\n\n' + newSectionHtml.trim()
            + '\n\n' + updatedContent.substring(deepDivePos);
        }
      } else {
        // 9番更新で8番がない場合：最初の9番開始位置〜Deep Dive手前までの全旧9番を、新しい1つの9番に丸ごと置換！
        if (sec9StartMatch) {
          updatedContent = updatedContent.substring(0, sec9StartMatch.index).trimEnd()
            + '\n\n' + newSectionHtml.trim()
            + '\n\n' + updatedContent.substring(deepDivePos);
        } else {
          updatedContent = updatedContent.substring(0, deepDivePos).trimEnd()
            + '\n\n' + newSectionHtml.trim()
            + '\n\n' + updatedContent.substring(deepDivePos);
        }
      }
    } else {
      const sec8Pos = sec8StartMatch.index;
      // 前半(1-7)部分
      const partFront = updatedContent.substring(0, sec8Pos).trimEnd();
      // 8番〜Deep Diveの手前までの全内容（8番ゾーン + 9番ゾーン、ゴミ含む）
      const movieArea = updatedContent.substring(sec8Pos, deepDivePos);
      // Deep Dive以降
      const partDeepDive = updatedContent.substring(deepDivePos);

      // movieArea の中から9番の開始位置を特定
      const sec9InMovieMatch = movieArea.match(sec9StartPattern);

      let existing8 = '';
      let existing9 = '';

      if (sec9InMovieMatch) {
        // 8番ゾーン = movieArea の先頭〜9番開始前
        existing8 = movieArea.substring(0, sec9InMovieMatch.index).trim();
        // 9番ゾーン = 9番開始〜movieArea末尾（重複・旧ゴミ含む全部）
        existing9 = movieArea.substring(sec9InMovieMatch.index).trim();
      } else {
        // 9番が見当たらない場合はmovieArea全体を8番として扱う
        existing8 = movieArea.trim();
        existing9 = '';
      }

      // 更新するゾーンだけ差し替え、もう片方はそのまま保持
      let final8 = canonicalSection === 'eizou' ? newSectionHtml.trim() : existing8;
      let final9 = canonicalSection === 'osusume' ? newSectionHtml.trim() : existing9;

      // 結合
      let rebuilt = final8;
      if (final9) rebuilt += '\n\n' + final9;

      updatedContent = partFront + '\n\n' + rebuilt + '\n\n' + partDeepDive.trimStart();
    }
  }

} else {
  // ====================================================================
  // その他のセクション (1〜7, 10 Deep Dive): ピンポイント置換
  // ====================================================================
  const sectionPatterns = {
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

  let matchFound = false;
  for (const pattern of patterns) {
    if (pattern.test(updatedContent)) {
      updatedContent = updatedContent.replace(pattern, newSectionHtml.trim());
      matchFound = true;
      break;
    }
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

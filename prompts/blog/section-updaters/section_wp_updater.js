/**
 * 【各セクション単体更新・完全独立置換コード】
 * 
 * 指定された section_type のセクションのみをターゲットにし、
 * 他のセクションには一切干渉せず、安全に最新HTMLへ置換します。
 */

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
let matchFound = false;

if (canonicalSection === 'eizou') {
  // --- 【8番 eizou の独立更新】 ---
  // 既存の8番ブロックのみを探して置換（他セクションには一切干渉しない）
  const eizouPatterns = [
    /<!-- SECTION:eizou:START -->[\s\S]*?<!-- SECTION:eizou:END -->/i,
    /<!-- START_MOVIE_SECTION -->[\s\S]*?<!-- END_MOVIE_SECTION -->/i,
    /<h2[^>]*id="section-8"[^>]*>[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|<div id="deep-dive"|$)/i,
    /<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:⑧|8\.|映像で知る|映像作品)[\s\S]*?(?=<h2|<!-- SECTION:|<!-- START_|<div id="deep-dive"|$)/i
  ];

  for (const pattern of eizouPatterns) {
    if (pattern.test(updatedContent)) {
      updatedContent = updatedContent.replace(pattern, newSectionHtml.trim());
      matchFound = true;
      break;
    }
  }

  // もし記事内に8番がない場合：9番の手前、または Deep Dive の手前に安全に挿入
  if (!matchFound) {
    const osusumePos = updatedContent.search(/(<!-- SECTION:osusume:START -->|<!-- START_RECOMMENDED_SECTION -->|<h2[^>]*id="section-9"|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:⑨|9\.|特別枠|おすすめ))/i);
    const deepDivePos = updatedContent.search(/(<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|<!-- START_DEEP_DIVE_SECTION -->)/i);

    if (osusumePos !== -1) {
      updatedContent = updatedContent.substring(0, osusumePos).trimEnd() + '\n\n' + newSectionHtml.trim() + '\n\n' + updatedContent.substring(osusumePos);
    } else if (deepDivePos !== -1) {
      updatedContent = updatedContent.substring(0, deepDivePos).trimEnd() + '\n\n' + newSectionHtml.trim() + '\n\n' + updatedContent.substring(deepDivePos);
    } else {
      updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
    }
  }

} else if (canonicalSection === 'osusume') {
  // --- 【9番 osusume の独立更新】 ---
  // 記事を「1-7」「section8」「新9番」「それ以降(DeepDive等)」に完全再構築する
  // Deep Diveの検索はしない（形式が不安定なため）。
  // 代わりに「最後の osusume:END の後ろ」をDeepDive以降として扱う。

  const eizouStartMarker  = '<!-- SECTION:eizou:START -->';
  const eizouEndMarker    = '<!-- SECTION:eizou:END -->';
  const osusumeEndMarker  = '<!-- SECTION:osusume:END -->';

  const eizouStartPos       = updatedContent.indexOf(eizouStartMarker);
  const eizouEndPos         = updatedContent.lastIndexOf(eizouEndMarker);
  const lastOsusumeEndPos   = updatedContent.lastIndexOf(osusumeEndMarker);

  if (eizouStartPos !== -1 && eizouEndPos !== -1 && eizouStartPos < eizouEndPos) {
    // 【1〜7】eizou:START より前。ゴミの osusume:START があれば除去
    let beforeEizou = updatedContent.substring(0, eizouStartPos).trimEnd();
    const lastJunk = beforeEizou.lastIndexOf('<!-- SECTION:osusume:START -->');
    if (lastJunk !== -1) {
      beforeEizou = beforeEizou.substring(0, lastJunk).trimEnd();
    }

    // 【section8】eizou:START 〜 eizou:END
    const afterEizouEnd = eizouEndPos + eizouEndMarker.length;
    const sec8Block = updatedContent.substring(eizouStartPos, afterEizouEnd);

    // 【DeepDive以降】最後の osusume:END の後ろのコンテンツ
    // osusume:END が eizou:END より後ろにある場合のみ有効
    let tail = '';
    if (lastOsusumeEndPos !== -1 && lastOsusumeEndPos > eizouEndPos) {
      tail = updatedContent.substring(lastOsusumeEndPos + osusumeEndMarker.length);
    }

    // 再構築：1-7 + section8 + 新9番 + DeepDive以降
    updatedContent = beforeEizou
      + '\n\n' + sec8Block
      + '\n\n' + newSectionHtml.trim()
      + tail;
    matchFound = true;
  } else {
    // eizou:STARTが見つからない場合のフォールバック
    // 末尾に追記せず、最後の osusume:END 以降を使って置換を試みる
    if (lastOsusumeEndPos !== -1) {
      const tail = updatedContent.substring(lastOsusumeEndPos + osusumeEndMarker.length);
      const firstOsusumeStartPos = updatedContent.indexOf('<!-- SECTION:osusume:START -->');
      if (firstOsusumeStartPos !== -1) {
        updatedContent = updatedContent.substring(0, firstOsusumeStartPos).trimEnd()
          + '\n\n' + newSectionHtml.trim()
          + tail;
      } else {
        updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
      }
    } else {
      updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
    }
    matchFound = true;
  }
} else {
  // その他のセクション
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
    match_found: matchFound
  }
}];

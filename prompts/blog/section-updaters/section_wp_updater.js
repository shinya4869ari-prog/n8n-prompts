/**
 * 【各セクション単体更新・位置インデックス分割方式】
 * 
 * 記事全体の「8番見出し位置」「9番見出し位置」「Deep Dive位置」をインデックスで正確に測定し、
 * 対象セクションの区間のみをピンポイントで置換します。
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

if (canonicalSection === 'eizou' || canonicalSection === 'osusume') {
  // ====================================================================
  // 映画セクション (8番 eizou & 9番 osusume) 位置インデックス分割置換
  // ====================================================================
  
  // 1. 8番の開始位置を検索 (コメントタグ、id属性、または <h2>...⑧ / 映像で知る)
  const sec8Regex = /(<!-- SECTION:eizou:START -->|<!-- START_MOVIE_SECTION -->|<h2[^>]*id="section-8"|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:⑧|8\.|映像で知る))/i;
  const sec8Match = updatedContent.match(sec8Regex);
  const h8Pos = sec8Match ? sec8Match.index : -1;

  // 2. 9番の開始位置を検索 (8番の開始位置より後ろにあるものを優先)
  const sec9Regex = /(<!-- SECTION:osusume:START -->|<!-- START_RECOMMENDED_SECTION -->|<h2[^>]*id="section-9"|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?(?:⑨|9\.|特別枠|おすすめ))/gi;
  let h9Pos = -1;
  let m;
  while ((m = sec9Regex.exec(updatedContent)) !== null) {
    if (h8Pos === -1 || m.index > h8Pos) {
      h9Pos = m.index;
      break;
    }
  }

  // 3. Deep Dive の開始位置を検索
  const deepDiveRegex = /(<div id="deep-dive"|<!-- SECTION:deep_dive:START -->|<!-- START_DEEP_DIVE_SECTION -->|<h2[^>]*id="deep-dive"|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?Deep Dive)/i;
  const deepDiveMatch = updatedContent.match(deepDiveRegex);
  const hdPos = deepDiveMatch ? deepDiveMatch.index : -1;

  if (canonicalSection === 'eizou') {
    // ------------------------------------------------------------------
    // 【8番 (eizou) の更新】
    // ------------------------------------------------------------------
    if (h8Pos !== -1) {
      // 前半: 0 〜 h8Pos (1〜7セクション)
      const partBefore = updatedContent.substring(0, h8Pos).trimEnd();
      
      // 後半: h9Pos があれば h9Pos 以降 (9番＋DeepDive)、なければ hdPos 以降
      let partAfter = '';
      if (h9Pos !== -1 && h9Pos > h8Pos) {
        partAfter = updatedContent.substring(h9Pos).trimStart();
      } else if (hdPos !== -1 && hdPos > h8Pos) {
        partAfter = updatedContent.substring(hdPos).trimStart();
      }

      updatedContent = partBefore + '\n\n' + newSectionHtml.trim() + (partAfter ? '\n\n' + partAfter : '');
      matchFound = true;
    } else if (h9Pos !== -1) {
      // 8番が見つからない場合は 9番の手前に挿入
      const partBefore = updatedContent.substring(0, h9Pos).trimEnd();
      const partAfter = updatedContent.substring(h9Pos).trimStart();
      updatedContent = partBefore + '\n\n' + newSectionHtml.trim() + '\n\n' + partAfter;
      matchFound = true;
    } else if (hdPos !== -1) {
      // 9番もない場合は Deep Dive の手前に挿入
      const partBefore = updatedContent.substring(0, hdPos).trimEnd();
      const partAfter = updatedContent.substring(hdPos).trimStart();
      updatedContent = partBefore + '\n\n' + newSectionHtml.trim() + '\n\n' + partAfter;
      matchFound = true;
    } else {
      updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
      matchFound = true;
    }

  } else if (canonicalSection === 'osusume') {
    // ------------------------------------------------------------------
    // 【9番 (osusume) の更新】
    // ------------------------------------------------------------------
    if (h9Pos !== -1) {
      // 前半: 0 〜 h9Pos (1〜7セクション ＋ 8番セクション全体が含まれる)
      let partBefore = updatedContent.substring(0, h9Pos).trimEnd();
      
      // 前半に含まれる孤立した <!-- SECTION:osusume:START --> コメントがあれば掃除
      const junkOsusume = partBefore.lastIndexOf('<!-- SECTION:osusume:START -->');
      if (junkOsusume !== -1 && (h8Pos === -1 || junkOsusume < h8Pos)) {
        partBefore = partBefore.substring(0, junkOsusume).trimEnd();
      }

      // 後半: hdPos (Deep Dive) 以降。なければ末尾
      let partAfter = '';
      if (hdPos !== -1 && hdPos > h9Pos) {
        partAfter = updatedContent.substring(hdPos).trimStart();
      }

      updatedContent = partBefore + '\n\n' + newSectionHtml.trim() + (partAfter ? '\n\n' + partAfter : '');
      matchFound = true;
    } else if (hdPos !== -1) {
      // 9番が見つからない場合は Deep Dive の手前に挿入 (8番は保持される)
      const partBefore = updatedContent.substring(0, hdPos).trimEnd();
      const partAfter = updatedContent.substring(hdPos).trimStart();
      updatedContent = partBefore + '\n\n' + newSectionHtml.trim() + '\n\n' + partAfter;
      matchFound = true;
    } else {
      updatedContent = updatedContent.trim() + '\n\n' + newSectionHtml.trim();
      matchFound = true;
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

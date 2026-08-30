/**
 * ==============================================================================
 * 日本版 固定ページ専用：WordPress 本文セクション置換・安全合流ノード
 * ==============================================================================
 * 対象ページ: 日本（固定ページ ID: 1815）
 * URL: https://wp-test.seronworks.dev/日本/
 *
 * 【日本版セクション構成】
 *   - boeki     : ① 貿易の衡量
 *   - rekishi   : ② 歴史的背景（近代100年）
 *   - doukou    : ③ 直近の動向（政治経済社会・統計習慣・国際社会）
 *   - eizou     : ④ 映像で知る日本
 *   - osusume   : ⑤ 日本の最新おすすめ映画
 *   - deep_dive : ✦ Deep Dive
 * ==============================================================================
 */

const input = $input.first()?.json || {};

let triggerJson = {};
try {
  triggerJson = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
} catch (e) {}

// 日本版のデフォルト固定ページIDは 1815
let postId = input.post_id || input.id || triggerJson.post_id || 1815;
let rawSectionType = input.section_type || input.section || triggerJson.section_type || triggerJson.section || '';

// セクション種別の正規化
let sectionType = rawSectionType;
if (Array.isArray(sectionType)) sectionType = sectionType[0];
if (typeof sectionType === 'string') {
  if (sectionType.includes(':')) {
    sectionType = sectionType.split(':')[0].trim().toLowerCase();
  } else if (sectionType.includes(' ')) {
    sectionType = sectionType.split(' ')[0].trim().toLowerCase();
  }
}

let newSectionHtml = input.section_html || input.html || input.movie_section_html || '';
let currentWpHtml = input.wp_content || (typeof input.content?.rendered === 'string' ? input.content.rendered : '');

// 入力配列全体の探索
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

// 前段HTMLノードからの補完（最重要：n8nキャンバス上の実ノード名をすべて網羅）
if (!newSectionHtml) {
  // セクション種別ごとの優先探索リスト
  const sectionPriorityNodes = {
    chian: ['chian', 'chian_section_html', 'chian_section_html_jp', '治安セクションHTML', '治安'],
    bukka: ['bukka', 'bukka_section_html', 'bukka_section_html_jp', '物価セクションHTML', '物価'],
    boeki: ['boeki', 'boeki_section_html', 'boeki_section_html_jp', '貿易セクションHTML', '貿易'],
    rekishi: ['rekishi', 'rekishi_section_html', 'rekishi_section_html_jp', '歴史セクションHTML', '歴史'],
    doukou: ['doukou_section_html', 'doukou', 'doukou_section_html_jp', '動向セクションHTML', '動向'],
    eizou: ['movie_section_html', 'movie_section_html_jp', 'eizou_section_html_jp', '映像セクションHTML', '映像'],
    osusume: ['movie_section_html', 'movie_section_html_jp', 'osusume_section_html_jp', 'おすすめ映画HTML', 'おすすめ映画'],
    music: ['music_section_html', 'music_section_html_jp', '音楽セクションHTML', '音楽'],
    deep_dive: ['Deep Dive', 'deep_dive', 'deep_dive_section_html', 'deep_dive_section_html_jp', 'ディープダイブHTML']
  };

  const priorityList = sectionPriorityNodes[String(sectionType).toLowerCase()] || [];
  const allPossibleNodes = [
    ...priorityList,
    'chian_section_html', 'bukka_section_html', '治安セクションHTML', '物価セクションHTML',
    'movie_section_html', 'music_section_html', 'doukou_section_html', 'rekishi', 'boeki', 'Deep Dive',
    'movie_section_html_jp', 'music_section_html_jp', 'doukou_section_html_jp', 'rekishi_section_html_jp', 'boeki_section_html_jp', 'deep_dive_section_html_jp',
    '映像セクションHTML', 'おすすめ映画HTML', '音楽セクションHTML', '動向セクションHTML', '歴史セクションHTML', '貿易セクションHTML', 'ディープダイブHTML',
    'Code', 'Code1', 'Code2', 'Code3'
  ];

  for (const name of allPossibleNodes) {
    try {
      const node = $(name);
      if (node && typeof node.first === 'function') {
        const n = node.first()?.json;
        if (n) {
          const candidateHtml = n.section_html || n.movie_section_html || n.html || '';
          if (candidateHtml && typeof candidateHtml === 'string' && candidateHtml.trim().length > 10) {
            newSectionHtml = candidateHtml;
            if (!sectionType && (n.section_type || n.section)) {
              sectionType = n.section_type || n.section;
            }
            break;
          }
        }
      }
    } catch (e) {}
  }
}

// WordPress 取得ノードからの補完
if (!currentWpHtml) {
  const possibleWpNodes = ['WP Get a Post', 'Get a post', 'Get a page', 'WP Get Page', 'WordPress', 'WordPress1'];
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
    } catch (e) {}
  }
}

if (!currentWpHtml || currentWpHtml.trim().length < 10) {
  throw new Error(`[置換エラー] 既存のWordPress固定ページ本文(wp_content)が取得できていません。固定ページID: ${postId} の取得を確認してください。`);
}
if (!newSectionHtml || newSectionHtml.trim().length < 10) {
  throw new Error(`[置換エラー] 生成されたセクションHTML(section_html)が空です。(検出されたセクション種別: ${sectionType || '未指定'})`);
}

// 日本版の番号・エイリアスマッピング
const sectionAliasMap = {
  '1': 'boeki',
  '2': 'rekishi',
  '3': 'doukou',
  '4': 'eizou',
  '5': 'osusume',
  '6': 'music',
  boeki: 'boeki', trade: 'boeki',
  rekishi: 'rekishi', history: 'rekishi',
  doukou: 'doukou', trend: 'doukou',
  eizou: 'eizou', movie: 'eizou', video: 'eizou',
  osusume: 'osusume', recommend: 'osusume',
  music: 'music', ongaku: 'music',
  deep_dive: 'deep_dive', deepdive: 'deep_dive'
};

const canonicalSection = sectionAliasMap[String(sectionType).toLowerCase()] || sectionType;
let updatedContent = currentWpHtml.trim();
let matchFound = false;

function wrap(section, html) {
  const cleanHtml = html
    .replace(/<!--\s*SECTION:[^>]+?:START\s*-->/gi, '')
    .replace(/<!--\s*SECTION:[^>]+?:END\s*-->/gi, '')
    .trim();
  return `<!-- SECTION:${section}:START -->\n${cleanHtml}\n<!-- SECTION:${section}:END -->`;
}

// ★ 元々の記事に書かれていた「エラーネコの一言」の救出と完全維持
function preserveOriginalNeko(oldSectionText, newHtml) {
  if (!oldSectionText || !newHtml) return newHtml;

  const manualNeko = input.neko_comment || input.neko || triggerJson.neko_comment;
  if (manualNeko && String(manualNeko).trim().length > 0) return newHtml;

  const nekoMatch = oldSectionText.match(/<strong>エラーネコの一言：<\/strong><br>([\s\S]*?)<\/div>/i) ||
                    oldSectionText.match(/🐱\s*エラーネコ[：:]([\s\S]*?)(?:<\/div>|\n|$)/i);

  if (nekoMatch && nekoMatch[1]) {
    const originalNekoContent = nekoMatch[1].trim();
    return newHtml.replace(
      /(<strong[^>]*>エラーネコの一言：<\/strong><br>)([\s\S]*?)(<\/div>)/i,
      `$1${originalNekoContent}$3`
    );
  }
  return newHtml;
}

// 1. 【最優先・最高精度】 コメントタグ `<!-- SECTION:<id>:START --> ... <!-- SECTION:<id>:END -->` による限定置換
// ※ コロン前後のスペースや HTMLエンティティ(&lt;!-- ... --&gt;) にも完全対応
const startRe = new RegExp(`(?:<!--|&lt;!--)\\s*SECTION\\s*:\\s*${canonicalSection}\\s*:\\s*START\\s*(?:-->|--&gt;)`, 'gi');
const endRe = new RegExp(`(?:<!--|&lt;!--)\\s*SECTION\\s*:\\s*${canonicalSection}\\s*:\\s*END\\s*(?:-->|--&gt;)`, 'gi');
const startCount = (updatedContent.match(startRe) || []).length;
const endCount = (updatedContent.match(endRe) || []).length;

if (startCount >= 1 && endCount >= 1) {
  const commentRe = new RegExp(`(?:<p>\\s*)?(?:<!--|&lt;!--)\\s*SECTION\\s*:\\s*${canonicalSection}\\s*:\\s*START\\s*(?:-->|--&gt;)([\\s\\S]*?)(?:<!--|&lt;!--)\\s*SECTION\\s*:\\s*${canonicalSection}\\s*:\\s*END\\s*(?:-->|--&gt;)(?:\\s*<\\/p>)?`, 'i');
  const oldMatch = updatedContent.match(commentRe);
  const oldSectionText = oldMatch ? oldMatch[1] : '';
  const finalHtml = preserveOriginalNeko(oldSectionText, newSectionHtml);
  updatedContent = updatedContent.replace(commentRe, wrap(canonicalSection, finalHtml));
  matchFound = true;
} else if (startCount > 1 || endCount > 1) {
  throw new Error(`[安全保護エラー] 本文内に SECTION:${canonicalSection} のマーカーが複数検出されました。誤置換を防ぐため中断しました。`);
}

// 2. 【フォールバック】 マーカーがまだ無い旧記事向け：見出しによる範囲特定置換
if (!matchFound) {
  let sectionRegex = null;

  if (canonicalSection === 'boeki') {
    sectionRegex = /(<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?①(?:(?!<\/h2>)[\s\S])*?貿易[\s\S]*?)(?=(?:<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?②|<div id="tenbin-popup"|$))/i;
  } else if (canonicalSection === 'rekishi') {
    sectionRegex = /(<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?②(?:(?!<\/h2>)[\s\S])*?歴史[\s\S]*?)(?=(?:<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?③|<div id="tenbin-popup"|$))/i;
  } else if (canonicalSection === 'doukou') {
    sectionRegex = /(<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?③(?:(?!<\/h2>)[\s\S])*?直近の動向[\s\S]*?)(?=(?:<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?④|<div id="tenbin-popup"|$))/i;
  } else if (canonicalSection === 'eizou') {
    sectionRegex = /(<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?④(?:(?!<\/h2>)[\s\S])*?映像[\s\S]*?)(?=(?:<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑤|<div id="deep-dive"|<div id="tenbin-popup"|$))/i;
  } else if (canonicalSection === 'osusume') {
    sectionRegex = /(<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑤(?:(?!<\/h2>)[\s\S])*?(?:おすすめ|興行収入)[\s\S]*?)(?=(?:<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑥|<div id="deep-dive"|<div id="tenbin-popup"|$))/i;
  } else if (canonicalSection === 'music') {
    sectionRegex = /(<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑥(?:(?!<\/h2>)[\s\S])*?音楽[\s\S]*?)(?=(?:<div id="deep-dive"|<div id="tenbin-popup"|$))/i;
  } else if (canonicalSection === 'deep_dive') {
    sectionRegex = /(<!--\s*SECTION:deep_dive:START\s*-->[\s\S]*?<!--\s*SECTION:deep_dive:END\s*-->|<div id="deep-dive"[\s\S]*?)(?=(?:<div id="tenbin-popup"|<script|$))/i;
  }

  if (sectionRegex && sectionRegex.test(updatedContent)) {
    updatedContent = updatedContent.replace(sectionRegex, wrap(canonicalSection, newSectionHtml));
    matchFound = true;
  }
}

// 3. 【自動新規挿入】 マーカーも見出しも無い場合（音楽など新規セクションを後から差し込む場合）
if (!matchFound) {
  if (canonicalSection === 'music') {
    // ⑤おすすめ映画の終了タグの直後、または deep-dive の直前に自動挿入
    if (/<!--\s*SECTION:osusume:END\s*-->/i.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /<!--\s*SECTION:osusume:END\s*-->/i,
        `<!-- SECTION:osusume:END -->\n\n${wrap('music', newSectionHtml)}`
      );
      matchFound = true;
    } else if (/<div id="deep-dive"/i.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /<div id="deep-dive"/i,
        `${wrap('music', newSectionHtml)}\n\n<div id="deep-dive"`
      );
      matchFound = true;
    } else if (/<div id="tenbin-popup"/i.test(updatedContent)) {
      updatedContent = updatedContent.replace(
        /<div id="tenbin-popup"/i,
        `${wrap('music', newSectionHtml)}\n\n<div id="tenbin-popup"`
      );
      matchFound = true;
    } else {
      updatedContent += `\n\n${wrap('music', newSectionHtml)}`;
      matchFound = true;
    }
  }
}

if (!matchFound) {
  const foundMarkers = updatedContent.match(/(?:<!--|&lt;!--)\s*SECTION[^\->]+?(?:-->|--&gt;)/gi) || [];
  throw new Error(`[置換失敗] セクション「${canonicalSection}」の置換対象が本文中に見つかりませんでした。本文長: ${updatedContent.length}文字, 検出された既存マーカー: [${foundMarkers.join(', ')}]`);
}

// 3. 【破壊防止セーフティガード】 他のセクションが誤って消去されていないか検証
const allSectionsCheck = [
  { key: 'boeki', name: '① 貿易の衡量', regex: /<!--\s*SECTION:boeki:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?①(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'rekishi', name: '② 歴史的背景', regex: /<!--\s*SECTION:rekishi:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?②(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'doukou', name: '③ 直近の動向', regex: /<!--\s*SECTION:doukou:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?③(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'eizou', name: '④ 映像で知る日本', regex: /<!--\s*SECTION:eizou:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?④(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'osusume', name: '⑤ 日本の最新おすすめ映画', regex: /<!--\s*SECTION:osusume:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑤(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'music', name: '⑥ 日本のおすすめ音楽', regex: /<!--\s*SECTION:music:START\s*-->|<h2[^>]*>(?:(?!<\/h2>)[\s\S])*?⑥(?:(?!<\/h2>)[\s\S])*?<\/h2>/i },
  { key: 'deep_dive', name: '✦ Deep Dive', regex: /<!--\s*SECTION:deep_dive:START\s*-->|<div id="deep-dive"/i }
];

for (const sec of allSectionsCheck) {
  if (sec.key !== canonicalSection) {
    const wasPresent = sec.regex.test(currentWpHtml);
    const isPresent = sec.regex.test(updatedContent);
    if (wasPresent && !isPresent) {
      throw new Error(`[安全保護エラー] 「${sec.name}」セクションが誤消去されるリスクを検知しました。WordPress固定ページへの送信を強制ブロックしました。`);
    }
  }
}

return {
  json: {
    post_id: postId,
    id: postId,
    post_type: 'page',
    is_page: true,
    section_updated: canonicalSection,
    content: updatedContent,
    title: '日本',
    status: 'publish',
    success: true
  }
};

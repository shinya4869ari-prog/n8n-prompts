/**
 * ==============================================================================
 * 日本版 ③ 直近の動向 セクション個別更新 HTML生成コード（万能自動仕分け版）
 * ==============================================================================
 * 役割:
 * 1. フォームの「content_data」にまとめて貼り付けられた文章
 *    （【政治経済社会】、驚きの統計、国際社会との関連、出典、ネコ）
 * 2. または Perplexity / AI の生JSON
 * 3. または 各種個別フィールド
 * を完全自動で判別・仕分けし、WordPress の <!-- SECTION:doukou:START --> ... <!-- SECTION:doukou:END --> を構築します。
 * ==============================================================================
 */

const rawInput = $input.first()?.json || {};

// 1. トリガーまたは入力データから情報を取得
let trig = {};
try {
  trig = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
} catch (e) {}

// 2. AIの文字列化されたJSONレスポンスがあれば展開
let parsedData = {};
const rawStringCandidates = [rawInput.message, rawInput.text, rawInput.output, rawInput.article, rawInput.content, rawInput.response, rawInput.body];
for (const cand of rawStringCandidates) {
  if (typeof cand === 'string') {
    const jsonMatch = cand.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const p = JSON.parse(jsonMatch[0]);
        if (p && (p.直近の動向 || p.doukou || p.政治経済社会 || p.country)) {
          parsedData = p;
          break;
        }
      } catch (e) {}
    }
  }
}

const merged = { ...trig, ...rawInput, ...parsedData };
const countryName = '日本';

// 3. まとめて貼り付けられた生テキストの自動仕分けパーサー
function parseAllInOneText(rawText) {
  if (!rawText || typeof rawText !== 'string') return {};
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  
  let politics = '';
  let stats = '';
  let international = '';
  let cite = '';
  let neko = '';

  const polMatch = text.match(/【政治経済社会】([\s\S]*?)(?=(?:🔍|•|・|\*|-)?\s*(?:驚き|驚く|統計|国際社会|出典|🐱|エラーネコ|$))/i);
  if (polMatch) politics = polMatch[1].trim();

  const statsMatch = text.match(/(?:🔍|•|・|\*|-)?\s*(?:驚き|驚く|統計).*?[：:\n]([\s\S]*?)(?=(?:🌎|•|・|\*|-)?\s*国際社会|出典|🐱|エラーネコ|$)/i);
  if (statsMatch) stats = statsMatch[1].trim();

  const intlMatch = text.match(/(?:🌎|•|・|\*|-)?\s*国際社会との関連.*?[：:\n]([\s\S]*?)(?=(?:出典|🐱|エラーネコ|$))/i);
  if (intlMatch) international = intlMatch[1].trim();

  const citeMatch = text.match(/出典\s*[：:]([\s\S]*?)(?=(?:🐱|エラーネコ|$))/i);
  if (citeMatch) cite = citeMatch[1].trim();

  const nekoMatch = text.match(/(?:🐱\s*)?エラーネコ(?:の一言)?[：:]([\s\S]*)$/i);
  if (nekoMatch) neko = nekoMatch[1].trim();

  return { politics, stats, international, cite, neko };
}

let rawBlock = merged.content_data || merged.content || merged.text || merged.raw_text || merged.article || merged.doukou_text || trig.content_data || trig.content || trig.text || '';
let parsedFromText = {};
if (rawBlock && typeof rawBlock === 'string') {
  parsedFromText = parseAllInOneText(rawBlock);
}

// 4. 直近の動向オブジェクトの抽出
const doukouObj = merged.直近の動向 || merged.doukou || merged.data?.対象国データ_記事?.直近の動向 || merged.data?.直近の動向 || merged;

const getField = (keys, fallbackFromText = '') => {
  if (fallbackFromText) return fallbackFromText;
  for (const k of keys) {
    if (doukouObj && doukouObj[k] && typeof doukouObj[k] === 'string' && doukouObj[k].trim() !== '') {
      return doukouObj[k].trim();
    }
    if (merged && merged[k] && typeof merged[k] === 'string' && merged[k].trim() !== '') {
      return merged[k].trim();
    }
  }
  return '';
};

let politics = getField(['政治経済社会', 'politics', 'トピック1_政治経済社会', '政治経済'], parsedFromText.politics);
let stats = getField(['驚きの統計・習慣', '驚く統計や習慣', 'stats', 'トピック2_驚きの統計・習慣', '驚きの統計', '習慣'], parsedFromText.stats);
let international = getField(['国際社会との関連', 'international', 'トピック3_国際社会との関連', '外交'], parsedFromText.international);
let cites = getField(['出典', 'source', 'cites', 'cite'], parsedFromText.cite);
let neko = getField(['neko_comment', 'error_neko', 'エラーネコ', '猫', 'neko'], parsedFromText.neko);

if (!cites || cites === '欠測' || cites === 'データなし') {
  cites = '日本経済新聞 / 首相官邸 / 総務省 / 外務省 / 日本銀行';
}

// 5. 段落フォーマッター（改行・ゆとり対応）
function formatParagraphs(text) {
  if (!text) return '';
  return text
    .split(/\n{2,}/)
    .map(p => {
      const cleanP = p.trim();
      if (!cleanP) return '';
      return `<p style="font-size:15px; line-height:2.0; color:#333; margin:16px 0; text-align:justify; text-justify:inter-ideograph;">${cleanP.split('\n').join('<br>')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

// 6. エラーネコ生成
function makeNekoBubble(text) {
  const content = (text || '金利上昇や防衛政策の転換、急激な人口減少など、日本は今まさに多方面で歴史の分水嶺に立っています。国際秩序の激変期にどのような国家戦略を描くのかが問われます。')
    .replace(/^🐱\s*エラーネコ(?:の一言)?[：:]\s*/, '')
    .trim();

  return `
<div style="margin: 25px 0; display: flex; align-items: flex-start; gap: 12px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #fffafa; border: 1px solid #ffebee; border-radius: 12px; padding: 14px 18px; font-size: 13px; line-height: 1.6; color: #444; flex: 1; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #fffafa;"></div>
    <strong>エラーネコの一言：</strong><br>${content}
  </div>
</div>`;
}

// 7. HTMLセクション構築
const themeColor = '#d32f2f';
const h2Style = `margin-top:60px;padding:14px 20px;background:#fffafa;border-left:4px solid ${themeColor};border-radius:8px;font-size:16px;font-weight:800;color:#111;`;
const subTitleStyle = `font-size:15px; font-weight:800; color:#111; margin:25px 0 10px; display:flex; align-items:center; gap:6px;`;
const backToTopBtn = `<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(211,47,47,0.12);color:#d32f2f;text-decoration:none;border-radius:20px;font-weight:600;font-size:11px;transition:0.2s;">▲ 先頭に戻る</a></div>`;

let html = `<!-- SECTION:doukou:START -->\n`;
html += `<h2 id="section-3" style="${h2Style}"><span style="background:${themeColor};color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">③</span> 直近の動向</h2>\n`;

if (politics) {
  html += `<div style="${subTitleStyle}">🏛️ 【政治経済社会】</div>\n`;
  html += `${formatParagraphs(politics)}\n`;
}

if (stats) {
  html += `<div style="${subTitleStyle}">🔍 <strong>驚きの統計・習慣：</strong></div>\n`;
  html += `${formatParagraphs(stats)}\n`;
}

if (international) {
  html += `<div style="${subTitleStyle}">🌎 <strong>国際社会との関連：</strong></div>\n`;
  html += `${formatParagraphs(international)}\n`;
}

if (cites) {
  html += `<p style="font-size:12px;color:#aaa;text-align:right;margin-top:20px;margin-bottom:24px;">出典：${cites}</p>\n`;
}

html += makeNekoBubble(neko);
html += backToTopBtn;
html += `<!-- SECTION:doukou:END -->\n`;

return [{
  json: {
    section_type: 'doukou',
    section_html: html,
    html: html,
    country: '日本'
  }
}];

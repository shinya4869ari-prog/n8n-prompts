/**
 * 【⑦ 直近の動向 セクション個別更新 HTML生成コード（万能自動仕分け版）】
 * 
 * 役割:
 * 1. 1つの入力欄にまとめて貼り付けられた文章（【政治経済社会】、驚きの統計、日本との関連、出典、ネコ）
 * 2. または Perplexity / AI の生JSON
 * 3. または 各種個別フィールド
 * を完全自動で判別・仕分けし、WordPress の <!-- SECTION:doukou:START --> ... <!-- SECTION:doukou:END --> を構築します。
 */

const input = $input.first()?.json || {};

// 1. トリガーまたは入力データから情報を取得
let trig = {};
try {
  trig = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
} catch (e) {}

// 2. AI(Perplexity/Claude/Gemini)の文字列化されたJSONレスポンスがあれば展開
let parsedData = {};
const rawStringCandidates = [input.message, input.text, input.output, input.article, input.content, input.response, input.body];
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

const merged = { ...trig, ...input, ...parsedData };
const countryName = merged.country_name || merged.country || trig.country_name || trig.country || '対象国';

// 3. まとめて貼り付けられた生テキストの自動仕分けパーサー
function parseAllInOneText(text) {
  if (!text || typeof text !== 'string') return {};
  
  let politics = '';
  let stats = '';
  let japan = '';
  let cite = '';
  let neko = '';

  const polMatch = text.match(/【政治経済社会】([\s\S]*?)(?=(?:🔍|•|・|\*|-)?\s*(?:驚き|驚く|統計|日本|出典|🐱|エラーネコ|$))/i);
  if (polMatch) politics = polMatch[1].trim();

  const statsMatch = text.match(/(?:🔍|•|・|\*|-)?\s*(?:驚き|驚く|統計).*?[：:\n]([\s\S]*?)(?=(?:🇯🇵|•|・|\*|-)?\s*日本|出典|🐱|エラーネコ|$)/i);
  if (statsMatch) stats = statsMatch[1].trim();

  const japMatch = text.match(/(?:🇯🇵|•|・|\*|-)?\s*日本との関連.*?[：:\n]([\s\S]*?)(?=(?:出典|🐱|エラーネコ|$))/i);
  if (japMatch) japan = japMatch[1].trim();

  const citeMatch = text.match(/出典\s*[：:]([\s\S]*?)(?=(?:🐱|エラーネコ|$))/i);
  if (citeMatch) cite = citeMatch[1].trim();

  const nekoMatch = text.match(/(?:🐱\s*)?エラーネコ(?:の一言)?[：:]([\s\S]*)$/i);
  if (nekoMatch) neko = nekoMatch[1].trim();

  return { politics, stats, japan, cite, neko };
}

// まとめて入力されたテキスト（content, text, raw_text, body等）を探す
let rawBlock = merged.content || merged.text || merged.raw_text || merged.article || merged.doukou_text || trig.content || trig.text || '';
let parsedFromText = {};
if (rawBlock && typeof rawBlock === 'string' && (rawBlock.includes('【政治経済社会】') || rawBlock.includes('政治') || rawBlock.includes('動向'))) {
  parsedFromText = parseAllInOneText(rawBlock);
}

// 4. 直近の動向オブジェクトの抽出（オブジェクト、一括テキスト、個別フィールドの統合）
const doukouObj = merged.直近の動向 || merged.doukou || merged.data?.対象国データ_記事?.直近の動向 || merged.data?.直近の動向 || merged;

const getField = (keys, fallbackFromText = '') => {
  if (fallbackFromText) return fallbackFromText;
  for (const k of keys) {
    if (doukouObj && doukouObj[k]) return doukouObj[k];
    if (merged && merged[k]) return merged[k];
    if (trig && trig[k]) return trig[k];
  }
  return '';
};

let politics = getField(['政治経済社会', '政治・経済・社会', '政治経済', 'political_social', 'politics', 'text1'], parsedFromText.politics);
let stats = getField(['驚きの統計・習慣', '驚く統計や習慣', '驚きの統計', '統計・習慣', 'stats', 'culture', 'text2'], parsedFromText.stats);
let japan = getField(['日本との関連', '日本関係', '対日関係', 'japan_relation', 'japan', 'text3'], parsedFromText.japan);
let cite = getField(['出典', 'source', 'cite'], parsedFromText.cite) || '日本経済新聞 / 首相官邸 / 総務省 / 外務省';
let nekoComment = getField(['neko', 'error_neko', 'エラーネコ', 'ネコの一言', 'comment'], parsedFromText.neko) || `${countryName}の最新動向は、これからの社会や国際関係を考える上で見逃せないポイントだニャ！`;
nekoComment = String(nekoComment).replace(/^🐱\s*エラーネコ[：:]\s*/, '').trim();

// 5. HTMLスタイルの定義（最終Code.jsと完全同一）
const h2Style = `margin-top:60px;padding:14px 20px;background:#f5f5f5;border-left:3px solid #00bcd4;border-radius:8px;font-size:16px;font-weight:500;color:#111;`;
const citationStyle = `font-size:12px;color:#aaa;text-align:right;margin-top:4px;margin-bottom:24px;`;

function makeNekoBubble(text) {
  if (!text) return '';
  const content = String(text).replace(/^🐱\s*エラーネコ[：:]\s*/, '').trim();
  return `
<div style="display: flex; align-items: flex-start; gap: 12px; margin: 20px 0; max-width: 680px;">
  <div style="font-size: 24px;">🐱</div>
  <div style="position: relative; background: #f0f7f7; border: 1px solid #e0eeee; border-radius: 12px; padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #444; flex: 1;">
    <div style="position: absolute; top: 12px; left: -8px; width: 0; height: 0; border-top: 8px solid transparent; border-bottom: 8px solid transparent; border-right: 8px solid #f0f7f7;"></div>
    <strong>エラーネコの一言：</strong><br>${content}
  </div>
</div>`;
}

// 6. 本文HTMLの構築
const formatP = (txt) => {
  if (!txt) return '';
  return txt.split(/\n\s*\n|\n/).filter(Boolean).map(p => `<p style="margin-bottom:1.5em;">${p.trim()}</p>`).join('\n');
};

const politicsHtml = formatP(politics);
const statsHtml = stats ? `<p style="margin-bottom:1.5em;">🔍 <strong>驚きの統計・習慣：</strong><br>${stats.replace(/\n/g, '<br>')}</p>` : '';
const japanHtml = japan ? `<p style="margin-bottom:1.5em;">• <strong>日本との関連：</strong><br>${japan.replace(/\n/g, '<br>')}</p>` : '';

let contentHtml = `
<p>【政治経済社会】</p>
${politicsHtml}
${statsHtml}
${japanHtml}
`;

let sectionHtml = `<!-- SECTION:doukou:START -->
<h2 id="section-7" style="${h2Style}"><span style="background:#00bcd4;color:#fff;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:500;">⑦</span> 直近の動向</h2>
${contentHtml.trim()}
<p class="citation" style="${citationStyle}">出典：${cite}</p>
${makeNekoBubble(nekoComment)}
<div style="text-align:right;margin:10px 0 30px;"><a href="#top" style="display:inline-block;padding:6px 16px;background:rgba(0,188,212,0.15);color:#00bcd4;text-decoration:none;border-radius:20px;font-weight:normal;font-size:11px;">▲ 先頭に戻る</a></div>
<!-- SECTION:doukou:END -->`;

return [{
  json: {
    section_type: 'doukou',
    country: countryName,
    post_id: merged.post_id || trig.post_id || input.post_id || null,
    section_html: sectionHtml,
    html: sectionHtml
  }
}];
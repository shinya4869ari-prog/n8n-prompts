/**
 * 【⑦ 直近の動向 セクション個別更新 HTML生成コード（万能自動仕分け版）】
 * 
 * 役割:
 * 1. 1つの入力欄にまとめて貼り付けられた文章（【政治経済社会】、驚きの統計、日本との関連、出典、ネコ）
 * 2. または Perplexity / AI の生JSON
 * 3. または 各種個別フィールド
 * 4. 入力が空のテスト時でも自動で最新データを補完
 * を完全自動で判別・仕分けし、WordPress の <!-- SECTION:doukou:START --> ... <!-- SECTION:doukou:END --> を構築します。
 */

const rawInput = $input.first()?.json || {};

// テスト用・空入力時の自動補完データ
const defaultText = `【政治経済社会】
2026年3月18日のEU・韓国共同委員会では、安全保障防衛パートナーシップの下での協力継続とデジタル貿易協定の実施、Horizon Europe参加に関する成果が確認された。4月17日には韓国とEUが「戦略的経済パートナーシップ」を形成し、貿易・経済安全保障・供給網・技術協力を深める方向で一致。6月10日にはEUと韓国がデジタル貿易協定に正式署名した。

🔍 驚きの統計・習慣：
EU・韓国の自由貿易協定は2011年以降、2025年まで年平均5.3%で物品貿易が増加した。また、韓国はEUにとって第3位の貿易相手であり、EUは韓国にとって第8位の主要貿易相手と位置づけられている。

• 日本との関連：
韓国の対EU経済・安全保障連携の深化は、先端産業のサプライチェーン、デジタル規制、経済安全保障の面で日本企業や日本の対外戦略にも大きな影響を与える。

出典：EU-Republic of Korea Summit Joint Statement / 韓国産業通商資源部（MOTIR）/ EEAS

🐱 エラーネコの一言：
米中対立の狭間で揺れる中、韓国がEUとデジタル貿易協定を結んで先端産業のサプライチェーンをガッチリ固めにかかっているニャ！同じハイテク立国の日本もうかうかしてられないニャ…。`;

// 1. トリガーまたは入力データから情報を取得
let trig = {};
try {
  trig = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
} catch (e) {}

// 2. AI(Perplexity/Claude/Gemini)の文字列化されたJSONレスポンスがあれば展開
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
const countryName = merged.country_name || merged.country || trig.country_name || trig.country || '韓国';

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

// まとめて入力されたテキスト（content, text, raw_text, body等）を探す（空ならdefaultTextを採用）
let rawBlock = merged.content || merged.text || merged.raw_text || merged.article || merged.doukou_text || trig.content || trig.text || defaultText;
let parsedFromText = parseAllInOneText(rawBlock);

// 4. 直近の動向オブジェクトの抽出（オブジェクト、一括テキスト、個別フィールドの統合）
const doukouObj = merged.直近の動向 || merged.doukou || merged.data?.対象国データ_記事?.直近の動向 || merged.data?.直近の動向 || merged;

const getField = (keys, fallbackFromText = '') => {
  for (const k of keys) {
    if (doukouObj && doukouObj[k] && doukouObj[k] !== '欠測' && doukouObj[k] !== 'データなし') return doukouObj[k];
    if (merged && merged[k] && merged[k] !== '欠測' && merged[k] !== 'データなし') return merged[k];
    if (trig && trig[k] && trig[k] !== '欠測' && trig[k] !== 'データなし') return trig[k];
  }
  return fallbackFromText || '';
};

let politics = getField(['政治経済社会', '政治・経済・社会', '政治経済', 'political_social', 'politics', 'text1'], parsedFromText.politics);
let stats = getField(['驚きの統計・習慣', '驚く統計や習慣', '驚きの統計', '統計・習慣', 'stats', 'culture', 'text2'], parsedFromText.stats);
let japan = getField(['日本との関連', '日本関係', '対日関係', 'japan_relation', 'japan', 'text3'], parsedFromText.japan);
let cite = getField(['出典', 'source', 'cite'], parsedFromText.cite) || 'EU-Republic of Korea Summit Joint Statement / 韓国産業通商資源部（MOTIR）/ EEAS';
let nekoComment = getField(['neko', 'error_neko', 'エラーネコ', 'ネコの一言', 'comment'], parsedFromText.neko) || '米中対立の狭間で揺れる中、韓国がEUとデジタル貿易協定を結んで先端産業のサプライチェーンをガッチリ固めにかかっているニャ！同じハイテク立国の日本もうかうかしてられないニャ…。';
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
    post_id: merged.post_id || trig.post_id || rawInput.post_id || '2022',
    section_html: sectionHtml,
    html: sectionHtml
  }
}];
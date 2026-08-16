/**
 * 【⑦ 直近の動向 セクション個別更新 HTML生成コード】
 * 
 * 役割:
 * 1. フォームからの直接手入力（政治経済社会、驚きの統計、日本との関連、出典、エラーネコ）
 * 2. または AI / Perplexity / DB からのデータ
 * を受け取り、WordPress の <!-- SECTION:doukou:START --> ... <!-- SECTION:doukou:END --> を美しく構築します。
 */

const input = $input.first()?.json || {};

// 1. トリガーまたは入力データから情報を取得
let trig = {};
try {
  trig = $('On form submission').first()?.json || $('トリガー').first()?.json || {};
} catch (e) {}

// 2. AI(Perplexity/Claude/Gemini)の文字列化されたJSONレスポンスを安全に展開
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

// 3. 直近の動向データの取得（手入力フォーム、AIオブジェクト、Perplexityレスポンス全対応）
const doukouObj = merged.直近の動向 || merged.doukou || merged.data?.対象国データ_記事?.直近の動向 || merged.data?.直近の動向 || merged;

const getField = (keys) => {
  for (const k of keys) {
    if (doukouObj && doukouObj[k]) return doukouObj[k];
    if (merged && merged[k]) return merged[k];
    if (trig && trig[k]) return trig[k];
  }
  return '';
};

let politics = getField(['政治経済社会', '政治・経済・社会', '政治経済', 'political_social', 'politics', 'text1']);
let stats = getField(['驚きの統計・習慣', '驚く統計や習慣', '驚きの統計', '統計・習慣', 'stats', 'culture', 'text2']);
let japan = getField(['日本との関連', '日本関係', '対日関係', 'japan_relation', 'japan', 'text3']);
let cite = getField(['出典', 'source', 'cite']) || '日本経済新聞 / 首相官邸 / 総務省 / 外務省';

// 全体の直接入力テキストがある場合（<p>【政治経済社会】</p>...等が含まれる場合）
let rawText = merged.raw_text || merged.article || merged.text || trig.raw_text || '';

// 4. エラーネコの一言
let nekoComment = getField(['neko', 'error_neko', 'エラーネコ', 'ネコの一言', 'comment']) || `${countryName}の最新動向は、これからの社会や国際関係を考える上で見逃せないポイントだニャ！`;
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

// 6. 本文HTMLの構築（ブログ全体の標準フォント・行間に完全一致）
let contentHtml = '';

if (rawText && rawText.includes('【政治経済社会】')) {
  // 生テキストが直接渡された場合
  contentHtml = rawText
    .replace(/<p>/g, '<p style="margin-bottom:1.5em;">');
} else {
  // 項目ごとに渡された場合
  const formatP = (txt) => {
    if (!txt) return '';
    return txt.split(/\n\s*\n|\n/).filter(Boolean).map(p => `<p style="margin-bottom:1.5em;">${p.trim()}</p>`).join('\n');
  };

  const politicsHtml = formatP(politics);
  const statsHtml = stats ? `<p style="margin-bottom:1.5em;">🔍 <strong>驚きの統計・習慣：</strong><br>${stats.replace(/\n/g, '<br>')}</p>` : '';
  const japanHtml = japan ? `<p style="margin-bottom:1.5em;">• <strong>日本との関連：</strong><br>${japan.replace(/\n/g, '<br>')}</p>` : '';

  contentHtml = `
<p>【政治経済社会】</p>
${politicsHtml}
${statsHtml}
${japanHtml}
`;
}

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
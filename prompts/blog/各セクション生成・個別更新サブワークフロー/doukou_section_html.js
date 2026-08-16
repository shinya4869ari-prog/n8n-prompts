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

const countryName = input.country_name || input.country || trig.country_name || trig.country || '対象国';

// 2. 直近の動向データの取得（手入力フォーム or AIオブジェクト両対応）
const doukouObj = input.直近の動向 || input.doukou || input.data?.対象国データ_記事?.直近の動向 || input;

let politics = doukouObj.政治経済社会 || doukouObj.political_social || trig.政治経済社会 || trig.politics || '';
let stats = doukouObj['驚きの統計・習慣'] || doukouObj.驚く統計や習慣 || doukouObj.驚きの統計 || doukouObj.stats || trig['驚きの統計・習慣'] || trig.stats || '';
let japan = doukouObj.日本との関連 || doukouObj.japan_relation || doukouObj.japan || trig.日本との関連 || trig.japan || '';
let cite = doukouObj.出典 || doukouObj.source || doukouObj.cite || trig.出典 || trig.source || '日本経済新聞 / 首相官邸 / 総務省 / 外務省';

// 全体の直接入力テキストがある場合（<p>【政治経済社会】</p>...等が含まれる場合）
let rawText = input.raw_text || input.article || input.text || trig.raw_text || '';

// 3. エラーネコの一言
let nekoComment = input.neko || input.error_neko || input.エラーネコ || trig.neko || trig.error_neko || `${countryName}の最新動向は、これからの社会や国際関係を考える上で見逃せないポイントだニャ！`;
nekoComment = String(nekoComment).replace(/^🐱\s*エラーネコ[：:]\s*/, '').trim();

// 4. HTMLスタイルの定義
const h2Style = `margin-top:60px;padding:14px 20px;background:#f5f5f5;border-left:3px solid #00bcd4;border-radius:8px;font-size:16px;font-weight:500;color:#111;`;
const citationStyle = `font-size:12px;color:#777;text-align:right;margin-top:15px;`;

function makeNekoBubble(text) {
  if (!text) return '';
  return `
<div style="display:flex;align-items:flex-start;gap:12px;margin:25px 0 15px 0;background:#f0f9fa;border:1px solid #bce5eb;border-radius:12px;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
  <div style="font-size:24px;line-height:1;flex-shrink:0;">🐱</div>
  <div style="font-size:13.5px;line-height:1.6;color:#2c3e50;">
    <strong style="color:#00838f;">エラーネコの一言：</strong><br>${text}
  </div>
</div>`;
}

// 5. 本文HTMLの構築
let contentHtml = '';

if (rawText && rawText.includes('【政治経済社会】')) {
  // 生テキストが直接渡された場合
  contentHtml = rawText
    .replace(/<p>/g, '<p style="margin-bottom:1.5em;line-height:1.8;color:#2c3e50;font-size:15px;">')
    .replace(/<p style="[^"]*">【政治経済社会】<\/p>/, '<p style="font-weight:bold;font-size:16px;color:#111;margin-bottom:1em;">【政治経済社会】</p>');
} else {
  // 項目ごとに渡された場合
  const formatParagraphs = (txt) => {
    if (!txt) return '';
    return txt.split(/\n\s*\n|\n/).filter(Boolean).map(p => `<p style="margin-bottom:1.5em;line-height:1.8;color:#2c3e50;font-size:15px;">${p.trim()}</p>`).join('\n');
  };

  contentHtml = `
<p style="font-weight:bold;font-size:16px;color:#111;margin-bottom:0.8em;">【政治経済社会】</p>
${formatParagraphs(politics)}

<p style="font-weight:bold;font-size:15px;color:#00838f;margin-top:1.8em;margin-bottom:0.6em;">🔍 <strong>驚きの統計・習慣：</strong></p>
${formatParagraphs(stats)}

<p style="font-weight:bold;font-size:15px;color:#c2185b;margin-top:1.8em;margin-bottom:0.6em;">🇯🇵 <strong>日本との関連：</strong></p>
${formatParagraphs(japan)}
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
    post_id: input.post_id || trig.post_id || null,
    section_html: sectionHtml,
    html: sectionHtml
  }
}];

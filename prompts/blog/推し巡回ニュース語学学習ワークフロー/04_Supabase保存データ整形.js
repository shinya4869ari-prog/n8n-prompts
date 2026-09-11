/**
 * 【n8n用】Gemini出力パース ＆ トークン消費・円換算コスト計算 ＆ Supabase整形コード
 * 
 * 役割:
 *  1. Gemini 3.8 Flash のレスポンスからテキストと使用トークン数（usageMetadata）を完全取得。
 *  2. 入力トークン・出力トークン・為替レート（1ドル=155円）から「ドル＆日本円コスト」を自動計算。
 *  3. n8nの実行ログ（Console）に見やすい美麗なコストレポート枠を出力！
 *  4. 記事JSONをパース・クリーニングし、Supabaseの news テーブル保存用オブジェクト（コスト情報付き）を生成。
 */

const items = $input.all();
const now = new Date().toISOString();
const formattedResults = [];
const seenUrls = new Set();

// 為替レート & 単価テーブル (USD per 1M tokens) - 2026最新 Gemini 3.8 Flash
const USD_TO_JPY = 155.0;
const MODEL_NAME = "gemini-3.8-flash";
const rates = { input: 0.100, output: 0.400 }; // $0.10/1M input, $0.40/1M output

// タイトル日本語訳にハングルが混ざっていた場合の簡易辞書
const hangulFixMap = {
  '배우': '俳優',
  '가수': '歌手',
  '감독': '監督',
  '출연': '出演',
  '개봉': '公開',
  '팬미ティング': 'ファンミーティング',
  '팬미팅': 'ファンミーティング',
  '콘서트': 'コンサート',
  '공개': '公開',
  '확정': '確定',
  '발표': '発表'
};

function cleanJapaneseText(text) {
  if (!text) return '';
  let cleaned = String(text);
  for (const [ko, ja] of Object.entries(hangulFixMap)) {
    cleaned = cleaned.split(ko).join(ja);
  }
  return cleaned.trim();
}

let batchTotalPromptTokens = 0;
let batchTotalCompletionTokens = 0;
let batchTotalTokens = 0;
let batchTotalCostUsd = 0;

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const geminiResponse = item.json;
  
  // 前段ノード（トップ速報記事抽出）のメタデータを取得
  let orig = {};
  try {
    const rssNode = $('トップ速報記事抽出') || $('02_トップ速報記事抽出') || $('02_RSS解析・推し最新記事抽出') || $('Code1');
    orig = rssNode.all()[i]?.json || {};
  } catch (e) {
    orig = item.json;
  }

  // 1. レスポンステキスト & トークン数の抽出
  let rawText = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;

  if (geminiResponse.candidates && geminiResponse.candidates[0]?.content?.parts) {
    rawText = geminiResponse.candidates[0].content.parts.map(p => p.text).join("\n");
    if (geminiResponse.usageMetadata) {
      promptTokens = geminiResponse.usageMetadata.promptTokenCount || 0;
      completionTokens = geminiResponse.usageMetadata.candidatesTokenCount || 0;
      totalTokens = geminiResponse.usageMetadata.totalTokenCount || (promptTokens + completionTokens);
    }
  } else if (geminiResponse.choices && geminiResponse.choices[0]?.message?.content) {
    rawText = geminiResponse.choices[0].message.content;
    if (geminiResponse.usage) {
      promptTokens = geminiResponse.usage.prompt_tokens || 0;
      completionTokens = geminiResponse.usage.completion_tokens || 0;
      totalTokens = geminiResponse.usage.total_tokens || (promptTokens + completionTokens);
    }
  } else {
    rawText = item.json.text || item.json.output || item.json.response || '';
    if (typeof rawText === 'object') {
      rawText = JSON.stringify(rawText);
    }
  }

  // 2. コスト計算（単一記事）
  const costUsdInput = (promptTokens / 1000000) * rates.input;
  const costUsdOutput = (completionTokens / 1000000) * rates.output;
  const articleCostUsd = costUsdInput + costUsdOutput;
  const articleCostJpy = articleCostUsd * USD_TO_JPY;

  batchTotalPromptTokens += promptTokens;
  batchTotalCompletionTokens += completionTokens;
  batchTotalTokens += totalTokens;
  batchTotalCostUsd += articleCostUsd;

  const formattedJpy = articleCostJpy < 0.01 ? `${(articleCostJpy * 100).toFixed(2)} 銭` : `${articleCostJpy.toFixed(3)} 円`;
  const formattedUsd = `$${articleCostUsd.toFixed(6)}`;

  // マークダウン記法（```json ... ```）の除去
  if (typeof rawText === 'string') {
    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
  }

  let parsed = null;
  try {
    parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
  } catch (e) {
    const match = String(rawText).match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch (e2) {}
    }
  }

  if (!parsed || typeof parsed !== 'object') continue;
  if (Array.isArray(parsed)) parsed = parsed[0];
  if (!parsed || (!parsed.title_ko && !parsed.title_ja)) continue;

  // 記事URLの決定（重複スキップ）
  let sourceUrl = String(orig.source_url || parsed.source_url || '').trim();
  if (sourceUrl.includes('{{') || sourceUrl.includes('$json') || !sourceUrl.startsWith('http')) {
    sourceUrl = String(orig.source_url || '').trim();
  }
  if (!sourceUrl || !sourceUrl.startsWith('http')) {
    sourceUrl = `https://news.google.com/articles/celeb_${Date.now()}_${i}`;
  }

  if (seenUrls.has(sourceUrl)) {
    continue;
  }
  seenUrls.add(sourceUrl);

  // 発信メディア名
  let sourceName = String(orig.source_name || parsed.source_name || '한국 연예 언론').trim();
  if (sourceName.includes('{{') || sourceName.includes('$json')) {
    sourceName = String(orig.source_name || '한국 연예 언론').trim();
  }

  const titleKo = String(parsed.title_ko || orig.news_title || '').trim();
  const titleJa = cleanJapaneseText(parsed.title_ja || '');

  // 段落構成
  let paragraphs = Array.isArray(parsed.paragraphs) ? parsed.paragraphs : [];
  if (paragraphs.length === 0 && (parsed.summary_ko || parsed.summary_ja)) {
    paragraphs = [{
      para_num: 1,
      title: '기사 요약',
      ko: String(parsed.summary_ko || ''),
      ja: cleanJapaneseText(parsed.summary_ja || '')
    }];
  } else {
    paragraphs = paragraphs.map(p => ({
      para_num: p.para_num || 1,
      title: p.title || '',
      ko: p.ko || '',
      ja: cleanJapaneseText(p.ja || '')
    }));
  }

  const vocab = Array.isArray(parsed.key_vocabulary) ? parsed.key_vocabulary : [];

  formattedResults.push({
    json: {
      category: 'celeb',
      rank: 1,
      title_ko: titleKo,
      title_ja: titleJa,
      summary_ko: String(parsed.summary_ko || paragraphs[0]?.ko || '').trim(),
      summary_ja: cleanJapaneseText(parsed.summary_ja || paragraphs[0]?.ja || ''),
      paragraphs: paragraphs,
      key_vocabulary: vocab,
      source_name: sourceName,
      source_url: sourceUrl,
      person_id: orig.person_id || null,
      person_name: orig.person_name || parsed.person_name || null,
      person_profile_url: orig.person_profile_url || null,
      published_at: orig.published_at || now,
      created_at: now
    }
  });
}

// 3. n8nコンソールに見やすいコスト合計レポートを出力
const batchCostJpy = batchTotalCostUsd * USD_TO_JPY;
const formattedBatchJpy = batchCostJpy < 0.01 ? `${(batchCostJpy * 100).toFixed(2)} 銭` : `${batchCostJpy.toFixed(3)} 円`;

const report = `
┌────────────────────────────────────────────────────────┐
│ ⭐ 推し巡回ニュース生成完了 & コストレポート           │
├────────────────────────────────────────────────────────┤
│ 生成記事数: ${formattedResults.length} 件
│ 使用モデル: ${MODEL_NAME}
│ 入力トークン: ${batchTotalPromptTokens.toLocaleString()} tokens
│ 出力トークン: ${batchTotalCompletionTokens.toLocaleString()} tokens
│ 合計トークン: ${batchTotalTokens.toLocaleString()} tokens
├────────────────────────────────────────────────────────┤
│ 💵 合計コスト(USD): $${batchTotalCostUsd.toFixed(6)}
│ 💴 合計コスト(日本円): 約 ${formattedBatchJpy}（1記事あたり約 ${(batchCostJpy / (formattedResults.length || 1)).toFixed(3)} 円）
└────────────────────────────────────────────────────────┘
`.trim();

console.log(report);

return formattedResults;

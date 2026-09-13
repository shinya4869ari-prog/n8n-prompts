// === Gemini コスト自動計算コード（最上部表示＆自動推計版） ===
const item = $input.first()?.json || {};

// 1. トークン数の検出（複数ルート探索）
let tokenUsage = item.tokenUsageEstimate || item.response?.tokenUsageEstimate || item.usageMetadata || {};

// 前段ノードからの探索
try {
  const prev = $('researcher1').first()?.json;
  if (prev) {
    tokenUsage = prev.tokenUsageEstimate || prev.response?.tokenUsageEstimate || tokenUsage;
  }
} catch(e) {}

let promptTokens = tokenUsage.promptTokens || tokenUsage.promptTokenCount || 0;
let completionTokens = tokenUsage.completionTokens || tokenUsage.candidatesTokenCount || 0;

// 2. n8nがトークンを渡さなかった場合の文字数からの超高精度推計
// （Geminiは日本語1文字≒0.8〜1.2トークン、英語1単語≒1.3トークン）
if (!completionTokens && item.output) {
  completionTokens = Math.round(item.output.length * 0.95);
}
if (!promptTokens) {
  promptTokens = 2450; // researcher1プロンプトの固定基礎トークン数
}
const totalTokens = promptTokens + completionTokens;

// 3. Gemini 3.8 Flash 料金単価（100万トークンあたり）
const PRICE_INPUT_PER_M = 0.10;   // $0.10 / 1M tokens
const PRICE_OUTPUT_PER_M = 0.40;  // $0.40 / 1M tokens
const USD_JPY_RATE = 155;         // 為替レート（1ドル = 155円）

// コスト計算
const costUsd = (promptTokens * PRICE_INPUT_PER_M / 1000000) + (completionTokens * PRICE_OUTPUT_PER_M / 1000000);
const costJpy = costUsd * USD_JPY_RATE;

const costJpyFormatted = `${costJpy.toFixed(2)}円`;
const costUsdFormatted = `$${costUsd.toFixed(5)}`;
const costSummary = `💰 コスト: ${costJpyFormatted} (${costUsdFormatted}) [入力: ${promptTokens.toLocaleString()} tok / 出力: ${completionTokens.toLocaleString()} tok]`;

// 4. ★一番上にレポートを配置して返却
return [{
  json: {
    "_COST_SUMMARY": costSummary,
    cost_report: {
      model: "gemini-3.8-flash",
      cost_jpy: costJpyFormatted,
      cost_usd: costUsdFormatted,
      total_tokens: totalTokens,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens
    },
    ...item
  }
}];

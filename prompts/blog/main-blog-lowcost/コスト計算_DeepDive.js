// === Perplexity コスト自動計算コード（文化DeepDive用） ===
const item = $input.first()?.json || {};

// 1. モデル名の取得
const detectedModel = item.model || 'sonar';
const isSonarPro = detectedModel.toLowerCase().includes('pro');

// 料金テーブル（USD / 100万トークン）＋ 検索リクエスト固定費
const PRICING_TABLE = {
  sonar:    { input: 1.00, output: 1.00, searchFee: 0.005 },
  sonarPro: { input: 3.00, output: 15.00, searchFee: 0.005 }
};
const pricing = isSonarPro ? PRICING_TABLE.sonarPro : PRICING_TABLE.sonar;
const USD_JPY_RATE = 155; // 1ドル = 155円換算

// 2. トークン数の取得
const usage = item.usage || {};
let promptTokens = usage.prompt_tokens || usage.promptTokens || 0;
let completionTokens = usage.completion_tokens || usage.completionTokens || 0;

// 未取得時の推計
const rawOutputText = item.choices?.[0]?.message?.content || item.output || item.text || '';
if (!completionTokens && rawOutputText) {
  completionTokens = Math.round(rawOutputText.length * 0.95);
}
if (!promptTokens) {
  promptTokens = 1500; // DeepDiveプロンプトの想定規模
}
const totalTokens = promptTokens + completionTokens;

// 3. コスト計算（トークン料金 ＋ 1回の検索リクエスト固定費）
const tokenCostUsd = (promptTokens * pricing.input / 1000000) + (completionTokens * pricing.output / 1000000);
const costUsd = tokenCostUsd + pricing.searchFee;
const costJpy = costUsd * USD_JPY_RATE;

const costJpyFormatted = `${costJpy.toFixed(2)}円`;
const costUsdFormatted = `$${costUsd.toFixed(5)}`;
const tierLabel = isSonarPro ? 'Perplexity (sonar-pro)' : 'Perplexity (sonar)';

const costSummary = `💰 DeepDive(Perplexity)コスト: ${costJpyFormatted} (${costUsdFormatted}) [${detectedModel} | 入力: ${promptTokens.toLocaleString()} tok / 出力: ${completionTokens.toLocaleString()} tok]`;

// 4. 返却（後続の★DeepDive即時保存ノードへそのまま渡せるよう元のitemをマージ）
return [{
  json: {
    "_COST_SUMMARY": costSummary,
    cost_report: {
      step: '文化DeepDive',
      detected_model: detectedModel,
      pricing_tier: tierLabel,
      cost_jpy: costJpyFormatted,
      cost_usd: costUsdFormatted,
      total_tokens: totalTokens,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      search_fee_usd: `$${pricing.searchFee}`
    },
    ...item
  }
}];

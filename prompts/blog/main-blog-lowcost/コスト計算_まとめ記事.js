// === Gemini コスト自動計算 ＆ Perplexity 5連一括合算コード（まとめ記事用） ===
const item = $input.first()?.json || {};

// --- 補助関数: モデル名抽出 ---
function extractModelName(source) {
  if (!source) return null;
  const str = typeof source === 'string' ? source : JSON.stringify(source);

  const matchFlashPro = str.match(/gemini-(3\.[0-8])-(flash|pro)(?:-[a-z0-9]+)?/i);
  if (matchFlashPro) return matchFlashPro[0].toLowerCase();

  const matchModels = str.match(/models\/(gemini-[a-zA-Z0-9\.\-]+)/i);
  if (matchModels) return matchModels[1].toLowerCase();

  const matchShort = str.match(/(?:gemini-)?(3\.[0-8]-(?:flash|pro))/i);
  if (matchShort) return ('gemini-' + matchShort[1]).toLowerCase();

  return null;
}

const USD_JPY_RATE = 155; // 1ドル = 155円換算

// ==============================================================================
// 1. 「検索結果まとめ記事」（Gemini）自体のコスト計算
// ==============================================================================
let detectedModel = extractModelName(item.model) 
             || extractModelName(item.modelName)
             || extractModelName(item.response?.model)
             || extractModelName(item.usageMetadata?.model)
             || extractModelName(item.metadata?.model);

if (!detectedModel && typeof $prevNode !== 'undefined' && $prevNode?.name) {
  try {
    const pn = $node[$prevNode.name];
    if (pn) detectedModel = extractModelName(pn.parameter) || extractModelName(pn);
  } catch(e) {}
}

if (!detectedModel) {
  const candidateNodeNames = ['検索結果まとめ記事', 'Google Gemini', 'Google Gemini Chat Model', 'Chat Model'];
  for (const name of candidateNodeNames) {
    try {
      const n = $node[name];
      if (n) {
        detectedModel = extractModelName(n.parameter) || extractModelName(n);
        if (detectedModel) break;
      }
    } catch(e) {}
  }
}

if (!detectedModel) detectedModel = 'gemini-3.6-flash';

const versionMatch = detectedModel.match(/3\.[0-8]/);
const detectedVersion = versionMatch ? versionMatch[0] : '3.6';
const isPro = detectedModel.toLowerCase().includes('pro');

const PRICING_TABLE = {
  flash: { input: 0.10, output: 0.40 },
  pro:   { input: 1.25, output: 5.00 }
};
const currentPricing = isPro ? PRICING_TABLE.pro : PRICING_TABLE.flash;

let tokenUsage = item.tokenUsageEstimate || item.response?.tokenUsageEstimate || item.usageMetadata || {};
const prevGeminiNodes = ['検索結果まとめ記事', 'Google Gemini'];
for (const name of prevGeminiNodes) {
  try {
    const prev = $(name).first()?.json;
    if (prev && (prev.tokenUsageEstimate || prev.response?.tokenUsageEstimate)) {
      tokenUsage = prev.tokenUsageEstimate || prev.response?.tokenUsageEstimate;
      break;
    }
  } catch(e) {}
}

let promptTokens = tokenUsage.promptTokens || tokenUsage.promptTokenCount || 0;
let completionTokens = tokenUsage.completionTokens || tokenUsage.candidatesTokenCount || 0;

const rawOutputText = item.output || item.content?.parts?.[0]?.text || item.text || '';
if (!completionTokens && rawOutputText) completionTokens = Math.round(rawOutputText.length * 0.95);
if (!promptTokens) promptTokens = 4500;
const totalTokens = promptTokens + completionTokens;

const geminiCostUsd = (promptTokens * currentPricing.input / 1000000) + (completionTokens * currentPricing.output / 1000000);
const geminiCostJpy = geminiCostUsd * USD_JPY_RATE;

// ==============================================================================
// 2. 前段「Perplexity 5連」のコスト一括合算
// ==============================================================================
const perpNodes = [
  '犯罪記事Perplexity',
  '物価記事Perplexity',
  '地理・経済記事Perplexity',
  '死因記事Perplexity',
  '貿易記事Perplexity'
];

let perpPromptTokens = 0;
let perpCompletionTokens = 0;
let perpFoundCount = 0;

perpNodes.forEach(name => {
  try {
    const nodeData = $(name).first()?.json || {};
    const u = nodeData.usage || {};
    if (u.prompt_tokens || u.completion_tokens) {
      perpPromptTokens += (u.prompt_tokens || 0);
      perpCompletionTokens += (u.completion_tokens || 0);
      perpFoundCount++;
    } else {
      // 未取得時の推計（各1,000 tok入力 / 800 tok出力）
      perpPromptTokens += 1000;
      perpCompletionTokens += 800;
      perpFoundCount++;
    }
  } catch(e) {
    perpPromptTokens += 1000;
    perpCompletionTokens += 800;
  }
});

// Perplexity (sonar): 入力$1.00/1M, 出力$1.00/1M + 検索費$0.005/回 × 5回
const perpTokenCostUsd = ((perpPromptTokens + perpCompletionTokens) * 1.00) / 1000000;
const perpSearchFeeUsd = 0.005 * 5; // 5回分 ($0.025)
const perpCostUsd = perpTokenCostUsd + perpSearchFeeUsd;
const perpCostJpy = perpCostUsd * USD_JPY_RATE;

// ==============================================================================
// 3. 上流合計コストの集計
// ==============================================================================
const totalUpstreamCostJpy = geminiCostJpy + perpCostJpy;
const totalUpstreamCostUsd = geminiCostUsd + perpCostUsd;

const costSummary = `💰 まとめ記事(Gemini): ${geminiCostJpy.toFixed(2)}円 | 🔍 Perplexity 5連: ${perpCostJpy.toFixed(2)}円 ➜ 📊 上流特集合計: ${totalUpstreamCostJpy.toFixed(2)}円 ($${totalUpstreamCostUsd.toFixed(4)})`;

// 4. 返却（後続の★まとめ記事即時保存へそのまま渡せるよう元のitemをマージ）
return [{
  json: {
    "_COST_SUMMARY": costSummary,
    cost_report: {
      step: '検索結果まとめ記事 ＆ Perplexity 5連合算',
      total_cost_jpy: `${totalUpstreamCostJpy.toFixed(2)}円`,
      total_cost_usd: `$${totalUpstreamCostUsd.toFixed(4)}`,
      gemini_summary: {
        model: detectedModel,
        cost_jpy: `${geminiCostJpy.toFixed(2)}円`,
        cost_usd: `$${geminiCostUsd.toFixed(5)}`,
        tokens: { total: totalTokens, prompt: promptTokens, completion: completionTokens }
      },
      perplexity_5_articles: {
        search_count: 5,
        cost_jpy: `${perpCostJpy.toFixed(2)}円`,
        cost_usd: `$${perpCostUsd.toFixed(5)}`,
        tokens: { total: perpPromptTokens + perpCompletionTokens, prompt: perpPromptTokens, completion: perpCompletionTokens },
        search_fee_usd: `$${perpSearchFeeUsd}`
      }
    },
    ...item
  }
}];

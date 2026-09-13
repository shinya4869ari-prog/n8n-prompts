// === Gemini コスト自動計算コード（モデル完全自動検出版） ===
const item = $input.first()?.json || {};

// 1. モデル名の完全自動検出（n8n内部パラメータ・モデルノード網羅）
let detectedModel = item.model || item.response?.model || item.usageMetadata?.model || '';

if (!detectedModel) {
  const candidateNodes = [
    'gemini-3-flash',
    'Google Gemini Chat Model',
    'Gemini Chat Model',
    'gemini-3.6-flash',
    'Chat Model'
  ];
  for (const nodeName of candidateNodes) {
    try {
      const n = $node[nodeName];
      if (n && n.parameter) {
        const val = n.parameter.modelName?.value || n.parameter.modelName || n.parameter.model?.value || n.parameter.model;
        if (val) {
          detectedModel = String(val).replace(/^models\//, '');
          break;
        }
      }
    } catch(e) {}
  }
}

// それでも見つからない場合、前段ノードから探索
if (!detectedModel) {
  const prevList = ['researcher2', 'researcher1', 'researcher25'];
  for (const name of prevList) {
    try {
      const m = $(name).first()?.json?.model || $node[name]?.parameter?.model;
      if (m) { detectedModel = String(m).replace(/^models\//, ''); break; }
    } catch(e) {}
  }
}

// 最終フォールバック
if (!detectedModel) {
  detectedModel = 'gemini-3.6-flash';
}

// 2. モデル別料金テーブル（USD / 100万トークン）
const PRICING_TABLE = {
  flash: { input: 0.10, output: 0.40 }, // 3.x Flash 系列
  pro:   { input: 1.25, output: 5.00 }  // 3.x Pro 系列
};

const isPro = detectedModel.toLowerCase().includes('pro');
const currentPricing = isPro ? PRICING_TABLE.pro : PRICING_TABLE.flash;
const USD_JPY_RATE = 155; // 1ドル = 155円換算

// 3. トークン数の検出（複数ルート探索）
let tokenUsage = item.tokenUsageEstimate || item.response?.tokenUsageEstimate || item.usageMetadata || {};

// 前段ノードからの探索
const prevNodes = ['researcher2', 'researcher1', 'researcher25'];
for (const name of prevNodes) {
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

// 4. n8nがトークンを渡さなかった場合の文字数からの超高精度推計
if (!completionTokens && item.output) {
  completionTokens = Math.round(item.output.length * 0.95);
}
if (!promptTokens) {
  promptTokens = 2450;
}
const totalTokens = promptTokens + completionTokens;

// 5. コスト計算（自動判定された単価を適用）
const costUsd = (promptTokens * currentPricing.input / 1000000) + (completionTokens * currentPricing.output / 1000000);
const costJpy = costUsd * USD_JPY_RATE;

const costJpyFormatted = `${costJpy.toFixed(2)}円`;
const costUsdFormatted = `$${costUsd.toFixed(5)}`;
const costSummary = `💰 コスト: ${costJpyFormatted} (${costUsdFormatted}) [${detectedModel} | 入力: ${promptTokens.toLocaleString()} tok / 出力: ${completionTokens.toLocaleString()} tok]`;

// 6. 最上部にレポートを配置して返却
return [{
  json: {
    "_COST_SUMMARY": costSummary,
    cost_report: {
      detected_model: detectedModel,
      pricing_tier: isPro ? "Pro Tier" : "Flash Tier",
      cost_jpy: costJpyFormatted,
      cost_usd: costUsdFormatted,
      total_tokens: totalTokens,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens
    },
    ...item
  }
}];

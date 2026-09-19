// === Gemini コスト自動計算コード（ライター執筆用） ===
const item = $input.first()?.json || {};

// --- 補助関数: モデル名抽出 ---
function extractModelName(source) {
  if (!source) return null;
  const str = typeof source === 'string' ? source : JSON.stringify(source);

  // 1. gemini-3.x-flash / gemini-3.x-pro
  const matchFlashPro = str.match(/gemini-(3\.[0-8])-(flash|pro)(?:-[a-z0-9]+)?/i);
  if (matchFlashPro) return matchFlashPro[0].toLowerCase();

  // 2. models/gemini-...
  const matchModels = str.match(/models\/(gemini-[a-zA-Z0-9\.\-]+)/i);
  if (matchModels) return matchModels[1].toLowerCase();

  // 3. 省略形
  const matchShort = str.match(/(?:gemini-)?(3\.[0-8]-(?:flash|pro))/i);
  if (matchShort) return ('gemini-' + matchShort[1]).toLowerCase();

  return null;
}

// 1. モデル名の自動検出
let detectedModel = null;

// (A) 入力データ内の探索
detectedModel = extractModelName(item.model) 
             || extractModelName(item.modelName)
             || extractModelName(item.response?.model)
             || extractModelName(item.usageMetadata?.model)
             || extractModelName(item.metadata?.model);

// (B) 直前ノード走査
if (!detectedModel && typeof $prevNode !== 'undefined' && $prevNode?.name) {
  try {
    const pn = $node[$prevNode.name];
    if (pn) {
      detectedModel = extractModelName(pn.parameter) || extractModelName(pn);
    }
  } catch(e) {}
}

// (C) 対象ノード走査
if (!detectedModel) {
  const candidateNodeNames = [
    'writer',
    'Writer',
    'writer_pro',
    'Google Gemini',
    'Google Gemini Chat Model',
    'Chat Model'
  ];

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

// (D) デフォルト
if (!detectedModel) {
  detectedModel = 'gemini-3.6-flash';
}

// 2. バージョン & Pro判定（Proなら高単価テーブルを適用）
const versionMatch = detectedModel.match(/3\.[0-8]/);
const detectedVersion = versionMatch ? versionMatch[0] : '3.6';
const isPro = detectedModel.toLowerCase().includes('pro');

// 料金テーブル（USD / 100万トークン）
const PRICING_TABLE = {
  flash: { input: 0.10, output: 0.40 },
  pro:   { input: 1.25, output: 5.00 }
};
const currentPricing = isPro ? PRICING_TABLE.pro : PRICING_TABLE.flash;
const USD_JPY_RATE = 155; // 1ドル = 155円換算

// 3. トークン数の検出
let tokenUsage = item.tokenUsageEstimate || item.response?.tokenUsageEstimate || item.usageMetadata || {};

const prevNodes = ['writer', 'Writer', 'writer_pro', 'Google Gemini'];
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

// 4. トークン未取得時の推計（ライター入力用: 全リサーチ＋まとめ記事含むため約12,000 tok）
const rawOutputText = item.output || item.content?.parts?.[0]?.text || item.text || '';
if (!completionTokens && rawOutputText) {
  completionTokens = Math.round(rawOutputText.length * 0.95);
}
if (!promptTokens) {
  promptTokens = 12000;
}
const totalTokens = promptTokens + completionTokens;

// 5. コスト計算
const costUsd = (promptTokens * currentPricing.input / 1000000) + (completionTokens * currentPricing.output / 1000000);
const costJpy = costUsd * USD_JPY_RATE;

const costJpyFormatted = `${costJpy.toFixed(2)}円`;
const costUsdFormatted = `$${costUsd.toFixed(5)}`;
const tierLabel = isPro ? `Pro (v${detectedVersion})` : `Flash (v${detectedVersion})`;

const costSummary = `💰 執筆(ライター)コスト: ${costJpyFormatted} (${costUsdFormatted}) [${detectedModel} | 入力: ${promptTokens.toLocaleString()} tok / 出力: ${completionTokens.toLocaleString()} tok]`;

// 6. 返却（後続の整形2や即時保存ノードへそのまま渡せるよう元のitemをマージ）
return [{
  json: {
    "_COST_SUMMARY": costSummary,
    cost_report: {
      step: 'writer',
      detected_model: detectedModel,
      model_version: detectedVersion,
      pricing_tier: tierLabel,
      cost_jpy: costJpyFormatted,
      cost_usd: costUsdFormatted,
      total_tokens: totalTokens,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens
    },
    ...item
  }
}];

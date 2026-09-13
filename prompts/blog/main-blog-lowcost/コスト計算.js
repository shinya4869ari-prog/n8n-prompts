// === Gemini コスト自動計算コード（Flash 3.0〜3.8 高精度自動検出版） ===
const item = $input.first()?.json || {};

// --- 補助関数: あらゆるオブジェクト・文字列からGeminiモデル名を抽出 ---
function extractModelName(source) {
  if (!source) return null;
  const str = typeof source === 'string' ? source : JSON.stringify(source);

  // 1. gemini-3.x-flash / gemini-3.x-pro (3.0 〜 3.8 を厳密判定)
  const matchFlashPro = str.match(/gemini-(3\.[0-8])-(flash|pro)(?:-[a-z0-9]+)?/i);
  if (matchFlashPro) return matchFlashPro[0].toLowerCase();

  // 2. models/gemini-...
  const matchModels = str.match(/models\/(gemini-[a-zA-Z0-9\.\-]+)/i);
  if (matchModels) return matchModels[1].toLowerCase();

  // 3. 3.x-flash 等の省略形
  const matchShort = str.match(/(?:gemini-)?(3\.[0-8]-(?:flash|pro))/i);
  if (matchShort) return ('gemini-' + matchShort[1]).toLowerCase();

  return null;
}

// 1. モデル名の自動検出（直前ノード・パラメータ・入力JSONを網羅走査）
let detectedModel = null;

// (A) 入力データ内の探索
detectedModel = extractModelName(item.model) 
             || extractModelName(item.modelName)
             || extractModelName(item.response?.model)
             || extractModelName(item.usageMetadata?.model)
             || extractModelName(item.metadata?.model);

// (B) 直前ノード（$prevNode）のパラメータ走査
if (!detectedModel && typeof $prevNode !== 'undefined' && $prevNode?.name) {
  try {
    const pn = $node[$prevNode.name];
    if (pn) {
      detectedModel = extractModelName(pn.parameter) || extractModelName(pn);
    }
  } catch(e) {}
}

// (C) ワークフロー内主要ノードのパラメータ走査
if (!detectedModel) {
  const candidateNodeNames = [
    'Google Gemini',
    'Google Gemini1',
    'Google Gemini2',
    'gemini-3-flash',
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'Google Gemini Chat Model',
    'Gemini Chat Model',
    'Chat Model',
    'researcher2',
    'researcher1',
    'researcher25'
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

// (D) フォールバック（未検出の場合、勝手に別バージョンに決め打ちせず現在実行中の 3.6 を設定）
if (!detectedModel) {
  detectedModel = 'gemini-3.6-flash';
}

// 2. Flashバージョン（3.0〜3.8）またはPro判定
const versionMatch = detectedModel.match(/3\.[0-8]/);
const detectedVersion = versionMatch ? versionMatch[0] : '3.6';
const isPro = detectedModel.toLowerCase().includes('pro');

// 料金テーブル（USD / 100万トークン）
const PRICING_TABLE = {
  flash: { input: 0.10, output: 0.40 }, // 3.x Flash 系列
  pro:   { input: 1.25, output: 5.00 }  // 3.x Pro 系列
};
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

// 4. n8nがトークンを渡さなかった場合の文字数推計
const rawOutputText = item.output || item.content?.parts?.[0]?.text || item.text || '';
if (!completionTokens && rawOutputText) {
  completionTokens = Math.round(rawOutputText.length * 0.95);
}
if (!promptTokens) {
  promptTokens = 2450;
}
const totalTokens = promptTokens + completionTokens;

// 5. コスト計算
const costUsd = (promptTokens * currentPricing.input / 1000000) + (completionTokens * currentPricing.output / 1000000);
const costJpy = costUsd * USD_JPY_RATE;

const costJpyFormatted = `${costJpy.toFixed(2)}円`;
const costUsdFormatted = `$${costUsd.toFixed(5)}`;
const tierLabel = isPro ? `Pro (v${detectedVersion})` : `Flash (v${detectedVersion})`;

const costSummary = `💰 コスト: ${costJpyFormatted} (${costUsdFormatted}) [${detectedModel} | 入力: ${promptTokens.toLocaleString()} tok / 出力: ${completionTokens.toLocaleString()} tok]`;

// 6. 最上部にレポートを配置して返却
return [{
  json: {
    "_COST_SUMMARY": costSummary,
    cost_report: {
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

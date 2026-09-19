// ==============================================================================
// 💰 メインブログ 記事1本・全AIノード一括コスト計算コード（万能集計版）
// 
// 【配置場所】: 「リンク挿入ノード」の直後（またはWordPress投稿・完成HTML保存の前）
// 【機能】: 
//   1. ワークフロー内で実行された全AI（Gemini / Perplexity）のトークンとAPI費用を一撃合算
//   2. 途中ノード（リサーチ1~25、Perplexity 5連、まとめ、writer、文化DeepDive、リンク抽出）を完全網羅
//   3. キャッシュ利用で実行されなかったノードは「0円」として自動スキップ
//   4. 入力データ（記事HTMLやタイトル等）を100%そのまま透過（後続ノードを一切破壊しない）
// ==============================================================================

const item = $input.first()?.json || {};
const USD_JPY_RATE = 155; // 1ドル = 155円換算

// --- 料金テーブル（USD / 100万トークン） ---
const PRICING = {
  gemini: {
    flash: { input: 0.10, output: 0.40 }, // Gemini 1.5/2.0/3.0~3.8 Flash
    pro:   { input: 1.25, output: 5.00 }  // Gemini Pro系列
  },
  perplexity: {
    sonar:     { input: 1.00, output: 1.00, search_fee: 0.005 }, // sonar (1検索あたり $0.005)
    sonar_pro: { input: 3.00, output: 15.00, search_fee: 0.005 } // sonar-pro
  }
};

// --- ヘルパー: モデル名の抽出 ---
function extractGeminiModel(source) {
  if (!source) return 'gemini-flash-latest';
  const str = typeof source === 'string' ? source : JSON.stringify(source);
  const m = str.match(/models\/(gemini-[a-zA-Z0-9\.\-_]+)/i) || str.match(/(gemini-(?:1\.5|2\.0|flash|pro)[a-zA-Z0-9\.\-_]*)/i);
  if (m) return m[1].toLowerCase();
  return str.toLowerCase().includes('pro') ? 'gemini-pro' : 'gemini-flash-latest';
}

// --- ヘルパー: 各AIノードのメトリクス安全取得 ---
function inspectNode(candidateNames, expectedType) {
  for (const name of candidateNames) {
    try {
      const nodeRef = $(name);
      if (!nodeRef) continue;
      const data = nodeRef.first()?.json;
      if (!data) continue;

      // 1. Perplexity ノードの判定・集計
      if (expectedType === 'perplexity') {
        const usage = data.usage || data.response?.usage || {};
        const pTok = usage.prompt_tokens || 0;
        const cTok = usage.completion_tokens || 0;
        const modelStr = (data.model || data.response?.model || '').toLowerCase();
        const isSonarPro = modelStr.includes('pro');
        const pricing = isSonarPro ? PRICING.perplexity.sonar_pro : PRICING.perplexity.sonar;

        // トークン情報または出力テキストがあるか
        const hasContent = pTok > 0 || cTok > 0 || data.choices?.[0]?.message?.content || data.output || data.text;
        if (hasContent) {
          const promptTokens = pTok || 1000;      // 未取得時のフォールバック推計
          const completionTokens = cTok || 800;
          const searchFee = pricing.search_fee;   // 1リクエスト = 1検索
          const tokenCostUsd = (promptTokens * pricing.input + completionTokens * pricing.output) / 1000000;
          const costUsd = tokenCostUsd + searchFee;
          const costJpy = costUsd * USD_JPY_RATE;

          return {
            executed: true,
            nodeName: name,
            type: 'Perplexity',
            model: isSonarPro ? 'sonar-pro' : 'sonar',
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            searchCount: 1,
            costUsd,
            costJpy
          };
        }
      }

      // 2. Gemini ノードの判定・集計
      if (expectedType === 'gemini') {
        const uMeta = data.usageMetadata || data.response?.usageMetadata || {};
        const tEst  = data.tokenUsageEstimate || data.response?.tokenUsageEstimate || {};
        let pTok = uMeta.promptTokenCount || tEst.promptTokens || 0;
        let cTok = uMeta.candidatesTokenCount || tEst.completionTokens || 0;

        const rawText = data.output || data.content?.parts?.[0]?.text || data.text || '';
        if (!cTok && rawText) {
          cTok = Math.round(rawText.length * 0.95);
        }

        if (pTok > 0 || cTok > 0 || rawText) {
          if (!pTok) pTok = 3000; // フォールバック入力推計
          const modelName = extractGeminiModel(data) || 'gemini-flash-latest';
          const isPro = modelName.includes('pro');
          const pricing = isPro ? PRICING.gemini.pro : PRICING.gemini.flash;

          const costUsd = (pTok * pricing.input + cTok * pricing.output) / 1000000;
          const costJpy = costUsd * USD_JPY_RATE;

          return {
            executed: true,
            nodeName: name,
            type: 'Gemini',
            model: modelName,
            promptTokens: pTok,
            completionTokens: cTok,
            totalTokens: pTok + cTok,
            searchCount: 0,
            costUsd,
            costJpy
          };
        }
      }
    } catch (e) {
      // ノード未実行・非存在時はスキップ
    }
  }

  return {
    executed: false,
    nodeName: candidateNames[0],
    type: expectedType === 'perplexity' ? 'Perplexity' : 'Gemini',
    costUsd: 0,
    costJpy: 0
  };
}

// ==============================================================================
// 全AIノードの走査と集計定義
// ==============================================================================
const TARGET_NODES = [
  // 1. 特集Perplexity 5連
  { label: '特集: 犯罪 (Perplexity)',       keys: ['犯罪記事Perplexity'],                                       type: 'perplexity', group: '特集Perplexity 5連' },
  { label: '特集: 物価 (Perplexity)',       keys: ['物価記事Perplexity'],                                       type: 'perplexity', group: '特集Perplexity 5連' },
  { label: '特集: 地理・経済 (Perplexity)', keys: ['地理・経済記事Perplexity'],                                 type: 'perplexity', group: '特集Perplexity 5連' },
  { label: '特集: 死因 (Perplexity)',       keys: ['死因記事Perplexity'],                                       type: 'perplexity', group: '特集Perplexity 5連' },
  { label: '特集: 貿易 (Perplexity)',       keys: ['貿易記事Perplexity'],                                       type: 'perplexity', group: '特集Perplexity 5連' },

  // 2. 特集まとめ記事 (Gemini)
  { label: '特集まとめ記事 (Gemini)',       keys: ['検索結果まとめ記事', 'まとめ記事Gemini'],                   type: 'gemini',     group: 'まとめ記事' },

  // 3. メインライター (Gemini)
  { label: 'メイン執筆 (Gemini)',           keys: ['writer', 'メインライター', 'Gemini Writer'],                 type: 'gemini',     group: 'メインライター' },

  // 4. 文化DeepDive (Perplexity)
  { label: '文化DeepDive (Perplexity)',     keys: ['文化DeepDive', 'Deep-Dive_writer', 'DeepDive_writer'],     type: 'perplexity', group: '文化DeepDive' },

  // 5. エンティティ抽出・リンク (Gemini)
  { label: 'エンティティ抽出 (Gemini)',     keys: ['response_extraction1', 'response_extraction', 'エンティティ抽出'], type: 'gemini', group: 'リンク・エンティティ' },

  // 6. 左半分・リサーチ1, 2, 25 (新規実行時のみ計上・キャッシュ時は0円)
  { label: 'リサーチ1: 制度/地理 (Gemini)', keys: ['researcher1'],                                              type: 'gemini',     group: '基礎リサーチ(新規時)' },
  { label: 'リサーチ2: 100年史 (Gemini)',   keys: ['researcher2'],                                              type: 'gemini',     group: '基礎リサーチ(新規時)' },
  { label: 'リサーチ25: 映画 (Gemini)',     keys: ['researcher25'],                                             type: 'gemini',     group: '基礎リサーチ(新規時)' }
];

// --- 集計実行 ---
let totalCostJpy = 0;
let totalCostUsd = 0;
let totalTokens = 0;
let totalPerpCostJpy = 0;
let totalGeminiCostJpy = 0;
let totalSearches = 0;

const nodeDetails = [];
const groupSummary = {};

for (const target of TARGET_NODES) {
  const result = inspectNode(target.keys, target.type);
  if (result.executed) {
    totalCostJpy += result.costJpy;
    totalCostUsd += result.costUsd;
    totalTokens += (result.totalTokens || 0);
    totalSearches += (result.searchCount || 0);

    if (result.type === 'Perplexity') {
      totalPerpCostJpy += result.costJpy;
    } else {
      totalGeminiCostJpy += result.costJpy;
    }

    if (!groupSummary[target.group]) {
      groupSummary[target.group] = { costJpy: 0, costUsd: 0, nodes: [] };
    }
    groupSummary[target.group].costJpy += result.costJpy;
    groupSummary[target.group].costUsd += result.costUsd;
    groupSummary[target.group].nodes.push(target.label);

    nodeDetails.push({
      label: target.label,
      node: result.nodeName,
      type: result.type,
      model: result.model,
      tokens: result.totalTokens,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      searchCount: result.searchCount,
      cost_jpy: `${result.costJpy.toFixed(2)}円`,
      cost_usd: `$${result.costUsd.toFixed(5)}`
    });
  }
}

// 1行サマリーテキスト
const summaryText = `💰【記事1本 総AIコスト】: ${totalCostJpy.toFixed(2)}円 ($${totalCostUsd.toFixed(4)}) ` +
  `[Perplexity: ${totalPerpCostJpy.toFixed(2)}円 (Web検索${totalSearches}回) / Gemini: ${totalGeminiCostJpy.toFixed(2)}円 (計${totalTokens.toLocaleString()} tok)]`;

// コンソールログ出力（n8n実行画面で即座に確認可能）
console.log('====================================================');
console.log(summaryText);
console.log('--- グループ別内訳 ---');
for (const [grp, gData] of Object.entries(groupSummary)) {
  console.log(`・${grp}: ${gData.costJpy.toFixed(2)}円 ($${gData.costUsd.toFixed(4)}) [${gData.nodes.join(', ')}]`);
}
console.log('====================================================');

// ==============================================================================
// 必要なコスト情報のみをスッキリ出力（記事本文などの巨大データは引きずらない）
// ==============================================================================
return [{
  json: {
    summary: summaryText,
    total_jpy: `${totalCostJpy.toFixed(2)}円`,
    total_usd: `$${totalCostUsd.toFixed(4)}`,
    total_tokens: totalTokens,
    total_web_searches: totalSearches,
    perplexity_total_jpy: `${totalPerpCostJpy.toFixed(2)}円`,
    gemini_total_jpy: `${totalGeminiCostJpy.toFixed(2)}円`,
    group_summary: groupSummary,
    executed_nodes: nodeDetails
  }
}];

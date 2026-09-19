// ==============================================================================
// 💰 メインブログ 記事1本・全AIノード一括コスト計算コード（超見やすい決定版）
// 
// 【配置場所】: 「リンク挿入ノード」の直後（またはWordPress投稿・完成HTML保存の前）
// 【機能】: 
//   1. ワークフロー内で実行された全AI（Perplexity 5連＋文化DeepDive / Gemini Flash各所）を一撃集計
//   2. Perplexityの出力形式（message, citations, id）を確実に検知して正確に金額計上
//   3. キャッシュ利用で未実行のノードは「0円（キャッシュ）」として明記
//   4. 余計な記事本文データは一切含めず、各ノードの金額が縦一列で一目で分かる超明快アウトプット
// ==============================================================================

const USD_JPY_RATE = 155; // 1ドル = 155円換算

// --- 料金テーブル（USD / 100万トークン） ---
const PRICING = {
  gemini: {
    flash: { input: 0.10, output: 0.40 }, // Gemini Flash
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

        // Perplexityの多様なレスポンス構造（message, citations, id, output, text, choices等）
        const rawMessage = data.message || data.output || data.text || data.choices?.[0]?.message?.content || (typeof data === 'string' ? data : '');
        const hasPerpId = Boolean(data.id && (data.citations || data.created));
        const hasContent = pTok > 0 || cTok > 0 || Boolean(rawMessage) || hasPerpId || Array.isArray(data.citations);

        if (hasContent) {
          const completionTokens = cTok || (rawMessage ? Math.round(rawMessage.length * 0.9) : 800);
          const promptTokens = pTok || 1200;      // リサーチ用入力推計
          const searchFee = pricing.search_fee;   // 1リクエスト = 1検索 ($0.005 = 約0.78円)
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
// 全AIノードの走査と集計定義（全12ノード完全網羅）
// ==============================================================================
const TARGET_NODES = [
  // 1. 特集Perplexity 5連
  { label: '① 特集: 犯罪 (Perplexity)',       keys: ['犯罪記事Perplexity', '犯罪記事 Perplexity', '犯罪Perplexity'],                                       type: 'perplexity', group: 'Perplexity 5連' },
  { label: '② 特集: 物価 (Perplexity)',       keys: ['物価記事Perplexity', '物価記事 Perplexity', '物価Perplexity'],                                       type: 'perplexity', group: 'Perplexity 5連' },
  { label: '③ 特集: 地理・経済 (Perplexity)', keys: ['地理・経済記事Perplexity', '地理・経済記事 Perplexity', '地理経済記事Perplexity', '地理経済Perplexity'], type: 'perplexity', group: 'Perplexity 5連' },
  { label: '④ 特集: 死因 (Perplexity)',       keys: ['死因記事Perplexity', '死因記事 Perplexity', '死因Perplexity'],                                       type: 'perplexity', group: 'Perplexity 5連' },
  { label: '⑤ 特集: 貿易 (Perplexity)',       keys: ['貿易記事Perplexity', '貿易記事 Perplexity', '貿易Perplexity'],                                       type: 'perplexity', group: 'Perplexity 5連' },

  // 2. 文化DeepDive (Perplexity)
  { label: '⑥ 文化DeepDive (Perplexity)',     keys: ['文化DeepDive', '文化DeepDive (Perplexity)', 'Deep-Dive_writer', 'DeepDive_writer', '文化DeepDivePerplexity'], type: 'perplexity', group: '文化DeepDive' },

  // 3. 特集まとめ記事 (Gemini)
  { label: '⑦ 特集まとめ記事 (Gemini)',       keys: ['検索結果まとめ記事', 'まとめ記事Gemini', 'まとめ記事'],                   type: 'gemini',     group: 'まとめ記事' },

  // 4. メインライター (Gemini)
  { label: '⑧ メイン執筆 (Gemini)',           keys: ['writer', 'メインライター', 'Gemini Writer'],                 type: 'gemini',     group: 'メインライター' },

  // 5. エンティティ抽出・リンク (Gemini)
  { label: '⑨ リンク・エンティティ抽出 (Gemini)', keys: ['response_extraction1', 'response_extraction', 'エンティティ抽出'], type: 'gemini', group: 'リンク・抽出' },

  // 6. 左半分・リサーチ1, 2, 25 (新規実行時のみ計上・キャッシュ時は0円)
  { label: '⑩ リサーチ1: 制度/地理 (Gemini)', keys: ['researcher1'],                                              type: 'gemini',     group: '基礎リサーチ' },
  { label: '⑪ リサーチ2: 100年史 (Gemini)',   keys: ['researcher2'],                                              type: 'gemini',     group: '基礎リサーチ' },
  { label: '⑫ リサーチ25: 映画 (Gemini)',     keys: ['researcher25'],                                             type: 'gemini',     group: '基礎リサーチ' }
];

// --- 集計実行 ---
let totalCostJpy = 0;
let totalCostUsd = 0;
let totalTokens = 0;
let totalPerpCostJpy = 0;
let totalGeminiCostJpy = 0;
let totalSearches = 0;

const nodeDetails = [];
const flatNodeList = {};

for (const target of TARGET_NODES) {
  const result = inspectNode(target.keys, target.type);
  if (result.executed) {
    totalCostJpy += result.costJpy;
    totalCostUsd += result.costUsd;
    totalTokens += (result.totalTokens || 0);
    totalSearches += (result.searchCount || 0);

    if (result.type === 'Perplexity') {
      totalPerpCostJpy += result.costJpy;
      flatNodeList[target.label] = `${result.costJpy.toFixed(2)} 円 (${result.model} / 1検索)`;
    } else {
      totalGeminiCostJpy += result.costJpy;
      flatNodeList[target.label] = `${result.costJpy.toFixed(2)} 円 (${result.model} / ${result.totalTokens.toLocaleString()} tok)`;
    }

    nodeDetails.push({
      label: target.label,
      node: result.nodeName,
      type: result.type,
      model: result.model,
      tokens: result.totalTokens,
      searchCount: result.searchCount,
      cost_jpy: `${result.costJpy.toFixed(2)}円`,
      cost_usd: `$${result.costUsd.toFixed(5)}`
    });
  } else {
    flatNodeList[target.label] = '0 円 (キャッシュ・未実行)';
  }
}

// 1行サマリーテキスト
const summaryText = `💰【記事1本 総AIコスト】: ${totalCostJpy.toFixed(2)}円 ($${totalCostUsd.toFixed(4)}) ` +
  `[Perplexity: ${totalPerpCostJpy.toFixed(2)}円 (Web検索${totalSearches}回) / Gemini: ${totalGeminiCostJpy.toFixed(2)}円 (計${totalTokens.toLocaleString()} tok)]`;

console.log('====================================================');
console.log(summaryText);
console.log('====================================================');

// ==============================================================================
// 🎯 各ノードが何円か一目で分かる超明快な出力フォーマット
// ==============================================================================
return [{
  json: {
    "💰【合計AIコスト】": `${totalCostJpy.toFixed(2)} 円 ($${totalCostUsd.toFixed(4)})`,
    "────────── 種類別内訳 ──────────": "───────────────────────────────",
    "🔍 Perplexity合計": `${totalPerpCostJpy.toFixed(2)} 円 (Web検索 ${totalSearches}回)`,
    "⚡ Gemini合計": `${totalGeminiCostJpy.toFixed(2)} 円 (計 ${totalTokens.toLocaleString()} tokens)`,
    "─────── 各ノードの費用一覧 ───────": "───────────────────────────────",
    ...flatNodeList,
    "───────────────────────────────": "───────────────────────────────",
    "詳細データ": nodeDetails
  }
}];

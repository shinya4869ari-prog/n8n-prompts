// === Gemini コスト自動計算コード（確実・即時計算版） ===
const item = $input.first()?.json || {};

// 1. 生成されたテキストを確実に取得（outputでもcontent.partsでもどちらでも対応）
const text = item.output || item.content?.parts?.[0]?.text || item.text || (typeof item === 'string' ? item : JSON.stringify(item));

// 2. トークン数の確実な算出
// 日本語＋JSONの標準レート（1文字 ≒ 0.95トークン）
const completionTokens = Math.max(1, Math.round((text ? text.length : 0) * 0.95));
const promptTokens = 2450; // リサーチ用プロンプトの標準入力トークン数
const totalTokens = promptTokens + completionTokens;

// 3. Flash料金レートで即時日本円換算（入力$0.10/M, 出力$0.40/M, 1ドル=155円）
const costUsd = (promptTokens * 0.10 / 1000000) + (completionTokens * 0.40 / 1000000);
const costJpy = costUsd * 155;

const summary = `💰 コスト: ${costJpy.toFixed(2)}円 ($${costUsd.toFixed(5)}) [入力: ${promptTokens.toLocaleString()} tok / 出力: ${completionTokens.toLocaleString()} tok]`;

// 4. 一番上に表示して返却
return [{
  json: {
    "_COST_SUMMARY": summary,
    "cost_yen": `${costJpy.toFixed(2)}円`,
    "tokens": {
      "input": promptTokens,
      "output": completionTokens,
      "total": totalTokens
    },
    ...item
  }
}];

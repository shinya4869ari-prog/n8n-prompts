const input = $input.first().json;

const priceTable = {
  "gemini-3.5-flash": { input: 1.50, output: 9.00 },
  "gemini-2.5-flash": { input: 0.30, output: 2.50 },
  "gemini-3-flash-preview": { input: 0.50, output: 3.00 },
  "gemini-3.1-pro": { input: 2.00, output: 12.00 },
  "ollama": { input: 0, output: 0 }
};

const USD_TO_JPY = 160;

const modelName = (input.modelName || "unknown").toLowerCase()
  .replace('models/', '');
const price = priceTable[modelName] || { input: 0, output: 0 };

const usage = input.tokenUsage || {};
const promptTokens = Number(usage.promptTokens || input.promptTokens || $input.first().metadata?.tokenUsage?.promptTokens || 0);
const completionTokens = Number(usage.completionTokens || input.completionTokens || $input.first().metadata?.tokenUsage?.completionTokens || 0);
const totalTokens = Number(usage.totalTokens || input.totalTokens || $input.first().metadata?.tokenUsage?.totalTokens || (promptTokens + completionTokens));

const costUSD = (promptTokens / 1000000) * price.input + (completionTokens / 1000000) * price.output;
const costJPY = costUSD * USD_TO_JPY;

const now = new Date();
const datetimeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

return [{
  json: {
    "実行日時": datetimeStr,
    "ワークフロー名": input.workflowName || "",
    "ノード名": input.nodeName || "",
    "対象国": input.country || "",
    "モデル名": modelName,
    "入力トークン": promptTokens,
    "出力トークン": completionTokens,
    "合計トークン": totalTokens,
    "コスト_USD": Number(costUSD.toFixed(6)),
    "コスト_JPY": Number(costJPY.toFixed(2))
  }
}];
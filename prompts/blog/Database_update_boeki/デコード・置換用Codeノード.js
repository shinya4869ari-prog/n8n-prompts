// 1. GitHubノードから返されたデータ（バイナリまたはBase64）を取得してデコード
let rawPrompt = "";
const binaryKeys = Object.keys($input.first().binary || {});
if (binaryKeys.length > 0) {
  // バイナリ出力（As Binary Property: ON）の場合
  const binaryPropName = binaryKeys[0]; // 通常は "data"
  rawPrompt = await this.helpers.getBinaryDataBuffer(0, binaryPropName).then(buf => buf.toString('utf-8'));
} else {
  // Base64テキスト出力（As Binary Property: OFF）の場合
  const base64Content = $input.first().json.content || "";
  rawPrompt = Buffer.from(base64Content, 'base64').toString('utf-8');
}

// 2. 変数置換用のコンテキストを用意
// ※紐付けエラーを防ぐため、$runIndex を使って安全に対象アイテムを取得します
const runIndex = $runIndex;
const base = $('Loop Over Items').all()[runIndex].json; 
const now = new Date();
const context = {
  ...base,
  now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
  now_year: String(now.getFullYear())
};

// 3. テンプレート置換ロジック
const evaluateTemplate = (text, data) => {
  if (!text) return "";
  return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
    if (expression.includes('$now.toFormat')) return context.now_date;
    const parts = expression.split('||').map(p => p.trim());
    for (const part of parts) {
      if (part.startsWith('$json.')) {
        const path = part.replace('$json.', '');
        const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, data);
        if (value !== undefined && value !== null && value !== '') return String(value);
      } else if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
        return part.slice(1, -1);
      }
    }
    return match;
  });
};

// 4. デコードしたプロンプトの変数を置換して出力
const finalPrompt = evaluateTemplate(rawPrompt, context);

return [{
  json: {
    tradePrompt: finalPrompt,
    ...context
  }
}];

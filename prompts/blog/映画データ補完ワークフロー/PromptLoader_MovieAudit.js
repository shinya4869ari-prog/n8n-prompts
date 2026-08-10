/**
 * 映画データ補完ワークフロー用 GitHub プロンプト自動同期 Code ノード
 * 役割: GitHub上の最新 gemini_prompt.md を即時取得し、テンプレート変数を置換してAIノードへ渡す
 */
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E6%98%A0%E7%94%BB%E3%83%87%E3%83%BC%E3%82%BF%E8%A3%9C%E5%AE%8C%E3%83%AF%E3%83%BC%E3%82%AF%E3%83%95%E3%83%AD%E3%83%BC/';

const files = {
  geminiPrompt: baseUrl + 'gemini_prompt.md'
};

try {
  // GitHubから最新プロンプトを一括ダウンロード
  const keys = Object.keys(files);
  const responses = await Promise.all(
    keys.map(key => this.helpers.httpRequest({ method: 'GET', url: files[key] }))
  );
  
  const rawData = {};
  keys.forEach((key, index) => { rawData[key] = responses[index]; });

  const base = $input.first().json;
  const now = new Date();
  const context = {
    ...base,
    now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
    now_year: String(now.getFullYear())
  };

  // {{ $json.countryJa }} 等の変数を動的置換するテンプレート関数
  const evaluateTemplate = (text, data) => {
    if (!text) return "";
    return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
      if (expression.includes('$now.toFormat')) return context.now_date;
      const parts = expression.split('||').map(p => p.trim());
      for (const part of parts) {
        if (part.startsWith('$json.')) {
          const path = part.replace('$json.', '');
          const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, data);
          if (value !== undefined && value !== null && value !== '') return typeof value === 'object' ? JSON.stringify(value) : String(value);
        } else if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
          return part.slice(1, -1);
        }
      }
      return match;
    });
  };

  const results = {};
  Object.keys(rawData).forEach(key => {
    results[key] = evaluateTemplate(rawData[key], context);
  });

  return [{
    json: {
      ...results,
      ...context
    }
  }];
} catch (error) {
  console.error("PromptLoader Error:", error);
  return [{ json: { error: error.message, ...$input.first().json } }];
}

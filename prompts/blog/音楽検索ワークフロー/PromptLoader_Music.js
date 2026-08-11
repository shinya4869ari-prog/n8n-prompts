/**
 * 音楽検索ワークフロー用 GitHub プロンプト自動同期 Code ノード
 * 役割: GitHub上の最新 Music_AI_Screener.md を即時取得し、テンプレート変数（{{ $json.countryJa }}等）を置換してAIノードへ渡す
 */
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E9%9F%B3%E6%A5%BD%E6%A4%9C%E7%B4%A2%E3%83%AF%E3%83%BC%E3%82%AF%E3%83%95%E3%83%AD%E3%83%BC/';

const files = {
  musicScreenerPrompt: baseUrl + 'Music_AI_Screener.md'
};

try {
  // GitHubから最新プロンプトを一括ダウンロード
  const keys = Object.keys(files);
  const responses = await Promise.all(
    keys.map(key => this.helpers.httpRequest({ method: 'GET', url: files[key] }))
  );
  
  const rawData = {};
  keys.forEach((key, index) => { rawData[key] = responses[index]; });

  const items = $input.all();
  const now = new Date();

  // {{ $json.countryJa }} 等の変数を動的置換するテンプレート関数
  const evaluateTemplate = (text, data, context) => {
    if (!text) return "";
    return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
      if (expression.includes('$now.toFormat')) return context.now_date;
      if (expression.includes('JSON.stringify($json.tracks)')) {
        return JSON.stringify(data.tracks || []);
      }
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

  return items.map(item => {
    const base = item.json;
    const context = {
      ...base,
      now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
      now_year: String(now.getFullYear())
    };

    const results = {};
    Object.keys(rawData).forEach(key => {
      results[key] = evaluateTemplate(rawData[key], base, context);
    });

    return {
      json: {
        ...results,
        ...context
      }
    };
  });
} catch (error) {
  throw new Error(`音楽AIプロンプトGitHub同期失敗: ${error.message}`);
}

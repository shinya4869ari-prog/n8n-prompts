// クオリティチェック用プロンプト組み立てノード
// リンク挿入ノードの直後、AI Agentの直前に配置する

const article    = $input.first().json.article    ?? '';
const country    = $input.first().json.country    ?? '';
const countryEn  = $input.first().json.countryEn  ?? '';
const capital    = $input.first().json.capital     ?? '';

// PromptLoaderが読み込んだクオリティチェックプロンプトのテンプレートを取得
let template = '';
try {
  template = $('PromptLoader').first().json.qualityCheck ?? '';
} catch(e) {}

// 今日の日付（日本語）
const now = new Date();
const today = `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日`;

// テンプレート内のプレースホルダーを実際の値に置換
const prompt = template
  .replace(/\{\{\s*\$json\.article\s*\}\}/g,                                 article)
  .replace(/\{\{\s*\$json\.country\s*\}\}/g,                                 country)
  .replace(/\{\{\s*\$json\.countryEn\s*\}\}/g,                               countryEn)
  .replace(/\{\{\s*\$now\.toFormat\s*\([^)]+\)\s*\}\}/g,                     today);

return [{
  json: {
    prompt,
    article,
    country,
    countryEn,
    capital,
  }
}];

// クオリティチェック用プロンプト組み立てノード
// リンク挿入ノードの直後、AI Agentの直前に配置する
//
// AI Agent設定：
//   System Message: （空にする）
//   User Message:   {{ $json.prompt }}

const articleRaw = $input.first().json.article    ?? '';
const country    = $input.first().json.country    ?? '';
const countryEn  = $input.first().json.countryEn  ?? '';
const capital    = $input.first().json.capital     ?? '';

// HTMLタグを除去してプレーンテキスト化（12,000文字に制限）
const articleText = articleRaw
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/\s{2,}/g, ' ')
  .trim()
  .substring(0, 12000);

// PromptLoaderからクオリティチェックのテンプレートを取得
let template = '';
try {
  template = $('PromptLoader').first().json.qualityCheck ?? '';
} catch(e) {}

// 今日の日付（日本語）
const now = new Date();
const today = `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日`;

// テンプレート内のプレースホルダーを置換
const filledTemplate = template
  .replace(/\{\{\s*\$json\.country\s*\}\}/g, country)
  .replace(/\{\{\s*\$json\.countryEn\s*\}\}/g, countryEn)
  .replace(/\{\{\s*\$now\.toFormat\s*\([^)]+\)\s*\}\}/g, today);

// 最終プロンプト（指示文 + 記事本文）
const prompt = filledTemplate
  + '\n\n---\n## 検証対象の記事本文（HTMLタグ除去済み）\n\n'
  + articleText;

return [{
  json: {
    prompt,
    article: articleRaw,
    country,
    countryEn,
    capital,
  }
}];

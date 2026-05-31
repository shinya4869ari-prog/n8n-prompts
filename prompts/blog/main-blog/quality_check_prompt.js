// クオリティチェック用プロンプト組み立てノード
// リンク挿入ノードの直後、AI Agentの直前に配置する

const articleRaw = $input.first().json.article    ?? '';
const country    = $input.first().json.country    ?? '';
const countryEn  = $input.first().json.countryEn  ?? '';
const capital    = $input.first().json.capital     ?? '';

// HTMLタグを除去してプレーンテキスト化（トークン節約）
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
  .substring(0, 8000); // 8,000文字に制限（これ以上増やすとAIが応答を拒否する）

// PromptLoaderが読み込んだクオリティチェックプロンプトのテンプレートを取得
let template = '';
let debug = 'OK';
try {
  let loaderNode = null;
  try {
    loaderNode = $('PromptLoader').first().json;
    debug = 'Loaded from PromptLoader';
  } catch (e1) {
    try {
      loaderNode = $('PromptLoader_jp').first().json;
      debug = 'Loaded from PromptLoader_jp';
    } catch (e2) {
      debug = `Error: Could not find PromptLoader or PromptLoader_jp. (PromptLoader: ${e1.message}, PromptLoader_jp: ${e2.message})`;
    }
  }

  if (loaderNode) {
    template = loaderNode.qualityCheck ?? '';
    if (!template) {
      debug += ' (qualityCheck field is empty)';
    }
  }
} catch(e) {
  debug = `Unexpected error: ${e.message}`;
}

// 今日の日付（日本語）
const now = new Date();
const today = `${now.getFullYear()}年${String(now.getMonth()+1).padStart(2,'0')}月${String(now.getDate()).padStart(2,'0')}日`;

// テンプレート内のプレースホルダーを実際の値に置換
const prompt = template
  .replace(/\{\{\s*\$json\.article\s*\}\}/g, articleText)
  .replace(/\{\{\s*\$json\.country\s*\}\}/g, country)
  .replace(/\{\{\s*\$json\.countryEn\s*\}\}/g, countryEn)
  .replace(/\{\{\s*\$now\.toFormat\s*\([^)]+\)\s*\}\}/g, today);

// 最終プロンプト（テンプレートに記事本文抜粋の注記を付加）
const excerptNote = `\n\n---\n⚠️ 注意：以下の記事本文はトークン節約のため先頭${articleText.length.toLocaleString()}文字の抜粋です。実際の記事はすべてのセクション（①〜⑨）が存在します。「記事が途中で切れている」という指摘は不要です。`;
const finalPrompt = prompt + excerptNote;

return [{
  json: {
    input: finalPrompt, // n8nのデフォルト入力キーに対応
    prompt: finalPrompt,
    article: articleRaw,
    country,
    countryEn,
    capital,
    debug,
    templateLength: template.length,
  }
}];

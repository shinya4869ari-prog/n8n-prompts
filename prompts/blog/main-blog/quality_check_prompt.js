// クオリティチェック用：HTMLタグ除去・文字数制限のみ
// AI Agent の System Message に {{ $('PromptLoader').first().json.qualityCheck }} を設定
// AI Agent の User Message に以下を設定：
//   対象国：{{ $json.country }}
//   現在日時：{{ $now.toFormat('yyyy年MM月dd日') }}
//
//   ## 検証対象の記事本文
//   {{ $json.articleText }}

const articleRaw = $input.first().json.article    ?? '';
const country    = $input.first().json.country    ?? '';
const countryEn  = $input.first().json.countryEn  ?? '';
const capital    = $input.first().json.capital     ?? '';

// HTMLタグを除去してプレーンテキスト化（8,000文字に制限）
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
  .substring(0, 8000);

return [{
  json: {
    articleText,
    article: articleRaw,
    country,
    countryEn,
    capital,
  }
}];

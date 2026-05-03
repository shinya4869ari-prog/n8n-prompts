return [{ json: {
  "国名（日本語）": $('国名変換Code').first().json.country,
  "首都（日本語）": $('国名変換Code').first().json.capital,
  "①経済": "○",
  "②治安": "○",
  "③物価": "○",
  "④貿易": "○",
  "最終取得日": $now.toFormat('yyyy-MM-dd'),
  "message": `✅ ${$('国名変換Code').first().json.country}のデータ取得が完了しました`
}}];
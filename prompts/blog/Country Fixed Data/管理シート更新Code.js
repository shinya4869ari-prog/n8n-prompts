const base = $('プロンプト取得用 Code').first().json.base;

return [{ json: {
  "国名（日本語）": base.country,
  "①経済": "○",
  "②治安": "○",
  "③物価": "○",
  "④貿易": "○",
  "最終取得日": $now.toFormat('yyyy-MM-dd'),
  "message": `✅ ${base.country}のデータ取得が完了しました`
}}];
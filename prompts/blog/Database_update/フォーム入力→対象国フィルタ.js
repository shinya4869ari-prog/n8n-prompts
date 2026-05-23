// ============================================================
// フォーム入力→対象国フィルタ
// 配置場所: n8n Form Trigger の直後
//
// 【動作】
//   ① フォームの "targetCountry" に国名（日本語）が入力されている場合
//      → その国のスプレッドシート行だけを後続ノードに渡す
//   ② 空欄の場合
//      → シート全件をそのまま後続ノードに渡す（項目検出・国別マージ で全国分を自動処理）
//
// 【n8n接続構成】
//   n8n Form Trigger
//     └─> このコードノード（フォーム入力→対象国フィルタ）
//           ├─ input 1: フォームトリガーの出力（フォームの入力値）
//           └─ input 2: 治安シート・物価シート などの読み込みノードの出力（全国分のデータ）
//     └─> 項目検出・国別マージ（既存ノード）
// ============================================================

// フォームの入力を取得（フィールド名: "targetCountry"）
const formData = $input.first().json;
const specifiedCountry = (formData?.targetCountry ?? formData?.country ?? "").trim();

// 全シートデータを取得（input 2 以降に治安/物価シートを接続する想定）
// ※ n8n の "Merge" ノードで治安・物価シートをマージしてからこのノードに渡す場合は
//   $input.all() でそのまま受け取れます
const allRows = $input.all().map(i => i.json).filter(row => row["国名（日本語）"]);

if (!specifiedCountry) {
  // ② 空欄の場合 → 全件をそのまま返す
  return allRows.map(row => ({ json: row }));
}

// ① 国名が指定されている場合 → 日本語国名で完全一致フィルタ
const matched = allRows.filter(row => row["国名（日本語）"] === specifiedCountry);

if (matched.length === 0) {
  throw new Error(
    `フォームで指定された国「${specifiedCountry}」がスプレッドシートに見つかりませんでした。\n` +
    `国名（日本語）を正確に入力してください。`
  );
}

return matched.map(row => ({ json: row }));

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

// 1. 指定された国名 (targetCountry) の取得
let specifiedCountry = "";

// (A) $input から探索
for (const item of $input.all()) {
  const d = item.json;
  const val = (d?.targetCountry ?? d?.country ?? d?.["国名（日本語）"] ?? "").trim();
  if (val && !d["殺人率_年"] && !d["為替レート"]) { // シートの行データ自体ではない場合
    specifiedCountry = val;
    break;
  }
}

// (B) トリガーノードから探索
if (!specifiedCountry) {
  const triggerNames = [
    'When Executed by Another Workflow',
    'Execute Workflow Trigger',
    'n8n Form Trigger',
    'When clicking ‘Test workflow’'
  ];
  for (const name of triggerNames) {
    try {
      const t = $(name).first()?.json;
      const val = (t?.targetCountry ?? t?.country ?? t?.["国名（日本語）"] ?? "").trim();
      if (val) {
        specifiedCountry = val;
        break;
      }
    } catch (e) {}
  }
}

// 2. 全シートデータの取得
let allRows = [];

// (A) $input.all() から取得
allRows = $input.all().map(i => i.json).filter(row => row && row["国名（日本語）"]);

// (B) $input にない場合はシートノードから直接取得
if (allRows.length === 0) {
  const sheetNodeNames = ['治安', '物価', 'Google Sheets 読み込み（治安）', 'Google Sheets 読み込み（物価）'];
  for (const sName of sheetNodeNames) {
    try {
      const sItems = $(sName).all();
      if (sItems && sItems.length > 0) {
        allRows.push(...sItems.map(i => i.json).filter(row => row && row["国名（日本語）"]));
      }
    } catch (e) {}
  }
}

if (allRows.length === 0) {
  throw new Error("シートデータが取得できませんでした。「治安」または「物価」シートノードが実行されているか確認してください。");
}

// 3. フィルタ処理
if (!specifiedCountry) {
  // 国名未指定の場合は全件処理
  return allRows.map(row => ({ json: row }));
}

// 国名完全一致フィルタ
const matched = allRows.filter(row => row["国名（日本語）"] === specifiedCountry);

if (matched.length === 0) {
  throw new Error(
    `指定された国「${specifiedCountry}」がスプレッドシートに見つかりませんでした。\n` +
    `シート上の国名と完全一致しているか確認してください。（取得できた国数: ${allRows.length}件）`
  );
}

return matched.map(row => ({ json: row }));

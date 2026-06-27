try {
  const base = $('country-master-lookup').all()[0]?.json || {};

  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return [{
    json: {
      "国名（日本語）": base.country || "",
      "①経済": "○",
      "②治安": "○",
      "③物価": "○",
      "④貿易": "○",
      "最終取得日": formattedDate,
      "message": `✅ ${base.country || '国名不明'}のデータ取得が完了しました`
    }
  }];
} catch (error) {
  throw new Error(`処理失敗: ${error.message}`);
}
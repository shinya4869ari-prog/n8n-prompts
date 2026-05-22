const agentOut = $input.first().json.output ?? "";
const runIndex = $runIndex;

let rowData;
try {
  const mergeData = $('項目検出・国別マージ').all()[runIndex].json;
  rowData = mergeData.rowData;
} catch (e) {
  throw new Error(`ノード参照エラー: 「項目検出・国別マージ」ノードからデータを取得できませんでした。n8n上のノード名が「項目検出・国別マージ」になっているか確認してください。エラー: ${e.message}`);
}

if (!rowData) {
  throw new Error(`データエラー: 「項目検出・国別マージ」の出力に rowData が存在しません。`);
}

// ツール未使用チェック
if (!agentOut || agentOut === "") {
  throw new Error(`ツール未使用エラー: ${rowData["国名（日本語）"]} - Agentが検索ツールを使用しませんでした`);
}

// Agent出力をパース
let agentOutput = {};
try {
  const cleaned = agentOut.replace(/```json|```/g, '').trim();
  const lines = cleaned.split('\n').filter(l => l.trim().startsWith('{'));
  for (const line of lines) {
    try {
      Object.assign(agentOutput, JSON.parse(line));
    } catch (e) { }
  }
  if (Object.keys(agentOutput).length === 0) {
    agentOutput = JSON.parse(cleaned);
  }
} catch (e) { }

// 変更箇所を記録
const changes = [];

const checkChange = (label, newVal, oldVal, newYear, oldYear, newSource, oldSource) => {
  if (newVal === undefined || newVal === "" || newVal === "欠測") return;

  const ny = newYear ? parseInt(String(newYear).replace(/[^0-9]/g, '')) : null;
  const ey = oldYear ? parseInt(String(oldYear).replace(/[^0-9]/g, '')) : null;
  const isOlder = ny && ey && ny < ey;
  const isSame = ny && ey && ny === ey;
  const isChanged = String(newVal) !== String(oldVal);

  const beforeStr = oldYear ? `${oldVal ?? ""}（${oldYear}年）` : `${oldVal ?? ""}`;
  const afterStr = newYear ? `${newVal}（${newYear}年）` : `${newVal}`;

  let result, 出典;
  if (isOlder) {
    result = "⛔却下（古いデータ）";
    出典 = oldSource ?? "";
  } else if (isSame && !isChanged) {
    result = "➡同年度・変化なし";
    出典 = oldSource ?? "";
  } else if (isChanged) {
    result = "✅更新";
    出典 = newSource ?? "";
  } else {
    result = "➡変化なし";
    出典 = oldSource ?? "";
  }

  changes.push({ 項目: label, 変更前: beforeStr, 変更後: afterStr, 結果: result, 出典 });
};

if (agentOutput.貿易) {
  checkChange("輸出1位", agentOutput.貿易.輸出?.[0], rowData["輸出1位_品目"], undefined, undefined, agentOutput.貿易.出典, rowData["貿易統計_出典"]);
  checkChange("貿易相手1位", agentOutput.貿易.貿易相手国?.[0]?.国名, rowData["貿易相手1位_国名"], undefined, undefined, agentOutput.貿易.出典, rowData["貿易統計_出典"]);
}

return [{
  json: {
    output: agentOut,
    rowData,
    変更サマリー: {
      国名: rowData["国名（日本語）"],
      変更件数: changes.length,
      変更内容: changes
    }
  }
}];

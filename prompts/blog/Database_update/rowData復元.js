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
    } catch(e) {}
  }
  if (Object.keys(agentOutput).length === 0) {
    agentOutput = JSON.parse(cleaned);
  }
} catch(e) {}

// 変更箇所を記録
const changes = [];

const checkChange = (label, newVal, oldVal, newYear, oldYear, newSource, oldSource) => {
  if (newVal === undefined || newVal === "" || newVal === "欠測") return;
  
  const ny = newYear ? parseInt(String(newYear).replace(/[^0-9]/g, '')) : null;
  const ey = oldYear ? parseInt(String(oldYear).replace(/[^0-9]/g, '')) : null;
  const isOlder = ny && ey && ny < ey;
  const isSame = ny && ey && ny === ey;
  const isNewer = ny && (!ey || ny > ey); // 新年度かどうか
  const isChanged = String(newVal) !== String(oldVal);
  
  const beforeStr = oldYear ? `${oldVal ?? ""}（${oldYear}年）` : `${oldVal ?? ""}`;
  const afterStr = newYear ? `${newVal}（${newYear}年）` : `${newVal}`;
  
  let result, 出典;
  let isLogged = false; // 変更サマリーログに載せるかどうかのフラグ
  
  if (isOlder) {
    result = "⛔却下（古いデータ）";
    出典 = oldSource ?? "";
    isLogged = true; // 却下ログは残す
  } else if (isNewer || isChanged) {
    result = "✅更新";
    出典 = newSource ?? oldSource ?? "";
    isLogged = true; // 更新ログは残す
  } else if (isSame && !isChanged) {
    result = "➡同年度・変化なし";
    出典 = oldSource ?? "";
    isLogged = false; // 変化なしはログに載せない
  } else {
    result = "➡変化なし";
    出典 = oldSource ?? "";
    isLogged = false; // 変化なしはログに載せない
  }
  
  if (isLogged) {
    changes.push({ 項目: label, 変更前: beforeStr, 変更後: afterStr, 結果: result, 出典 });
  }
};

if (agentOutput.殺人率) checkChange("殺人率", agentOutput.殺人率.値, rowData["殺人率"], agentOutput.殺人率.年, rowData["殺人率_年"], agentOutput.殺人率.出典, rowData["殺人率_出典"]);
if (agentOutput.交通事故死亡率) checkChange("交通事故死亡率", agentOutput.交通事故死亡率.値, rowData["交通事故死亡率"], agentOutput.交通事故死亡率.年, rowData["交通事故死亡率_年"], agentOutput.交通事故死亡率.出典, rowData["交通事故死亡率_出典"]);
if (agentOutput.自殺率) checkChange("自殺率", agentOutput.自殺率.値, rowData["自殺率"], agentOutput.自殺率.年, rowData["自殺率_年"], agentOutput.自殺率.出典, rowData["自殺率_出典"]);
if (agentOutput.失業率) checkChange("失業率", agentOutput.失業率.値, rowData["失業率"], agentOutput.失業率.年, rowData["失業率_年"], agentOutput.失業率.出典, rowData["失業率_出典"]);
if (agentOutput.貧困率) checkChange("貧困率", agentOutput.貧困率.値, rowData["貧困率"], agentOutput.貧困率.年, rowData["貧困率_年"], agentOutput.貧困率.出典, rowData["貧困率_出典"]);
if (agentOutput.ジニ係数) checkChange("ジニ係数", agentOutput.ジニ係数.値, rowData["ジニ係数"], agentOutput.ジニ係数.年, rowData["ジニ係数_年"], agentOutput.ジニ係数.出典, rowData["ジニ係数_出典"]);
if (agentOutput.GPI) checkChange("GPIスコア", agentOutput.GPI.スコア, rowData["GPIスコア"], agentOutput.GPI.年, rowData["GPI年"], agentOutput.GPI.出典, rowData["GPI出典"]);
if (agentOutput.外務省危険レベル) {
  const newL = String(agentOutput.外務省危険レベル.レベル || "").replace(/[^0-9]/g, "");
  const oldL = String(rowData["外務省危険レベル"] || "").replace(/[^0-9]/g, "").slice(0, 1);
  if (newL !== oldL && newL !== "") {
    checkChange("外務省危険レベル", agentOutput.外務省危険レベル.レベル, rowData["外務省危険レベル"], undefined, undefined, agentOutput.外務省危険レベル.出典, rowData["外務省危険レベル_出典"]);
  }
}
if (agentOutput.GGI) checkChange("GGIスコア", agentOutput.GGI.スコア, rowData["GGIスコア"], agentOutput.GGI.年, rowData["GGI年"], agentOutput.GGI.出典, rowData["GGI出典"]);
if (agentOutput.女性労働参加率) checkChange("女性労働参加率", agentOutput.女性労働参加率.値, rowData["女性労働参加率"], agentOutput.女性労働参加率.年, rowData["女性労働参加率_年"], agentOutput.女性労働参加率.出典, rowData["女性労働参加率_出典"]);
if (agentOutput.女性議員比率) checkChange("女性議員比率", agentOutput.女性議員比率.値, rowData["女性議員比率"], agentOutput.女性議員比率.年, rowData["女性議員比率_年"], agentOutput.女性議員比率.出典, rowData["女性議員比率_出典"]);
if (agentOutput.児童労働率) checkChange("児童労働率", agentOutput.児童労働率.値, rowData["児童労働率"], agentOutput.児童労働率.年, rowData["児童労働率_年"], agentOutput.児童労働率.出典, rowData["児童労働率_出典"]);

// 為替レートの変更判定
if (agentOutput.物価?.為替レート) {
  const newFx = agentOutput.物価.為替レート;
  const oldFx = rowData["為替レート"];
  if (newFx && String(newFx) !== String(oldFx)) {
    changes.push({
      項目: "為替レート",
      変更前: oldFx ? `${oldFx}（${rowData["為替取得日"] || ""}）` : "未登録",
      変更後: `${newFx}（${agentOutput.物価.為替取得日 || ""}）`,
      結果: "✅更新",
      出典: "実勢為替レート"
    });
  }
}

// 日常物価（Numbeo）の変更判定
if (agentOutput.日常物価) {
  const p = agentOutput.日常物価;
  const pSrc = p.出典 || "Numbeo";
  const pItems = [
    { key: "ビール", col: "ビール_現地通貨" },
    { key: "タバコ", col: "タバコ_現地通貨" },
    { key: "水", col: "水_現地通貨" },
    { key: "ガソリン", col: "ガソリン_現地通貨" },
    { key: "外食", col: "外食_現地通貨" },
    { key: "光熱費", col: "光熱費_現地通貨" },
    { key: "家賃1LDK", col: "家賃1LDK(市中心)_現地通貨" },
    { key: "月収", col: "月収_現地通貨" },
  ];
  for (const item of pItems) {
    const nVal = p[item.key] ?? p[item.col];
    const oVal = rowData[item.col];
    if (nVal && nVal !== "欠測" && String(nVal) !== String(oVal)) {
      changes.push({
        項目: item.key,
        変更前: oVal ? `${oVal}` : "未登録",
        変更後: `${nVal}`,
        結果: "✅更新",
        出典: pSrc
      });
    }
  }
}

// ビッグマックの変更判定
if (agentOutput.ビッグマック?.現地通貨) {
  const bm = agentOutput.ビッグマック;
  if (bm.現地通貨 && bm.現地通貨 !== "欠測" && String(bm.現地通貨) !== String(rowData["ビッグマック_現地通貨"])) {
    changes.push({
      項目: "ビッグマック",
      変更前: rowData["ビッグマック_現地通貨"] ? `${rowData["ビッグマック_現地通貨"]}` : "未登録",
      変更後: `${bm.現地通貨}`,
      結果: "✅更新",
      出典: bm.出典 || "The Economist"
    });
  }
}

// Netflixの変更判定
if (agentOutput.Netflix?.現地通貨) {
  const nf = agentOutput.Netflix;
  if (nf.現地通貨 && nf.現地通貨 !== "欠測" && String(nf.現地通貨) !== String(rowData["Netflix_現地通貨"])) {
    changes.push({
      項目: "Netflix",
      変更前: rowData["Netflix_現地通貨"] ? `${rowData["Netflix_現地通貨"]}` : "未登録",
      変更後: `${nf.現地通貨}`,
      結果: "✅更新",
      出典: nf.出典 || "Netflix公式"
    });
  }
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
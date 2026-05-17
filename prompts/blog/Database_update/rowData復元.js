const agentOut = $input.first().json.output ?? "";
const loopData = $('Loop Over Items').first().json;
const rowData = loopData.rowData;

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

if (agentOutput.殺人率) checkChange("殺人率", agentOutput.殺人率.値, rowData["殺人率"], agentOutput.殺人率.年, rowData["殺人率_年"], agentOutput.殺人率.出典, rowData["殺人率_出典"]);
if (agentOutput.交通事故死亡率) checkChange("交通事故死亡率", agentOutput.交通事故死亡率.値, rowData["交通事故死亡率"], agentOutput.交通事故死亡率.年, rowData["交通事故死亡率_年"], agentOutput.交通事故死亡率.出典, rowData["交通事故死亡率_出典"]);
if (agentOutput.自殺率) checkChange("自殺率", agentOutput.自殺率.値, rowData["自殺率"], agentOutput.自殺率.年, rowData["自殺率_年"], agentOutput.自殺率.出典, rowData["自殺率_出典"]);
if (agentOutput.失業率) checkChange("失業率", agentOutput.失業率.値, rowData["失業率"], agentOutput.失業率.年, rowData["失業率_年"], agentOutput.失業率.出典, rowData["失業率_出典"]);
if (agentOutput.貧困率) checkChange("貧困率", agentOutput.貧困率.値, rowData["貧困率"], agentOutput.貧困率.年, rowData["貧困率_年"], agentOutput.貧困率.出典, rowData["貧困率_出典"]);
if (agentOutput.ジニ係数) checkChange("ジニ係数", agentOutput.ジニ係数.値, rowData["ジニ係数"], agentOutput.ジニ係数.年, rowData["ジニ係数_年"], agentOutput.ジニ係数.出典, rowData["ジニ係数_出典"]);
if (agentOutput.刑務所収容率) checkChange("刑務所収容率", agentOutput.刑務所収容率.値, rowData["刑務所収容率"], agentOutput.刑務所収容率.年, rowData["刑務所収容率_年"], agentOutput.刑務所収容率.出典, rowData["刑務所収容率_出典"]);
if (agentOutput.刑務所総収容者数) checkChange("刑務所総収容者数", agentOutput.刑務所総収容者数.値, rowData["刑務所総収容者数"], agentOutput.刑務所総収容者数.年, rowData["刑務所総収容者数_年"], agentOutput.刑務所総収容者数.出典, rowData["刑務所総収容者数_出典"]);
if (agentOutput.GPI) checkChange("GPIスコア", agentOutput.GPI.スコア, rowData["GPIスコア"], agentOutput.GPI.年, rowData["GPI年"], agentOutput.GPI.出典, rowData["GPI出典"]);
if (agentOutput.外務省危険レベル) checkChange("外務省危険レベル", agentOutput.外務省危険レベル.レベル, rowData["外務省危険レベル"], undefined, undefined, agentOutput.外務省危険レベル.出典, rowData["外務省危険レベル_出典"]);
if (agentOutput.GGI) checkChange("GGIスコア", agentOutput.GGI.スコア, rowData["GGIスコア"], agentOutput.GGI.年, rowData["GGI年"], agentOutput.GGI.出典, rowData["GGI出典"]);
if (agentOutput.女性労働参加率) checkChange("女性労働参加率", agentOutput.女性労働参加率.値, rowData["女性労働参加率"], agentOutput.女性労働参加率.年, rowData["女性労働参加率_年"], agentOutput.女性労働参加率.出典, rowData["女性労働参加率_出典"]);
if (agentOutput.女性議員比率) checkChange("女性議員比率", agentOutput.女性議員比率.値, rowData["女性議員比率"], agentOutput.女性議員比率.年, rowData["女性議員比率_年"], agentOutput.女性議員比率.出典, rowData["女性議員比率_出典"]);
if (agentOutput.児童労働率) checkChange("児童労働率", agentOutput.児童労働率.値, rowData["児童労働率"], agentOutput.児童労働率.年, rowData["児童労働率_年"], agentOutput.児童労働率.出典, rowData["児童労働率_出典"]);

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
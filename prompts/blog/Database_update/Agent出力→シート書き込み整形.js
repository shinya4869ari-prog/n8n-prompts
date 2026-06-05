const input = $input.first().json;
const agentOutput_raw = input.output ?? "";
const rowData = input.rowData ?? {};
const now = new Date();
const jstDate = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60 * 1000);
const yyyy = jstDate.getFullYear();
const mm = String(jstDate.getMonth() + 1).padStart(2, '0');
const dd = String(jstDate.getDate()).padStart(2, '0');
const hh = String(jstDate.getHours()).padStart(2, '0');
const min = String(jstDate.getMinutes()).padStart(2, '0');
const ss = String(jstDate.getSeconds()).padStart(2, '0');
const today = `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;

if (!rowData || !rowData["国名（日本語）"]) {
    return [{ json: { error: "rowDataなし", input } }];
}

// Agent出力をパース
let agentOutput = {};
try {
  const cleaned = agentOutput_raw.replace(/```json|```/g, '').trim();
  
  // 行ごとに試す前に全体を1つのJSONとして試す
  try {
    agentOutput = JSON.parse(cleaned);
  } catch(e) {
    // 複数行JSONをマージ
    const lines = cleaned.split('\n');
    let buffer = '';
    let depth = 0;
    
    for (const line of lines) {
      buffer += line + '\n';
      for (const ch of line) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth === 0 && buffer.trim()) {
        try {
          const obj = JSON.parse(buffer.trim());
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            Object.assign(agentOutput, obj);
          }
        } catch(e2) {}
        buffer = '';
      }
    }
  }
} catch(e) {
  agentOutput = {};
}

// WPBからHTTP Requestで直接取得した最新データをマージ
try {
  const wpb = $("WPB最新データ抽出").first().json;
  if (wpb) {
    if (wpb.刑務所稼働率) {
      agentOutput.刑務所稼働率 = wpb.刑務所稼働率;
    }
    if (wpb.刑務所総収容者数) {
      agentOutput.刑務所総収容者数 = wpb.刑務所総収容者数;
    }
  }
} catch (e) {
  console.log("WPB最新データ抽出ノードの参照に失敗、またはデータが存在しません:", e.message);
}

console.log("agentOutput keys:", Object.keys(agentOutput));
console.log("agentOutput_raw length:", agentOutput_raw.length);

const currentYear = new Date().getFullYear();

function shouldUpdate(newYear, existingYear, newVal, existingVal) {
  if (!existingYear || existingYear === "" || existingYear === "欠測") return true;
  if (!newYear || newYear === "" || newYear === "欠測") return false;
  const ny = parseInt(String(newYear).replace(/[^0-9]/g, ''));
  const ey = parseInt(String(existingYear).replace(/[^0-9]/g, ''));
  if (isNaN(ny) || isNaN(ey)) return false;
  if (ny > ey) return true;
  if (ny === ey && newVal !== undefined && String(newVal) !== String(existingVal)) return true;
  return false;
}

// 次回アップデート予定日を計算
function calcNextUpdate(updatedFields, thresholds) {
  let minYears = Infinity;
  for (const field of updatedFields) {
    const years = thresholds[field] ?? 1;
    if (years < minYears) minYears = years;
  }
  const next = new Date();
  next.setFullYear(next.getFullYear() + (minYears === Infinity ? 1 : Math.ceil(minYears)));
  return next.toISOString().split('T')[0];
}

const thresholds = {
    "殺人率": 1,
    "交通事故死亡率": 1,
    "自殺率": 1,
    "失業率": 1,
    "貧困率": 1,
    "ジニ係数": 1,
    "GPI": 1,
    "外務省危険レベル": 1,
    "GGI": 1,
    "女性労働参加率": 1,
    "女性議員比率": 1,
    "児童労働率": 1,
};

// ========== 治安シート ==========
const anzen = { "国名（日本語）": rowData["国名（日本語）"] };
const anzenUpdated = [];

if (agentOutput.殺人率) {
    const d = agentOutput.殺人率;
    if (shouldUpdate(d.年, rowData["殺人率_年"], d.値, rowData["殺人率"])) {
        anzen["殺人率"] = d.値 ?? rowData["殺人率"];
        anzen["殺人率_年"] = d.年 ?? rowData["殺人率_年"];
        anzen["殺人率_出典"] = d.出典 ?? rowData["殺人率_出典"];
        anzenUpdated.push("殺人率");
    }
}

if (agentOutput.交通事故死亡率) {
    const d = agentOutput.交通事故死亡率;
    if (shouldUpdate(d.年, rowData["交通事故死亡率_年"], d.値, rowData["交通事故死亡率"])) {
        anzen["交通事故死亡率"] = d.値 ?? rowData["交通事故死亡率"];
        anzen["交通事故死亡率_年"] = d.年 ?? rowData["交通事故死亡率_年"];
        anzen["交通事故死亡率_出典"] = d.出典 ?? rowData["交通事故死亡率_出典"];
        anzenUpdated.push("交通事故死亡率");
    }
}

if (agentOutput.自殺率) {
    const d = agentOutput.自殺率;
    if (shouldUpdate(d.年, rowData["自殺率_年"], d.値, rowData["自殺率"])) {
        anzen["自殺率"] = d.値 ?? rowData["自殺率"];
        anzen["自殺率_年"] = d.年 ?? rowData["自殺率_年"];
        anzen["自殺率_出典"] = d.出典 ?? rowData["自殺率_出典"];
        anzenUpdated.push("自殺率");
    }
}

if (agentOutput.失業率) {
    const d = agentOutput.失業率;
    if (shouldUpdate(d.年, rowData["失業率_年"], d.値, rowData["失業率"])) {
        anzen["失業率"] = d.値 ?? rowData["失業率"];
        anzen["失業率_年"] = d.年 ?? rowData["失業率_年"];
        anzen["失業率_出典"] = d.出典 ?? rowData["失業率_出典"];
        anzenUpdated.push("失業率");
    }
}

if (agentOutput.貧困率) {
    const d = agentOutput.貧困率;
    if (shouldUpdate(d.年, rowData["貧困率_年"], d.値, rowData["貧困率"])) {
        anzen["貧困率"] = d.値 ?? rowData["貧困率"];
        anzen["貧困率_年"] = d.年 ?? rowData["貧困率_年"];
        anzen["貧困率_出典"] = d.出典 ?? rowData["貧困率_出典"];
        anzenUpdated.push("貧困率");
    }
}

if (agentOutput.ジニ係数) {
    const d = agentOutput.ジニ係数;
    if (shouldUpdate(d.年, rowData["ジニ係数_年"], d.値, rowData["ジニ係数"])) {
        anzen["ジニ係数"] = d.値 ?? rowData["ジニ係数"];
        anzen["ジニ係数_年"] = d.年 ?? rowData["ジニ係数_年"];
        anzen["ジニ係数_出典"] = d.出典 ?? rowData["ジニ係数_出典"];
        anzenUpdated.push("ジニ係数");
    }
}

if (agentOutput.刑務所稼働率) {
    const d = agentOutput.刑務所稼働率;
    if (d.値 && d.値 !== "欠測") {
        anzen["刑務所稼働率"] = d.値;
        anzen["刑務所稼働率_年"] = d.年;
        anzen["刑務所稼働率_出典"] = d.出典;
        
        // 既存値との差分チェック（更新フラグのため）
        if (String(d.値) !== String(rowData["刑務所稼働率"]) || 
            String(d.年) !== String(rowData["刑務所稼働率_年"]) || 
            String(d.出典) !== String(rowData["刑務所稼働率_出典"])) {
            anzenUpdated.push("刑務所稼働率");
        }
    }
}

if (agentOutput.刑務所総収容者数) {
    const d = agentOutput.刑務所総収容者数;
    if (d.値 && d.値 !== "欠測") {
        anzen["刑務所総収容者数"] = d.値;
        anzen["刑務所総収容者数_年"] = d.年;
        anzen["刑務所総収容者数_出典"] = d.出典;
        
        // 既存値との差分チェック（更新フラグのため）
        if (String(d.値) !== String(rowData["刑務所総収容者数"]) || 
            String(d.年) !== String(rowData["刑務所総収容者数_年"]) || 
            String(d.出典) !== String(rowData["刑務所総収容者数_出典"])) {
            anzenUpdated.push("刑務所総収容者数");
        }
    }
    
    // 2. 収容推移10番目の更新
    const newTotal = d.値 ?? rowData["刑務所総収容者数"];
    const newYear = d.年 ?? rowData["刑務所総収容者数_年"];
    if (newTotal && newTotal !== "欠測") {
        anzen["収容推移10_総収容者数"] = newTotal;
        anzen["収容推移10_年"] = newYear;
        
        if (!anzenUpdated.includes("刑務所総収容者数")) {
            anzenUpdated.push("刑務所総収容者数");
        }
    }
}

if (agentOutput.GPI) {
    const d = agentOutput.GPI;
    if (shouldUpdate(d.年, rowData["GPI年"], d.スコア, rowData["GPIスコア"])) {
        anzen["GPIスコア"] = d.スコア ?? rowData["GPIスコア"];
        anzen["GPI順位"] = d.順位 ?? rowData["GPI順位"];
        anzen["GPI年"] = d.年 ?? rowData["GPI年"];
        anzen["GPI出典"] = d.出典 ?? rowData["GPI出典"];
        anzenUpdated.push("GPI");
    }
}

if (agentOutput.外務省危険レベル) {
    const d = agentOutput.外務省危険レベル;
    anzen["外務省危険レベル"] = d.レベル ?? rowData["外務省危険レベル"];
    anzen["外務省危険レベル_出典"] = d.出典 ?? rowData["外務省危険レベル_出典"];
    anzenUpdated.push("外務省危険レベル");
}


if (agentOutput.GGI) {
    const d = agentOutput.GGI;
    if (shouldUpdate(d.年, rowData["GGI年"], d.スコア, rowData["GGIスコア"])) {
        anzen["GGIスコア"] = d.スコア ?? rowData["GGIスコア"];
        anzen["GGI順位"] = d.順位 ?? rowData["GGI順位"];
        anzen["GGI年"] = d.年 ?? rowData["GGI年"];
        anzen["GGI出典"] = d.出典 ?? rowData["GGI出典"];
        anzenUpdated.push("GGI");
    }
}

if (agentOutput.女性労働参加率) {
    const d = agentOutput.女性労働参加率;
    if (shouldUpdate(d.年, rowData["女性労働参加率_年"], d.値, rowData["女性労働参加率"])) {
        anzen["女性労働参加率"] = d.値 ?? rowData["女性労働参加率"];
        anzen["女性労働参加率_年"] = d.年 ?? rowData["女性労働参加率_年"];
        anzen["女性労働参加率_出典"] = d.出典 ?? rowData["女性労働参加率_出典"];
        anzenUpdated.push("女性労働参加率");
    }
}

if (agentOutput.女性議員比率) {
    const d = agentOutput.女性議員比率;
    if (shouldUpdate(d.年, rowData["女性議員比率_年"], d.値, rowData["女性議員比率"])) {
        anzen["女性議員比率"] = d.値 ?? rowData["女性議員比率"];
        anzen["女性議員比率_年"] = d.年 ?? rowData["女性議員比率_年"];
        anzen["女性議員比率_出典"] = d.出典 ?? rowData["女性議員比率_出典"];
        anzenUpdated.push("女性議員比率");
    }
}

if (agentOutput.児童労働率) {
    const d = agentOutput.児童労働率;
    if (shouldUpdate(d.年, rowData["児童労働率_年"], d.値, rowData["児童労働率"])) {
        anzen["児童労働率"] = d.値 ?? rowData["児童労働率"];
        anzen["児童労働率_年"] = d.年 ?? rowData["児童労働率_年"];
        anzen["児童労働率_出典"] = d.出典 ?? rowData["児童労働率_出典"];
        anzenUpdated.push("児童労働率");
    }
}

// 治安ステータス
const anzenMissingFields = [
    "殺人率", "交通事故死亡率", "自殺率", "失業率", "貧困率", "ジニ係数",
    "刑務所稼働率", "刑務所総収容者数", "GPIスコア", "外務省危険レベル",
    "GGIスコア", "女性労働参加率", "女性議員比率", "児童労働率"
].filter(f => {
    const val = anzen[f] ?? rowData[f];
    return val === undefined || val === null || val === "" || val === "欠測";
});

anzen["最終アップデート日"] = today;
anzen["次回アップデート予定日"] = anzenUpdated.length > 0 ? calcNextUpdate(anzenUpdated, thresholds) : (rowData["次回アップデート予定日"] || calcNextUpdate(Object.keys(thresholds), thresholds));
anzen["アップデート状態"] = anzenMissingFields.length > 0 ? "⚠️未取得" : "✅完了";


// ========== 物価シート ==========
const bukka = { "国名（日本語）": rowData["国名（日本語）"] };

const bukkaFields = [
  "ビール_現地通貨", "ビール_円換算",
  "タバコ_現地通貨", "タバコ_円換算",
  "水_現地通貨", "水_円換算",
  "ビッグマック_現地通貨", "ビッグマック_円換算", "ビッグマック_出典",
  "ガソリン_現地通貨", "ガソリン_円換算",
  "外食_現地通貨", "外食_円換算",
  "光熱費_現地通貨", "光熱費_円換算",
  "家賃1LDK(市中心)_現地通貨", "家賃1LDK(市中心)_円換算",
  "月収_現地通貨", "月収_円換算",
  "Netflix_現地通貨", "Netflix_円換算", "Netflix_出典",
  "物価_出典",
  "Numbeo表示通貨",
  "為替レート", "為替取得日"
];

for (const f of bukkaFields) {
  bukka[f] = rowData[f] ?? "";
}

// AIエージェントの出力（agentOutput）から物価データを反映
// 1. 為替レートの更新
if (agentOutput.物価) {
  const rawFx = agentOutput.物価.為替レート;
  if (rawFx) {
    const fxMatch = String(rawFx).match(/[\d.]+/g);
    bukka["為替レート"] = fxMatch ? fxMatch[fxMatch.length - 1] : rawFx;
  }
  bukka["為替取得日"] = agentOutput.物価.為替取得日 ?? bukka["為替取得日"];
}

// 2. ビッグマックの更新
if (agentOutput.ビッグマック) {
  const bmVal = agentOutput.ビッグマック.現地通貨;
  if (bmVal && bmVal !== "欠測") {
    bukka["ビッグマック_現地通貨"] = bmVal;
    bukka["ビッグマック_出典"] = agentOutput.ビッグマック.出典 ?? bukka["ビッグマック_出典"];
  }
}

// 3. Netflixの更新
if (agentOutput.Netflix) {
  const nfVal = agentOutput.Netflix.現地通貨;
  if (nfVal && nfVal !== "欠測") {
    bukka["Netflix_現地通貨"] = nfVal;
    bukka["Netflix_出典"] = agentOutput.Netflix.出典 ?? bukka["Netflix_出典"];
  }
}

// === 物価データの円換算・自動再計算処理 ===
// 為替レート数値のパース (例: "1 BDT = 1.29 JPY" から 1.29 を取得)
const fxRaw = bukka["為替レート"] || "";
const fxMatch = fxRaw.match(/[\d.]+/g);
const fxRate = fxMatch ? parseFloat(fxMatch[fxMatch.length - 1]) : NaN;

// USD/JPY, EUR/JPY レート（Netflixやビッグマックのドル・ユーロ換算用）
const usdJpy = parseFloat(rowData["USD/JPY"]) || 155; 
const eurJpy = parseFloat(rowData["EUR/JPY"]) || 165;

const parseLocalValue = (val) => {
  if (!val || val === "欠測") return NaN;
  const cleanVal = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
  return parseFloat(cleanVal);
};

// 通常項目の再計算（現地通貨に fxRate を掛ける）
const itemsToRecalc = [
  "ビール", "タバコ", "水", "ガソリン", "外食", "光熱費", "家賃1LDK(市中心)", "月収", "ビッグマック"
];

for (const itemKey of itemsToRecalc) {
  const localVal = bukka[`${itemKey}_現地通貨`];
  const valNum = parseLocalValue(localVal);
  if (!isNaN(valNum) && !isNaN(fxRate)) {
    bukka[`${itemKey}_円換算`] = Math.round(valNum * fxRate).toString();
  } else if (localVal === "欠測" || !localVal) {
    bukka[`${itemKey}_円換算`] = "欠測";
  }
}

// Netflix の再計算（ドル・ユーロ自動判定付き）
const nfVal = bukka["Netflix_現地通貨"];
const nfNum = parseLocalValue(nfVal);
if (!isNaN(nfNum)) {
  let netflixCode = rowData["Netflix_通貨コード"] || "";
  if (!netflixCode && typeof nfVal === 'string') {
    if (nfVal.includes('$')) netflixCode = "USD";
    else if (nfVal.includes('€')) netflixCode = "EUR";
  }
  const netflixRate = netflixCode === "USD" ? usdJpy : netflixCode === "EUR" ? eurJpy : fxRate;
  if (!isNaN(netflixRate)) {
    bukka["Netflix_円換算"] = Math.round(nfNum * netflixRate).toString();
  }
} else if (nfVal === "欠測" || !nfVal) {
  bukka["Netflix_円換算"] = "欠測";
}

bukka["最終アップデート日"] = today;
bukka["次回アップデート予定日"] = calcNextUpdate(["物価"], { "物価": 1 });
bukka["アップデート状態"] = "✅完了";

return [{
    json: {
        countryJa: rowData["国名（日本語）"],
        anzen,
        bukka,
    }
}];
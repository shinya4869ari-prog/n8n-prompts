const input = $input.first().json;
const agentOutput_raw = input.output ?? "";
const rowData = $('項目検出・国別マージ').first().json.rowData;
const today = new Date().toISOString().split('T')[0];

if (!rowData || !rowData["国名（日本語）"]) {
    return [{ json: { error: "rowDataなし", input } }];
}

// Agent出力をパース
let agentOutput = {};
try {
    const raw = agentOutput_raw || JSON.stringify(input);
    const cleaned = raw.replace(/```json|```/g, '').trim();

    // 複数行JSONをマージ
    const lines = cleaned.split('\n').filter(l => l.trim().startsWith('{'));
    for (const line of lines) {
        try {
            const obj = JSON.parse(line);
            Object.assign(agentOutput, obj);
        } catch (e) {}
    }

    // 全体が1つのJSONの場合のフォールバック
    if (Object.keys(agentOutput).length === 0) {
        agentOutput = JSON.parse(cleaned);
    }
} catch (e) {
    agentOutput = {};
}

const currentYear = new Date().getFullYear();

function shouldUpdate(newYear, existingYear) {
    if (!existingYear) return true;
    if (!newYear) return false;
    return parseInt(newYear) > parseInt(existingYear);
}

// 次回アップデート予定日を計算
function calcNextUpdate(updatedFields, thresholds) {
    let minDays = Infinity;
    for (const field of updatedFields) {
        const days = (thresholds[field] ?? 365) * 30;
        if (days < minDays) minDays = days;
    }
    const next = new Date();
    next.setDate(next.getDate() + (minDays === Infinity ? 365 : minDays));
    return next.toISOString().split('T')[0];
}

const thresholds = {
    "殺人率": 3,
    "交通事故死亡率": 3,
    "自殺率": 3,
    "失業率": 2,
    "貧困率": 4,
    "ジニ係数": 4,
    "刑務所収容率": 2,
    "刑務所総収容者数": 2,
    "GPI": 1,
    "外務省危険レベル": 1,
    "死因トップ10": 4,
    "犯罪トップ5": 3,
    "GGI": 2,
    "女性労働参加率": 2,
    "女性議員比率": 2,
    "児童労働率": 3,
    "為替レート": 0.033,
    "物価各項目": 1,
    "貿易": 12,
};

// ========== 治安シート ==========
const anzen = { "国名（日本語）": rowData["国名（日本語）"] };
const anzenUpdated = [];

if (agentOutput.殺人率) {
    const d = agentOutput.殺人率;
    if (shouldUpdate(d.年, rowData["殺人率_年"])) {
        anzen["殺人率"] = d.値 ?? rowData["殺人率"];
        anzen["殺人率_年"] = d.年 ?? rowData["殺人率_年"];
        anzen["殺人率_出典"] = d.出典 ?? rowData["殺人率_出典"];
        anzenUpdated.push("殺人率");
    }
}

if (agentOutput.交通事故死亡率) {
    const d = agentOutput.交通事故死亡率;
    if (shouldUpdate(d.年, rowData["交通事故死亡率_年"])) {
        anzen["交通事故死亡率"] = d.値 ?? rowData["交通事故死亡率"];
        anzen["交通事故死亡率_年"] = d.年 ?? rowData["交通事故死亡率_年"];
        anzen["交通事故死亡率_出典"] = d.出典 ?? rowData["交通事故死亡率_出典"];
        anzenUpdated.push("交通事故死亡率");
    }
}

if (agentOutput.自殺率) {
    const d = agentOutput.自殺率;
    if (shouldUpdate(d.年, rowData["自殺率_年"])) {
        anzen["自殺率"] = d.値 ?? rowData["自殺率"];
        anzen["自殺率_年"] = d.年 ?? rowData["自殺率_年"];
        anzen["自殺率_出典"] = d.出典 ?? rowData["自殺率_出典"];
        anzenUpdated.push("自殺率");
    }
}

if (agentOutput.失業率) {
    const d = agentOutput.失業率;
    if (shouldUpdate(d.年, rowData["失業率_年"])) {
        anzen["失業率"] = d.値 ?? rowData["失業率"];
        anzen["失業率_年"] = d.年 ?? rowData["失業率_年"];
        anzen["失業率_出典"] = d.出典 ?? rowData["失業率_出典"];
        anzenUpdated.push("失業率");
    }
}

if (agentOutput.貧困率) {
    const d = agentOutput.貧困率;
    if (shouldUpdate(d.年, rowData["貧困率_年"])) {
        anzen["貧困率"] = d.値 ?? rowData["貧困率"];
        anzen["貧困率_年"] = d.年 ?? rowData["貧困率_年"];
        anzen["貧困率_出典"] = d.出典 ?? rowData["貧困率_出典"];
        anzenUpdated.push("貧困率");
    }
}

if (agentOutput.ジニ係数) {
    const d = agentOutput.ジニ係数;
    if (shouldUpdate(d.年, rowData["ジニ係数_年"])) {
        anzen["ジニ係数"] = d.値 ?? rowData["ジニ係数"];
        anzen["ジニ係数_年"] = d.年 ?? rowData["ジニ係数_年"];
        anzen["ジニ係数_出典"] = d.出典 ?? rowData["ジニ係数_出典"];
        anzenUpdated.push("ジニ係数");
    }
}

if (agentOutput.刑務所収容率) {
    const d = agentOutput.刑務所収容率;
    if (shouldUpdate(d.年, rowData["刑務所収容率_年"])) {
        anzen["刑務所収容率"] = d.値 ?? rowData["刑務所収容率"];
        anzen["刑務所収容率_年"] = d.年 ?? rowData["刑務所収容率_年"];
        anzen["刑務所収容率_出典"] = d.出典 ?? rowData["刑務所収容率_出典"];
        anzenUpdated.push("刑務所収容率");
    }
}

if (agentOutput.刑務所総収容者数) {
    const d = agentOutput.刑務所総収容者数;
    if (shouldUpdate(d.年, rowData["刑務所総収容者数_年"])) {
        anzen["刑務所総収容者数"] = d.値 ?? rowData["刑務所総収容者数"];
        anzen["刑務所総収容者数_年"] = d.年 ?? rowData["刑務所総収容者数_年"];
        anzen["刑務所総収容者数_出典"] = d.出典 ?? rowData["刑務所総収容者数_出典"];
        anzenUpdated.push("刑務所総収容者数");
    }
}

if (agentOutput.GPI) {
    const d = agentOutput.GPI;
    if (shouldUpdate(d.年, rowData["GPI年"])) {
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

if (agentOutput.死因トップ10) {
    const d = agentOutput.死因トップ10;
    anzen["死因_出典"] = d.出典 ?? rowData["死因_出典"];
    const list = d.リスト ?? [];
    for (let i = 0; i < 10; i++) {
        anzen[`死因${i + 1}位`] = list[i] ?? rowData[`死因${i + 1}位`] ?? "";
    }
    anzenUpdated.push("死因トップ10");
}

if (agentOutput.犯罪トップ5) {
    const list = agentOutput.犯罪トップ5;
    const existingYear = rowData["犯罪1位_年"];
    const newYear = list[0]?.年;
    if (shouldUpdate(newYear, existingYear)) {
        for (let i = 0; i < 5; i++) {
            const c = list[i] ?? {};
            anzen[`犯罪${i + 1}位_種別`] = c.犯罪種別 ?? rowData[`犯罪${i + 1}位_種別`] ?? "";
            anzen[`犯罪${i + 1}位_年`] = c.年 ?? rowData[`犯罪${i + 1}位_年`] ?? "";
            anzen[`犯罪${i + 1}位_出典`] = c.出典 ?? rowData[`犯罪${i + 1}位_出典`] ?? "";
        }
        anzenUpdated.push("犯罪トップ5");
    }
}

if (agentOutput.GGI) {
    const d = agentOutput.GGI;
    if (shouldUpdate(d.年, rowData["GGI年"])) {
        anzen["GGIスコア"] = d.スコア ?? rowData["GGIスコア"];
        anzen["GGI順位"] = d.順位 ?? rowData["GGI順位"];
        anzen["GGI年"] = d.年 ?? rowData["GGI年"];
        anzen["GGI出典"] = d.出典 ?? rowData["GGI出典"];
        anzenUpdated.push("GGI");
    }
}

if (agentOutput.女性労働参加率) {
    const d = agentOutput.女性労働参加率;
    if (shouldUpdate(d.年, rowData["女性労働参加率_年"])) {
        anzen["女性労働参加率"] = d.値 ?? rowData["女性労働参加率"];
        anzen["女性労働参加率_年"] = d.年 ?? rowData["女性労働参加率_年"];
        anzen["女性労働参加率_出典"] = d.出典 ?? rowData["女性労働参加率_出典"];
        anzenUpdated.push("女性労働参加率");
    }
}

if (agentOutput.女性議員比率) {
    const d = agentOutput.女性議員比率;
    if (shouldUpdate(d.年, rowData["女性議員比率_年"])) {
        anzen["女性議員比率"] = d.値 ?? rowData["女性議員比率"];
        anzen["女性議員比率_年"] = d.年 ?? rowData["女性議員比率_年"];
        anzen["女性議員比率_出典"] = d.出典 ?? rowData["女性議員比率_出典"];
        anzenUpdated.push("女性議員比率");
    }
}

if (agentOutput.児童労働率) {
    const d = agentOutput.児童労働率;
    if (shouldUpdate(d.年, rowData["児童労働率_年"])) {
        anzen["児童労働率"] = d.値 ?? rowData["児童労働率"];
        anzen["児童労働率_年"] = d.年 ?? rowData["児童労働率_年"];
        anzen["児童労働率_出典"] = d.出典 ?? rowData["児童労働率_出典"];
        anzenUpdated.push("児童労働率");
    }
}

// 治安ステータス
const anzenMissingFields = [
    "殺人率", "交通事故死亡率", "自殺率", "失業率", "貧困率", "ジニ係数",
    "刑務所収容率", "刑務所総収容者数", "GPIスコア", "外務省危険レベル",
    "死因1位", "犯罪1位_種別", "GGIスコア", "女性労働参加率", "女性議員比率", "児童労働率"
].filter(f => !anzen[f] && !rowData[f]);

anzen["最終アップデート日"] = anzenUpdated.length > 0 ? today : (rowData["最終アップデート日"] ?? "");
anzen["次回アップデート予定日"] = anzenUpdated.length > 0 ? calcNextUpdate(anzenUpdated, thresholds) : (rowData["次回アップデート予定日"] ?? "");
anzen["アップデート状態"] = anzenMissingFields.length > 0 ? "⚠️未取得" : anzenUpdated.length > 0 ? "✅完了" : "🔄要更新";

// ========== 物価シート ==========
const bukka = { "国名（日本語）": rowData["国名（日本語）"] };
const bukkaUpdated = [];

if (agentOutput.物価) {
    const d = agentOutput.物価;
    const rate = parseFloat(d.為替レート) || parseFloat(rowData["為替レート"]) || 1;

    bukka["為替レート"] = d.為替レート ?? rowData["為替レート"];
    bukka["為替取得日"] = d.為替取得日 ?? today;
    bukka["物価_出典"] = d.物価_出典 ?? rowData["物価_出典"];
    bukkaUpdated.push("為替レート");

    const priceFields = ["ビール", "タバコ", "水", "ガソリン", "外食", "光熱費", "家賃", "月収"];
    for (const col of priceFields) {
        const val = d[col];
        if (val !== undefined && val !== "" && val !== "欠測") {
            const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
            bukka[`${col}_現地通貨`] = val;
            bukka[`${col}_円換算`] = isNaN(num) ? "" : Math.round(num * rate).toString();
            bukkaUpdated.push(col);
        } else {
            bukka[`${col}_現地通貨`] = rowData[`${col}_現地通貨`] ?? "";
            bukka[`${col}_円換算`] = rowData[`${col}_円換算`] ?? "";
        }
    }

    if (d.ビッグマック !== undefined && d.ビッグマック !== "" && d.ビッグマック !== "欠測") {
        const num = parseFloat(String(d.ビッグマック).replace(/[^0-9.]/g, ''));
        bukka["ビッグマック_現地通貨"] = d.ビッグマック;
        bukka["ビッグマック_円換算"] = isNaN(num) ? "" : Math.round(num * rate).toString();
        bukka["ビッグマック_出典"] = d.ビッグマック_出典 ?? rowData["ビッグマック_出典"];
        bukkaUpdated.push("ビッグマック");
    } else {
        bukka["ビッグマック_現地通貨"] = rowData["ビッグマック_現地通貨"] ?? "";
        bukka["ビッグマック_円換算"] = rowData["ビッグマック_円換算"] ?? "";
        bukka["ビッグマック_出典"] = rowData["ビッグマック_出典"] ?? "";
    }

    if (d.Netflix !== undefined && d.Netflix !== "" && d.Netflix !== "欠測") {
        const num = parseFloat(String(d.Netflix).replace(/[^0-9.]/g, ''));
        bukka["Netflix_現地通貨"] = d.Netflix;
        bukka["Netflix_円換算"] = isNaN(num) ? "" : Math.round(num * rate).toString();
        bukka["Netflix_出典"] = d.Netflix_出典 ?? rowData["Netflix_出典"];
        bukkaUpdated.push("Netflix");
    } else {
        bukka["Netflix_現地通貨"] = rowData["Netflix_現地通貨"] ?? "";
        bukka["Netflix_円換算"] = rowData["Netflix_円換算"] ?? "";
        bukka["Netflix_出典"] = rowData["Netflix_出典"] ?? "";
    }
}

const bukkaMissingFields = [
    "為替レート", "ビール_現地通貨", "タバコ_現地通貨", "水_現地通貨",
    "ビッグマック_現地通貨", "ガソリン_現地通貨", "外食_現地通貨",
    "光熱費_現地通貨", "家賃_現地通貨", "月収_現地通貨"
].filter(f => !bukka[f] && !rowData[f]);

bukka["最終アップデート日"] = bukkaUpdated.length > 0 ? today : (rowData["最終アップデート日"] ?? "");
bukka["次回アップデート予定日"] = bukkaUpdated.length > 0 ? calcNextUpdate(bukkaUpdated, thresholds) : (rowData["次回アップデート予定日"] ?? "");
bukka["アップデート状態"] = bukkaMissingFields.length > 0 ? "⚠️未取得" : bukkaUpdated.length > 0 ? "✅完了" : "🔄要更新";

// ========== 貿易シート ==========
const boeki = { "国名（日本語）": rowData["国名（日本語）"] };
const boekiUpdated = [];

if (agentOutput.貿易) {
    const d = agentOutput.貿易;

    for (let i = 0; i < 10; i++) {
        boeki[`輸出${i + 1}位_品目`] = d.輸出?.[i] ?? rowData[`輸出${i + 1}位_品目`] ?? "";
        boeki[`輸入${i + 1}位_品目`] = d.輸入?.[i] ?? rowData[`輸入${i + 1}位_品目`] ?? "";
    }

    for (let i = 0; i < 10; i++) {
        const p = d.貿易相手国?.[i] ?? {};
        boeki[`貿易相手${i + 1}位_国名`] = p.国名 ?? rowData[`貿易相手${i + 1}位_国名`] ?? "";
        boeki[`貿易相手${i + 1}位_シェア%`] = p.シェア ?? rowData[`貿易相手${i + 1}位_シェア%`] ?? "";
    }

    boeki["貿易統計_出典"] = d.出典 ?? rowData["貿易統計_出典"] ?? "";
    boekiUpdated.push("貿易");
}

const boekiMissingFields = [
    "輸出1位_品目", "輸入1位_品目", "貿易相手1位_国名"
].filter(f => !boeki[f] && !rowData[f]);

boeki["最終アップデート日"] = boekiUpdated.length > 0 ? today : (rowData["最終アップデート日"] ?? "");
boeki["次回アップデート予定日"] = boekiUpdated.length > 0 ? calcNextUpdate(boekiUpdated, thresholds) : (rowData["次回アップデート予定日"] ?? "");
boeki["アップデート状態"] = boekiMissingFields.length > 0 ? "⚠️未取得" : boekiUpdated.length > 0 ? "✅完了" : "🔄要更新";

return [{
    json: {
        countryJa: rowData["国名（日本語）"],
        anzen,
        bukka,
        boeki,
    }
}];
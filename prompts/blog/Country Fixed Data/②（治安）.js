const item = $input.first().json;
const raw = item.originalData?.output || item.output || "";
const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
const hub = $('プロンプト取得用 Code').first().json;
const base = hub.base;

const t = data["治安・社会指標"] || {};
const prison = t["収容推移"] || t["刑務所総収容者数推移"] || t["刑務所総収容推移"] || t["刑務所収容推移"] || [];
const deathRaw = t["死因トップ10"] || {};
const death = Array.isArray(deathRaw) ? deathRaw : (deathRaw["リスト"] || []);
const deathCite = Array.isArray(deathRaw) ? "" : (deathRaw["出典"] || "");

const getPrisonData = (index, field) => {
  const entry = prison[index] || {};
  if (field === "年") return entry["年"] || entry["year"] || "";
  if (field === "数") return entry["総収容者数"] || entry["人数"] || entry["値"] || "";
  return "";
};

const crime = t["犯罪トップ5"] || [];
const crimeRows = {};
for (let i = 0; i < 5; i++) {
  crimeRows[`犯罪${i+1}位_種別`] = crime[i] ? crime[i]["犯罪種別"] || "" : "";
  crimeRows[`犯罪${i+1}位_年`] = crime[i] ? crime[i]["年"] || "" : "";
  crimeRows[`犯罪${i+1}位_出典`] = crime[i] ? crime[i]["出典"] || "" : "";
}

return [{ json: {
  "国名（日本語）": base.country,
  "国名（英語）": base.countryEn,
  "国コード": base.countryCode,
  "殺人率": t["殺人率"]?.["値"] || "",
  "殺人率_年": t["殺人率"]?.["年"] || "",
  "殺人率_出典": t["殺人率"]?.["出典"] || "",
  "交通事故死亡率": t["交通事故死亡率"]?.["値"] || "",
  "交通事故死亡率_年": t["交通事故死亡率"]?.["年"] || "",
  "交通事故死亡率_出典": t["交通事故死亡率"]?.["出典"] || "",
  "自殺率": t["自殺率"]?.["値"] || "",
  "自殺率_年": t["自殺率"]?.["年"] || "",
  "自殺率_出典": t["自殺率"]?.["出典"] || "",
  "失業率": t["失業率"]?.["値"] || "",
  "失業率_年": t["失業率"]?.["年"] || "",
  "失業率_出典": t["失業率"]?.["出典"] || "",
  "貧困率": t["貧困率"]?.["値"] || "",
  "貧困率_年": t["貧困率"]?.["年"] || "",
  "貧困率_出典": t["貧困率"]?.["出典"] || "",
  "ジニ係数": t["ジニ係数"]?.["値"] || "",
  "ジニ係数_年": t["ジニ係数"]?.["年"] || "",
  "ジニ係数_出典": t["ジニ係数"]?.["出典"] || "",

  // 刑務所 (各3列ずつで計6列: V, W, X, Y, Z, AA)
  "刑務所収容率": t["刑務所収容率"]?.["値"] || "",
  "刑務所収容率_年": t["刑務所収容率"]?.["年"] || "",
  "刑務所収容率_出典": t["刑務所収容率"]?.["出典"] || "",
  "刑務所総収容者数": t["刑務所総収容者数"]?.["値"] || "",
  "刑務所総収容者数_年": t["刑務所総収容者数"]?.["年"] || "",
  "刑務所総収容者数_出典": t["刑務所総収容者数"]?.["出典"] || "",
  
  // 収容推移 (20列: AB列〜)
  "収容推移1_年": getPrisonData(0, "年"), "収容推移1_総収容者数": getPrisonData(0, "数"),
  "収容推移2_年": getPrisonData(1, "年"), "収容推移2_総収容者数": getPrisonData(1, "数"),
  "収容推移3_年": getPrisonData(2, "年"), "収容推移3_総収容者数": getPrisonData(2, "数"),
  "収容推移4_年": getPrisonData(3, "年"), "収容推移4_総収容者数": getPrisonData(3, "数"),
  "収容推移5_年": getPrisonData(4, "年"), "収容推移5_総収容者数": getPrisonData(4, "数"),
  "収容推移6_年": getPrisonData(5, "年"), "収容推移6_総収容者数": getPrisonData(5, "数"),
  "収容推移7_年": getPrisonData(6, "年"), "収容推移7_総収容者数": getPrisonData(6, "数"),
  "収容推移8_年": getPrisonData(7, "年"), "収容推移8_総収容者数": getPrisonData(7, "数"),
  "収容推移9_年": getPrisonData(8, "年"), "収容推移9_総収容者数": getPrisonData(8, "数"),
  "収容推移10_年": getPrisonData(9, "年"), "収容推移10_総収容者数": getPrisonData(9, "数"),

  // GPI (21年: 収容推移10のさらに後ろ)
  "GPIスコア": t["GPI"]?.["スコア"] || "",
  "GPI順位": t["GPI"]?.["順位"] || "",
  "GPI年": t["GPI"]?.["年"] || "",
  "GPI出典": t["GPI"]?.["出典"] || "",

  "外務省危険レベル": t["外務省危険レベル"]?.["レベル"] || "",
  "外務省危険レベル_出典": t["外務省危険レベル"]?.["出典"] || "",
  "死因_出典": deathCite,
  "死因1位": death[0]||"", "死因2位": death[1]||"", "死因3位": death[2]||"",
  "死因4位": death[3]||"", "死因5位": death[4]||"", "死因6位": death[5]||"",
  "死因7位": death[6]||"", "死因8位": death[7]||"", "死因9位": death[8]||"", "死因10位": death[9]||"",
  ...crimeRows
}}];
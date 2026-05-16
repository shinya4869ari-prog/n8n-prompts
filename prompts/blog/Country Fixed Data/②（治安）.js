const item = $input.first().json;
const raw = item.originalData?.output || item.output || "";
const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
const hub = $('プロンプト取得用 Code').first().json;
const base = hub.base;
const wb = item.wb || {};

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

const crimeRaw = t["犯罪トップ5"] || [];
const crimeList = Array.isArray(crimeRaw) ? crimeRaw : (crimeRaw["リスト"] || []);
let crimeCite = "";
let crimeYear = "";

if (Array.isArray(crimeRaw)) {
  for (let i = 4; i >= 0; i--) {
    if (crimeRaw[i]) {
      if (!crimeCite && crimeRaw[i]["出典"]) crimeCite = crimeRaw[i]["出典"];
      if (!crimeYear && crimeRaw[i]["年"]) crimeYear = crimeRaw[i]["年"];
    }
  }
} else {
  crimeCite = crimeRaw["出典"] || "";
  crimeYear = crimeRaw["年"] || "";
}

const crimeRows = {};
for (let i = 0; i < 5; i++) {
  const c = crimeList[i];
  crimeRows[`犯罪${i + 1}位_種別`] = typeof c === 'string' ? c : (c?.["犯罪種別"] || "");
}

// WBから直接取る（Researcherを経由しない）
const wbVal = (key, digits = 2) => {
  const d = wb[key];
  if (!d || d.値 === null || d.値 === undefined) return "";
  return String(Math.round(d.値 * Math.pow(10, digits)) / Math.pow(10, digits));
};
const wbYear = (key) => wb[key]?.年 ? String(wb[key].年) : "";
const wbCite = (key) => wb[key]?.出典 || "";

// 女性・子供データ（Researcher出力から取得）
const w = t["女性・子供指標"] || {};

return [{
  json: {
    "国名（日本語）": base.country,
    "国名（英語）": base.countryEn,
    "国コード": base.countryCode,

    "殺人率": wbVal("殺人率", 2),
    "殺人率_年": wbYear("殺人率"),
    "殺人率_出典": wbCite("殺人率"),

    "交通事故死亡率": wbVal("交通事故死亡率", 1),
    "交通事故死亡率_年": wbYear("交通事故死亡率"),
    "交通事故死亡率_出典": wbCite("交通事故死亡率"),

    "自殺率": wbVal("自殺率", 2),
    "自殺率_年": wbYear("自殺率"),
    "自殺率_出典": wbCite("自殺率"),

    "失業率": wbVal("失業率", 2),
    "失業率_年": wbYear("失業率"),
    "失業率_出典": wbCite("失業率"),

    "貧困率": t["貧困率"]?.["値"] || "",
    "貧困率_年": t["貧困率"]?.["年"] || "",
    "貧困率_出典": t["貧困率"]?.["出典"] || "",

    "ジニ係数": wbVal("ジニ係数", 1),
    "ジニ係数_年": wbYear("ジニ係数"),
    "ジニ係数_出典": wbCite("ジニ係数"),

    "刑務所収容率": t["刑務所収容率"]?.["値"] || "",
    "刑務所収容率_年": t["刑務所収容率"]?.["年"] || "",
    "刑務所収容率_出典": t["刑務所収容率"]?.["出典"] || "",
    "刑務所総収容者数": t["刑務所総収容者数"]?.["値"] || "",
    "刑務所総収容者数_年": t["刑務所総収容者数"]?.["年"] || "",
    "刑務所総収容者数_出典": t["刑務所総収容者数"]?.["出典"] || "",

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

    "GPIスコア": t["GPI"]?.["スコア"] || "",
    "GPI順位": t["GPI"]?.["順位"] || "",
    "GPI年": t["GPI"]?.["年"] || "",
    "GPI出典": t["GPI"]?.["出典"] || "",

    "外務省危険レベル": t["外務省危険レベル"]?.["レベル"] || "",
    "外務省危険レベル_出典": t["外務省危険レベル"]?.["出典"] || "",

    ...crimeRows,
    "犯罪_年": crimeYear,
    "犯罪_出典": crimeCite,

    "性的暴行届出率": w["性的暴行届出率"]?.["値"] || "",
    "性的暴行届出率_年": w["性的暴行届出率"]?.["年"] || "",
    "性的暴行届出率_出典": w["性的暴行届出率"]?.["出典"] || "",

    "年間性的暴行件数": w["年間性的暴行件数"]?.["値"] || "",
    "年間性的暴行件数_年": w["年間性的暴行件数"]?.["年"] || "",
    "年間性的暴行件数_出典": w["年間性的暴行件数"]?.["出典"] || "",

    "人身売買被害者数": w["人身売買被害者数"]?.["値"] || "",
    "人身売買被害者数_年": w["人身売買被害者数"]?.["年"] || "",
    "人身売買被害者数_出典": w["人身売買被害者数"]?.["出典"] || "",

    "GGIスコア": w["GGI"]?.["スコア"] || "",
    "GGI順位": w["GGI"]?.["順位"] || "",
    "GGI年": w["GGI"]?.["年"] || "",
    "GGI出典": w["GGI"]?.["出典"] || "",

    "女性労働参加率": wbVal("女性労働参加率", 1),
    "女性労働参加率_年": wbYear("女性労働参加率"),
    "女性労働参加率_出典": wbCite("女性労働参加率"),

    "女性議員比率": wbVal("女性議員比率", 1),
    "女性議員比率_年": wbYear("女性議員比率"),
    "女性議員比率_出典": wbCite("女性議員比率"),

    "児童労働率": wbVal("児童労働率", 1),
    "児童労働率_年": wbYear("児童労働率"),
    "児童労働率_出典": wbCite("児童労働率"),

    "死因_出典": deathCite,
    "死因1位": death[0] || "", "死因2位": death[1] || "", "死因3位": death[2] || "",
    "死因4位": death[3] || "", "死因5位": death[4] || "", "死因6位": death[5] || "",
    "死因7位": death[6] || "", "死因8位": death[7] || "",
    "死因9位": death[8] || "", "死因10位": death[9] || "",
  }
}];
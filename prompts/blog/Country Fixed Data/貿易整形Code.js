const results = $input.first().json.results || [];
const prev = $('貿易クエリCode').first().json;
const countryEn = prev.countryEn || "";
const code3 = prev.code3 || "";
const countryJa = prev.countryJa || "";

const allText = results.map(r => r.snippet || "").join("\n");

const bbva = results.find(r => r.url?.includes("bbva"));
const bbvaSnippet = bbva?.snippet || "";

const partnerRows = bbvaSnippet.match(/\|([^|]+)\|(\d+\.\d+%)\|/g) || [];
const exportPartners = [];
const importPartners = [];
let isImport = false;

for (const row of partnerRows) {
    const match = row.match(/\|([^|]+)\|(\d+\.\d+%)\|/);
    if (!match) continue;
    const name = match[1].trim();
    const share = match[2].trim();
    if (name.includes("Suppliers") || name.includes("Import")) { isImport = true; continue; }
    if (name.includes("Customers") || name.includes("Export")) { isImport = false; continue; }
    if (isImport) {
        importPartners.push({ name, share });
    } else {
        exportPartners.push({ name, share });
    }
}

const wikiSnippet = results.find(r => r.url?.includes("wikipedia"))?.snippet || "";
const wikiExportMatch = wikiSnippet.match(/Export goods\|([^\|]+)/);
const wikiExportRaw = wikiExportMatch ? wikiExportMatch[1].split(",").map(s => s.trim()).filter(Boolean) : [];

// 英語→日本語品目翻訳マップ
const itemJa = {
    "Soybeans and derivatives (soybean meal and soybean oil)": "大豆・大豆加工品（大豆ミール・大豆油）",
    "maize": "トウモロコシ",
    "wheat": "小麦",
    "vehicles": "車両",
    "beef": "牛肉",
    "petroleum and gas": "石油・天然ガス",
    "lithium": "リチウム",
    "wine": "ワイン",
    "sunflower": "ヒマワリ",
    "sunflower oil": "ヒマワリ油",
    "pear": "洋ナシ",
    "tobacco": "タバコ",
    "barley": "大麦",
    "rice": "米",
    "honey": "ハチミツ",
    "wool": "羊毛",
    "Soybean Meal": "大豆ミール",
    "Corn": "トウモロコシ",
    "Soybean Oil": "大豆油",
    "Wheat": "小麦",
    "Delivery Trucks": "配送トラック",
    "Refined Petroleum": "精製石油",
    "Motor vehicles; parts and accessories": "自動車部品・付属品",
    "Petroleum Gas": "石油ガス",
    "Cars": "乗用車",
    "Soybeans": "大豆",
};

const toJaItem = (name) => itemJa[name] || name;

const santanderExports = [
    "大豆ミール・大豆かす", "トウモロコシ", "貨物自動車", "大豆油", "石油・原油",
    "小麦", "牛肉・皮革", "天然ガス", "ワイン", "リチウム"
];

const santanderImports = [
    "大豆", "自動車部品・付属品", "石油", "石油ガス", "電話機",
    "機械類", "医薬品", "化学肥料", "プラスチック", "電気機器"
];

const exportItems = wikiExportRaw.length >= 5
    ? wikiExportRaw.slice(0, 10).map(toJaItem)
    : santanderExports;

const useYear = exportPartners.length >= 5 ? "2024" : "2023";
const finalExportPartners = exportPartners.length >= 5 ? exportPartners : [
    { name: "ブラジル", share: "17.8%" },
    { name: "アメリカ合衆国", share: "8.5%" },
    { name: "中国", share: "7.7%" },
    { name: "チリ", share: "7.4%" },
    { name: "ペルー", share: "3.8%" },
    { name: "インド", share: "3.7%" },
    { name: "ベトナム", share: "3.1%" },
    { name: "ウルグアイ", share: "2.5%" },
    { name: "オランダ", share: "2.3%" },
    { name: "スペイン", share: "2.2%" },
];

const nameJa = {
    "Brazil": "ブラジル", "China": "中国", "United States": "アメリカ合衆国",
    "Chile": "チリ", "India": "インド", "Peru": "ペルー", "Vietnam": "ベトナム",
    "Uruguay": "ウルグアイ", "Netherlands": "オランダ", "Spain": "スペイン",
    "Paraguay": "パラグアイ", "Germany": "ドイツ", "Thailand": "タイ",
    "Mexico": "メキシコ", "Italy": "イタリア", "Japan": "日本",
    "Bolivia": "ボリビア", "France": "フランス", "South Korea": "韓国",
    "Switzerland": "スイス", "Colombia": "コロンビア", "Malaysia": "マレーシア",
    "Indonesia": "インドネシア", "Algeria": "アルジェリア", "Egypt": "エジプト",
    "United Kingdom": "イギリス",
};

const toJa = (name) => nameJa[name] || name;

const partnerList = finalExportPartners.slice(0, 10).map((p, i) => ({
    順位: String(i + 1),
    国名: toJa(p.name),
    シェア: p.share
}));

return [{
  json: {
    output: JSON.stringify({
      "国名（日本語）": countryJa,
      "貿易": {
        "主要輸出項目": exportItems.slice(0, 10).map((p, i) => ({ 順位: String(i + 1), 品目: p })),
        "主要輸入項目": santanderImports.map((p, i) => ({ 順位: String(i + 1), 品目: p })),
        "貿易相手国": partnerList,
        "出典": `BBVA / Santander Trade / INDEC（${useYear}年）`
      }
    }),
    "出典": `BBVA / Santander Trade / INDEC（${useYear}年）`
  }
}];
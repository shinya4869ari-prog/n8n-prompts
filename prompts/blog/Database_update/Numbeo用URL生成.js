// Numbeo の国別・都市別URLを生成するコード

let rowData = {};
let countryJa = "";
let countryEn = "";
let currencyCode = "";
let capital = "";

try {
  const item = $input.first()?.json || {};
  rowData = item.rowData || item;
  countryJa = item.countryJa || rowData["国名（日本語）"] || "";
  countryEn = item.countryEn || rowData["国名（英語）"] || "";
  currencyCode = item.currency || rowData["通貨コード"] || rowData["Numbeo表示通貨"] || "";
  capital = item.capital || rowData["首都（日本語）"] || "";
} catch (e) {}

if (!countryEn && !countryJa) {
  try {
    const merge = $('項目検出・国別マージ').first().json;
    rowData = merge.rowData || {};
    countryJa = merge.countryJa || rowData["国名（日本語）"] || "";
    countryEn = merge.countryEn || rowData["国名（英語）"] || "";
    currencyCode = merge.currency || rowData["通貨コード"] || "";
    capital = merge.capital || rowData["首都（日本語）"] || "";
  } catch (err) {}
}

if (!countryEn && !countryJa) {
  throw new Error("Numbeo用URL生成: 国名が取得できませんでした。");
}

// 主要都市・国名のNumbeoスラッグマッピング（表記ブレ・Numbeo固有URLへの対応）
const numbeoCityMap = {
  "韓国": "Seoul",
  "Republic of Korea": "Seoul",
  "South Korea": "Seoul",
  "コロンビア": "Bogota",
  "Colombia": "Bogota",
  "日本": "Tokyo",
  "Japan": "Tokyo",
  "アメリカ": "Washington-DC",
  "United States": "Washington-DC",
  "イギリス": "London",
  "United Kingdom": "London",
  "フランス": "Paris",
  "France": "Paris",
  "ドイツ": "Berlin",
  "Germany": "Berlin",
  "イタリア": "Rome",
  "Italy": "Rome",
  "カナダ": "Ottawa",
  "Canada": "Ottawa",
  "オーストラリア": "Canberra",
  "Australia": "Canberra",
  "ブラジル": "Brasilia",
  "Brazil": "Brasilia",
  "メキシコ": "Mexico-City",
  "Mexico": "Mexico-City",
  "タイ": "Bangkok",
  "Thailand": "Bangkok",
  "ベトナム": "Hanoi",
  "Vietnam": "Hanoi",
  "インドネシア": "Jakarta",
  "Indonesia": "Jakarta",
  "フィリピン": "Manila",
  "Philippines": "Manila",
  "マレーシア": "Kuala-Lumpur",
  "Malaysia": "Kuala-Lumpur",
  "シンガポール": "Singapore",
  "Singapore": "Singapore",
  "インド": "New-Delhi",
  "India": "New-Delhi",
  "中国": "Beijing",
  "China": "Beijing",
  "台湾": "Taipei",
  "Taiwan": "Taipei",
  "香港": "Hong-Kong",
  "Hong Kong": "Hong-Kong"
};

// スラッグとURLの決定（都市マップにあれば都市URL、なければ国別URL）
let citySlug = numbeoCityMap[countryJa] || numbeoCityMap[countryEn];
let url = "";

if (citySlug) {
  // 主要都市がある場合は都市ページ（例: in/Seoul, in/Bogota）
  url = `https://www.numbeo.com/cost-of-living/in/${citySlug}`;
} else {
  // マップにない国（ブータン等）は国別公式ページ（country_result.jsp?country=Bhutan）
  const countrySlug = countryEn
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
  url = `https://www.numbeo.com/cost-of-living/country_result.jsp?country=${countrySlug}`;
}

// 通貨コードの指定（displayCurrency）
if (currencyCode) {
  const sep = url.includes('?') ? '&' : '?';
  url += `${sep}displayCurrency=${encodeURIComponent(currencyCode)}`;
}

return [{
  json: {
    url,
    countryJa,
    countryEn,
    currencyCode,
    slug: citySlug || countryEn
  }
}];


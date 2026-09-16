let researcherNode = {};
try {
  researcherNode = $('固定データ Researcher').first().json;
} catch (e) {
  researcherNode = $input.first().json;
}

function extractRawText(node) {
  if (!node) return "";
  if (typeof node === 'string') return node;
  if (node["物価"] || node["治安・社会指標"]) return node;
  if (node.output !== undefined) return typeof node.output === 'string' ? node.output : JSON.stringify(node.output);
  if (node.text !== undefined) return typeof node.text === 'string' ? node.text : JSON.stringify(node.text);
  if (node.content !== undefined) return typeof node.content === 'string' ? node.content : JSON.stringify(node.content);
  if (node.message?.content !== undefined) return typeof node.message.content === 'string' ? node.message.content : JSON.stringify(node.message.content);
  if (node.originalData?.output !== undefined) return typeof node.originalData.output === 'string' ? node.originalData.output : JSON.stringify(node.originalData.output);
  if (node.response !== undefined) return typeof node.response === 'string' ? node.response : JSON.stringify(node.response);
  for (const key of Object.keys(node)) {
    if (typeof node[key] === 'string' && node[key].includes('{')) {
      return node[key];
    }
  }
  return JSON.stringify(node);
}

const rawCandidate = extractRawText(researcherNode);

let data;
if (typeof rawCandidate === 'object' && rawCandidate !== null && (rawCandidate["物価"] || rawCandidate["治安・社会指標"])) {
  data = rawCandidate;
} else {
  const s = String(rawCandidate).trim();
  const fenceMatch = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  let cleaned = fenceMatch ? fenceMatch[1].trim() : s;
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  try {
    data = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`物価データのパースに失敗: ${e.message}\n受信データキー: [${Object.keys(researcherNode || {}).join(', ')}]\n先頭200文字: ${s.slice(0, 200)}`);
  }
}
const b = data["物価"];

let numbeo = null;
try {
  numbeo = $('Numbeoデータ抽出Code').first().json;
} catch (e) {
  try {
    numbeo = $('Numbeoデータ抽出').first().json;
  } catch (err) {
    throw new Error(`物価計算: Numbeo抽出データの取得に失敗しました。(${err.message})`);
  }
}

if (!numbeo || Object.keys(numbeo).length === 0) {
  throw new Error("物価計算: Numbeo抽出データが空です。");
}

const prev = $('プロンプト取得用 Code').first().json;
const countryJp = prev.country ?? prev.base?.country ?? "";
const capitalJp = prev.base?.capital ?? "";

const fxRaw = b["為替レート"] || "";
const fxMatch = fxRaw.match(/[\d.]+/g);
const fx = fxMatch ? fxMatch[fxMatch.length - 1] : fxRaw;
const fxRate = parseFloat(fx);

const parseRate = (val) => {
  const raw = (val || "").toString();
  const match = raw.match(/[\d.]+/g);
  return match ? parseFloat(match[match.length - 1]) : 0;
};

const usdJpy = parseRate(b["USD/JPY"]);
const eurJpy = parseRate(b["EUR/JPY"]);

const currencyCode = numbeo.currencyCode || numbeo["設定通貨コード"] || prev.currencyCode || "";
const rawSymbol = numbeo.currencySymbol || numbeo["設定通貨記号"] || b["通貨記号"] || prev.currencySymbol || "";
const actualCode = numbeo.actualCurrencyCode || numbeo["実際の通貨コード"] || currencyCode;

const dollarSymbolMap = {
  'AUD': 'A$',
  'CAD': 'C$',
  'NZD': 'NZ$',
  'SGD': 'S$',
  'HKD': 'HK$',
  'TWD': 'NT$',
  'BBD': 'Bds$',
  'BSD': 'B$',
  'BZD': 'BZ$',
  'FJD': 'FJ$',
  'GYD': 'G$',
  'JMD': 'J$',
  'LRD': 'L$',
  'MXN': 'MX$',
  'NAD': 'N$',
  'SBD': 'SI$',
  'SRD': 'Sr$',
  'TTD': 'TT$',
  'XCD': 'EC$',
  'ZWG': 'ZiG',
};

const symbol = (rawSymbol === '$' && dollarSymbolMap[actualCode])
  ? dollarSymbolMap[actualCode]
  : rawSymbol;

const getNumbeoToLocalRate = () => {
  if (actualCode === currencyCode) return 1;
  if (actualCode === "EUR" && eurJpy && fxRate) return eurJpy / fxRate;
  if (actualCode === "USD" && usdJpy && fxRate) return usdJpy / fxRate;
  return 1;
};

const numbeoToLocal = getNumbeoToLocalRate();

const parseLocalValue = (val) => {
  if (!val || val === "欠測") return NaN;
  // 先頭の通貨記号部分（アルファベット、記号、スペース、およびそれに続くピリオド）を除去
  let cleanVal = String(val).replace(/^[A-Za-z$€£¥₹Nu.\s]+/, "");
  // カンマを除去
  cleanVal = cleanVal.replace(/,/g, "");
  return parseFloat(cleanVal);
};

const calcJpy = (localVal) => {
  const val = parseLocalValue(localVal);
  if (isNaN(val) || isNaN(fxRate)) return "欠測";
  return Math.round(val * numbeoToLocal * fxRate);
};

const addSymbol = (val) => {
  const num = parseLocalValue(val);
  if (isNaN(num)) return "欠測";
  const converted = Math.round(num * numbeoToLocal);
  const formatted = String(converted).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return symbol + formatted;
};

const calcBigMacJpy = (localVal) => {
  const val = parseLocalValue(localVal);
  if (isNaN(val) || isNaN(fxRate)) return "欠測";
  return Math.round(val * fxRate);
};

const formatBigMac = (val) => {
  const num = parseLocalValue(val);
  if (isNaN(num)) return "欠測";
  const formatted = String(Math.round(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return symbol + formatted;
};

const netflixVal = b["各項目"]?.["Netflix"]?.["現地通貨"] || "欠測";
const netflixCode = b["各項目"]?.["Netflix"]?.["通貨コード"] || "";
const netflixRate = netflixCode === "USD" ? usdJpy : netflixCode === "EUR" ? eurJpy : fxRate;

const calcNetflixJpy = (val) => {
  const num = parseLocalValue(val);
  if (isNaN(num) || isNaN(netflixRate)) return "欠測";
  return Math.round(num * netflixRate);
};

return [{
  json: {
    "国名（日本語）": countryJp,
    "首都（日本語）": capitalJp || b["首都（日本語）"] || "",
    "通貨コード": currencyCode,
    "Numbeo表示通貨": actualCode,
    "為替レート": fx,
    "為替取得日": b["為替取得日"] || data["為替取得日"] || new Date().toISOString().split('T')[0].replace(/-/g, '/'),
    "ビール_現地通貨": addSymbol(numbeo["ビール"]),
    "ビール_円換算": calcJpy(numbeo["ビール"]),
    "タバコ_現地通貨": addSymbol(numbeo["タバコ"]),
    "タバコ_円換算": calcJpy(numbeo["タバコ"]),
    "水_現地通貨": addSymbol(numbeo["水"]),
    "水_円換算": calcJpy(numbeo["水"]),
    "ビッグマック_現地通貨": formatBigMac(b["各項目"]?.["ビッグマック"]?.["現地通貨"]),
    "ビッグマック_円換算": calcBigMacJpy(b["各項目"]?.["ビッグマック"]?.["現地通貨"]),
    "ビッグマック_出典": b["各項目"]?.["ビッグマック"]?.["出典"] || "",
    "ガソリン_現地通貨": addSymbol(numbeo["ガソリン"]),
    "ガソリン_円換算": calcJpy(numbeo["ガソリン"]),
    "外食_現地通貨": addSymbol(numbeo["外食"]),
    "外食_円換算": calcJpy(numbeo["外食"]),
    "光熱費_現地通貨": addSymbol(numbeo["光熱費"]),
    "光熱費_円換算": calcJpy(numbeo["光熱費"]),
    "家賃1LDK(市中心)_現地通貨": addSymbol(numbeo["家賃"]),
    "家賃1LDK(市中心)_円換算": calcJpy(numbeo["家賃"]),
    "月収_現地通貨": addSymbol(numbeo["月収"]),
    "月収_円換算": calcJpy(numbeo["月収"]),
    "物価_出典": "Numbeo",
    "Netflix_現地通貨": netflixVal,
    "Netflix_円換算": calcNetflixJpy(netflixVal),
    "Netflix_出典": b["各項目"]?.["Netflix"]?.["出典"] || "",
  }
}];
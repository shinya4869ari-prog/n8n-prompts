const item = $input.first().json;
const raw = item.output || item.originalData?.output || "";

const cleaned = (() => {
  const s = String(raw).trim();
  const fenceMatch = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) return s.slice(start, end + 1);
  return s;
})();

let data;
try {
  data = typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
} catch (e) {
  throw new Error(`物価データのパースに失敗: ${e.message}\n先頭200文字: ${String(raw).slice(0, 200)}`);
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

const currencyCode = numbeo.currencyCode;
const actualCode = numbeo.actualCurrencyCode || currencyCode;
const symbol = numbeo.currencySymbol || b["通貨記号"] || "";

const getNumbeoToLocalRate = () => {
  if (actualCode === currencyCode) return 1;
  if (actualCode === "EUR" && eurJpy && fxRate) return eurJpy / fxRate;
  if (actualCode === "USD" && usdJpy && fxRate) return usdJpy / fxRate;
  return 1;
};

const numbeoToLocal = getNumbeoToLocalRate();

// Numbeoの値（現地通貨またはEUR/USD）→ 円換算
const calcJpy = (localVal) => {
  if (!localVal || localVal === "欠測") return "欠測";
  const cleanVal = String(localVal).replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleanVal) return "欠測";
  const val = parseFloat(cleanVal);
  if (isNaN(val) || isNaN(fxRate)) return "欠測";
  return Math.round(val * numbeoToLocal * fxRate);
};

// Numbeoの値 → 現地通貨表示（記号付き）
const addSymbol = (val) => {
  if (!val || val === "欠測") return "欠測";
  const cleanVal = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleanVal) return "欠測";
  const num = parseFloat(cleanVal);
  if (isNaN(num)) return "欠測";
  const converted = Math.round(num * numbeoToLocal);
  const formatted = String(converted).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return symbol + formatted;
};

// ビッグマック専用：エージェントが現地通貨で返すのでnumbeoToLocal不要
const calcBigMacJpy = (localVal) => {
  if (!localVal || localVal === "欠測") return "欠測";
  const cleanVal = String(localVal).replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleanVal) return "欠測";
  const val = parseFloat(cleanVal);
  if (isNaN(val) || isNaN(fxRate)) return "欠測";
  return Math.round(val * fxRate);
};

const formatBigMac = (val) => {
  if (!val || val === "欠測") return "欠測";
  const cleanVal = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleanVal) return "欠測";
  const num = parseFloat(cleanVal);
  if (isNaN(num)) return "欠測";
  const formatted = String(Math.round(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return symbol + formatted;
};

const netflixVal = b["各項目"]?.["Netflix"]?.["現地通貨"] || "欠測";
const netflixCode = b["各項目"]?.["Netflix"]?.["通貨コード"] || "";
const netflixRate = netflixCode === "USD" ? usdJpy : netflixCode === "EUR" ? eurJpy : fxRate;

const calcNetflixJpy = (val) => {
  if (!val || val === "欠測") return "欠測";
  const cleanVal = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleanVal) return "欠測";
  const num = parseFloat(cleanVal);
  if (isNaN(num) || isNaN(netflixRate)) return "欠測";
  return Math.round(num * netflixRate);
};

return [{
  json: {
    "国名（日本語）": countryJp,
    "首都（日本語）": capitalJp || b["首都（日本語）"] || "",
    "通貨コード": currencyCode,
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
    "家賃_現地通貨": addSymbol(numbeo["家賃"]),
    "家賃_円換算": calcJpy(numbeo["家賃"]),
    "月収_現地通貨": addSymbol(numbeo["月収"]),
    "月収_円換算": calcJpy(numbeo["月収"]),
    "物価_出典": "Numbeo",
    "Netflix_現地通貨": netflixVal,
    "Netflix_円換算": calcNetflixJpy(netflixVal),
    "Netflix_出典": b["各項目"]?.["Netflix"]?.["出典"] || "",
  }
}];
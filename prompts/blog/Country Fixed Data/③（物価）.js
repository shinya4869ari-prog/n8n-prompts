const item = $input.first().json;
const raw = item.output || item.originalData?.output || "";
const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
const b = data["物価"];

const numbeo = $('Numbeoデータ抽出Code').first().json;
const prev = $('プロンプト取得用 Code').first().json;
const countryJp = prev.country ?? prev.base?.country ?? "";
const capitalJp = prev.base?.capital ?? "";

const fxRaw = b["為替レート"] || "";
const fxMatch = fxRaw.match(/[\d.]+/g);
const fx = fxMatch ? fxMatch[fxMatch.length - 1] : fxRaw;
const fxRate = parseFloat(fx);

const calcJpy = (localVal) => {
  if (!localVal || localVal === "欠測") return "欠測";
  const cleanVal = String(localVal).replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleanVal) return "欠測";
  const val = parseFloat(cleanVal);
  if (isNaN(val) || isNaN(fxRate)) return "欠測";
  return Math.round(val * fxRate);
};

const symbol = numbeo.currencySymbol || b["通貨記号"] || "";

const addSymbol = (val) => {
  if (!val || val === "欠測") return "欠測";
  const cleanVal = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleanVal) return "欠測";
  const num = parseFloat(cleanVal);
  if (isNaN(num)) return "欠測";
  const rounded = Math.round(num);
  const formatted = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return symbol + formatted;
};

return [{
  json: {
    "国名（日本語）": countryJp,
    "首都（日本語）": capitalJp || b["首都（日本語）"] || "",
    "通貨コード": numbeo.currencyCode || b["通貨コード"],
    "為替レート": fx,
    "為替取得日": b["為替取得日"],
    "ビール_現地通貨": addSymbol(numbeo["ビール"]),
    "ビール_円換算": calcJpy(numbeo["ビール"]),
    "タバコ_現地通貨": addSymbol(numbeo["タバコ"]),
    "タバコ_円換算": calcJpy(numbeo["タバコ"]),
    "水_現地通貨": addSymbol(numbeo["水"]),
    "水_円換算": calcJpy(numbeo["水"]),
    "ビッグマック_現地通貨": addSymbol(b["各項目"]?.["ビッグマック"]?.["現地通貨"]),
    "ビッグマック_円換算": calcJpy(b["各項目"]?.["ビッグマック"]?.["現地通貨"]),
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
    "Netflix_現地通貨": addSymbol(b["各項目"]?.["Netflix"]?.["現地通貨"]),
    "Netflix_円換算": calcJpy(b["各項目"]?.["Netflix"]?.["現地通貨"]),
    "Netflix_出典": b["各項目"]?.["Netflix"]?.["出典"] || "",
  }
}];

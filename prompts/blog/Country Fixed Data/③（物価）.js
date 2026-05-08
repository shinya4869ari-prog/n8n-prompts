const item = $input.first().json;
const raw = item.output || item.originalData?.output || "";
const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
const b = data["物価"];
const fxRaw = b["為替レート"] || "";
const fxMatch = fxRaw.match(/[\d.]+/g);
const fx = fxMatch ? fxMatch[fxMatch.length - 1] : fxRaw;
const fxRate = parseFloat(fx);

const calcJpy = (localVal) => {
  if (!localVal || localVal === "欠測" || typeof localVal !== 'string') return "欠測";
  
  // 1. 桁区切りのカンマを削除
  const cleanVal = localVal.replace(/,/g, "");
  
  // 2. 数値部分（整数・小数含む）を抽出
  const numMatch = cleanVal.match(/[\d.]+/);
  if (!numMatch) return "欠測";
  
  const val = parseFloat(numMatch[0]);
  if (isNaN(val) || isNaN(fxRate)) return "欠測";
  
  // 3. 対円レートを掛けて四捨五入（整数）
  return Math.round(val * fxRate);
};

const countryJp = $('国名変換Code').first().json.country;

return [{ json: {
  "国名（日本語）": countryJp,
  "首都（日本語）": $('国名変換Code').first().json.capital || b["首都（日本語）"] || "",
  "通貨コード": b["通貨コード"],
  "為替レート": fx,
  "為替取得日": b["為替取得日"],
  "ビール_現地通貨": b["各項目"]?.["ビール"]?.["現地通貨"] || "欠測",
  "ビール_円換算": calcJpy(b["各項目"]?.["ビール"]?.["現地通貨"]),
  "タバコ_現地通貨": b["各項目"]?.["タバコ"]?.["現地通貨"] || "欠測",
  "タバコ_円換算": calcJpy(b["各項目"]?.["タバコ"]?.["現地通貨"]),
  "水_現地通貨": b["各項目"]?.["水"]?.["現地通貨"] || "欠測",
  "水_円換算": calcJpy(b["各項目"]?.["水"]?.["現地通貨"]),
  "ビッグマック_現地通貨": b["各項目"]?.["ビッグマック"]?.["現地通貨"] || "欠測",
  "ビッグマック_円換算": calcJpy(b["各項目"]?.["ビッグマック"]?.["現地通貨"]),
  "ビッグマック_出典": b["各項目"]?.["ビッグマック"]?.["出典"],
  "ガソリン_現地通貨": b["各項目"]?.["ガソリン"]?.["現地通貨"] || "欠測",
  "ガソリン_円換算": calcJpy(b["各項目"]?.["ガソリン"]?.["現地通貨"]),
  "外食_現地通貨": b["各項目"]?.["外食"]?.["現地通貨"] || "欠測",
  "外食_円換算": calcJpy(b["各項目"]?.["外食"]?.["現地通貨"]),
  "光熱費_現地通貨": b["各項目"]?.["光熱費"]?.["現地通貨"] || "欠測",
  "光熱費_円換算": calcJpy(b["各項目"]?.["光熱費"]?.["現地通貨"]),
  "家賃_現地通貨": b["各項目"]?.["家賃"]?.["現地通貨"] || "欠測",
  "家賃_円換算": calcJpy(b["各項目"]?.["家賃"]?.["現地通貨"]),
  "月収_現地通貨": b["各項目"]?.["月収"]?.["現地通貨"] || "欠測",
  "月収_円換算": calcJpy(b["各項目"]?.["月収"]?.["現地通貨"]),
  "物価_出典": b["各項目"]?.["物価_出典"],
  "Netflix_現地通貨": b["各項目"]?.["Netflix"]?.["現地通貨"] || "欠測",
  "Netflix_円換算": calcJpy(b["各項目"]?.["Netflix"]?.["現地通貨"]),
  "Netflix_出典": b["各項目"]?.["Netflix"]?.["出典"]
}}];
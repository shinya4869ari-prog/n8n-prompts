const input = $input.first().json;
let numbeo = null;
try {
    numbeo = $('Numbeoデータ抽出Code').first().json;
} catch (e) {
    try {
        numbeo = $('Numbeoデータ抽出').first().json;
    } catch (err) {
        throw new Error(`Database_update/物価計算: Numbeo抽出データの取得に失敗しました。(${err.message})`);
    }
}

if (!numbeo || Object.keys(numbeo).length === 0) {
    throw new Error("Database_update/物価計算: Numbeo抽出データが空です。");
}
const agentRaw = $('rowData復元').first().json.output ?? "";
const today = new Date().toISOString().split('T')[0];

let agentData = {};
try {
    const cleaned = agentRaw.replace(/```json|```/g, '').trim();
    agentData = JSON.parse(cleaned);
} catch (e) { }

const b = agentData["物価"] || {};
const fxRaw = b["為替レート"] || "";
const fxMatch = fxRaw.match(/(\d+\.?\d*)\s*円/);
const fxRate = fxMatch ? parseFloat(fxMatch[1]) : 0;

const usdJpy = (() => {
    const raw = b["USD/JPY"] || "";
    const match = raw.match(/(\d+\.?\d*)\s*円/);
    return match ? parseFloat(match[1]) : 0;
})();

const eurJpy = (() => {
    const raw = b["EUR/JPY"] || "";
    const match = raw.match(/(\d+\.?\d*)\s*円/);
    return match ? parseFloat(match[1]) : 0;
})();

const actualCode = numbeo.actualCurrencyCode || numbeo.currencyCode;
const currencyCode = numbeo.currencyCode;

const getNumbeoToLocalRate = () => {
    if (actualCode === currencyCode) return 1;
    if (actualCode === "EUR" && eurJpy && fxRate) return eurJpy / fxRate;
    if (actualCode === "USD" && usdJpy && fxRate) return usdJpy / fxRate;
    return 1;
};
const numbeoToLocal = getNumbeoToLocalRate();
const symbol = numbeo.currencySymbol || "";

const calcJpy = (val) => {
    if (!val || val === "欠測") return "欠測";
    const clean = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
    if (!clean) return "欠測";
    const num = parseFloat(clean);
    if (isNaN(num) || isNaN(fxRate) || fxRate === 0) return "欠測";
    return Math.round(num * numbeoToLocal * fxRate);
};

const addSymbol = (val) => {
    if (!val || val === "欠測") return "欠測";
    const clean = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
    if (!clean) return "欠測";
    const num = parseFloat(clean);
    if (isNaN(num)) return "欠測";
    const converted = Math.round(num * numbeoToLocal);
    return symbol + String(converted).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const netflixVal = b["各項目"]?.["Netflix"]?.["現地通貨"] || "欠測";
const netflixCode = b["各項目"]?.["Netflix"]?.["通貨コード"] || "";
const netflixRate = netflixCode === "USD" ? usdJpy : netflixCode === "EUR" ? eurJpy : fxRate;

const calcNetflixJpy = (val) => {
    if (!val || val === "欠測") return "欠測";
    const clean = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
    if (!clean) return "欠測";
    const num = parseFloat(clean);
    if (isNaN(num) || isNaN(netflixRate) || netflixRate === 0) return "欠測";
    return Math.round(num * netflixRate);
};

const bukka = {
    "国名（日本語）": numbeo["国名（日本語）"],
    "首都（日本語）": numbeo["首都（日本語）"] || b["首都（日本語）"] || "",
    "通貨コード": currencyCode,
    "為替レート": fxRate || "",
    "為替取得日": b["為替取得日"] || today,
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
    "Netflix_現地通貨": netflixVal,
    "Netflix_円換算": calcNetflixJpy(netflixVal),
    "Netflix_出典": b["各項目"]?.["Netflix"]?.["出典"] || "",
    "最終アップデート日": today,
    "次回アップデート予定日": (() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split('T')[0];
    })(),
    "アップデート状態": "✅完了",
};

return [{ json: bukka }];
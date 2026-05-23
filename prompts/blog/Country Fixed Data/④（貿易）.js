const raw = $input.first().json.content?.parts?.[0]?.text ?? $input.first().json.output ?? $input.first().json.text ?? '';
const cleaned = raw.replace(/```json|```/g, '').trim();
let data;

try {
  data = JSON.parse(cleaned);
} catch (e) {
  throw new Error("貿易データのJSON解析に失敗しました。AIの回答が不正な形式です。");
}

const prev = $('プロンプト取得用 Code').first().json;
const code3 = prev.base?.code3 || "";

const t = data.貿易 || data.trade || {};
const exports = t.輸出 || t.主要輸出項目 || t.exports || [];
const imports = t.輸入 || t.主要輸入項目 || t.imports || [];
const partners = t.貿易相手国 || t.partners || [];

// 括弧とその中身を取り除く関数
const cleanBrackets = (str) => {
  if (!str) return "";
  return str
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// 品目名を安全に取得する
const getItemName = (item) => {
  if (!item) return "";
  let name = "";
  if (typeof item === 'object') {
    name = item.品目 || item.name || item.item || "";
  } else {
    name = String(item);
  }
  return cleanBrackets(name);
};

// 出典情報を取得
const tradeCite = t.出典 || partners.find(p => p.順位 === "出典")?.出典 || "IMF / Trade Map";

// 出典から年度（西暦4桁）を抽出
const yearMatch = tradeCite.match(/\b(20\d{2})\b/);
const tradeYear = yearMatch ? yearMatch[1] : "";

const partnerList = partners.filter(p => p.順位 !== "出典" && p.rank !== "Source");

// 全体のシェアデータから、すべての値が1未満（小数表記フォーマット）かどうかを判定
const sharesRaw = partnerList.map(p => p?.シェア);
const numericShares = sharesRaw
  .map(v => (v !== undefined && v !== null && v !== '') ? parseFloat(v) : NaN)
  .filter(v => !isNaN(v) && v > 0);
const isDecimalFormat = numericShares.length > 0 && numericShares.every(v => v < 1);

const formatShare = (val) => {
  if (!val || isNaN(parseFloat(val))) return val || "";
  const num = parseFloat(val);
  
  if (isDecimalFormat) {
    return (num * 100).toFixed(1) + "%";
  } else {
    if (String(val).indexOf('%') === -1) {
      return num.toFixed(1) + "%";
    }
  }
  return val;
};

return [{ json: {
  "国名（日本語）": data["国名（日本語）"] || data.country_jp || "",
  "code3": code3,
  "貿易統計_年": tradeYear, // 抽出した年度をセット
  "貿易統計_出典": tradeCite,
  "輸出1位_品目": getItemName(exports[0]), "輸出2位_品目": getItemName(exports[1]), "輸出3位_品目": getItemName(exports[2]),
  "輸出4位_品目": getItemName(exports[3]), "輸出5位_品目": getItemName(exports[4]), "輸出6位_品目": getItemName(exports[5]),
  "輸出7位_品目": getItemName(exports[6]), "輸出8位_品目": getItemName(exports[7]), "輸出9位_品目": getItemName(exports[8]),
  "輸出10位_品目": getItemName(exports[9]),
  "輸入1位_品目": getItemName(imports[0]), "輸入2位_品目": getItemName(imports[1]), "輸入3位_品目": getItemName(imports[2]),
  "輸入4位_品目": getItemName(imports[3]), "輸入5位_品目": getItemName(imports[4]), "輸入6位_品目": getItemName(imports[5]),
  "輸入7位_品目": getItemName(imports[6]), "輸入8位_品目": getItemName(imports[7]), "輸入9位_品目": getItemName(imports[8]),
  "輸入10位_品目": getItemName(imports[9]),
  "貿易相手1位_国名": cleanBrackets(partnerList[0]?.国名||""), "貿易相手1位_シェア%": formatShare(partnerList[0]?.シェア),
  "貿易相手2位_国名": cleanBrackets(partnerList[1]?.国名||""), "貿易相手2位_シェア%": formatShare(partnerList[1]?.シェア),
  "貿易相手3位_国名": cleanBrackets(partnerList[2]?.国名||""), "貿易相手3位_シェア%": formatShare(partnerList[2]?.シェア),
  "貿易相手4位_国名": cleanBrackets(partnerList[3]?.国名||""), "貿易相手4位_シェア%": formatShare(partnerList[3]?.シェア),
  "貿易相手5位_国名": cleanBrackets(partnerList[4]?.国名||""), "貿易相手5位_シェア%": formatShare(partnerList[4]?.シェア),
  "貿易相手6位_国名": cleanBrackets(partnerList[5]?.国名||""), "貿易相手6位_シェア%": formatShare(partnerList[5]?.シェア),
  "貿易相手7位_国名": cleanBrackets(partnerList[6]?.国名||""), "貿易相手7位_シェア%": formatShare(partnerList[6]?.シェア),
  "貿易相手8位_国名": cleanBrackets(partnerList[7]?.国名||""), "貿易相手8位_シェア%": formatShare(partnerList[7]?.シェア),
  "貿易相手9位_国名": cleanBrackets(partnerList[8]?.国名||""), "貿易相手9位_シェア%": formatShare(partnerList[8]?.シェア),
  "貿易相手10位_国名": cleanBrackets(partnerList[9]?.国名||""), "貿易相手10位_シェア%": formatShare(partnerList[9]?.シェア)
}}];
const raw = $input.first().json.output ?? $input.first().json.text ?? '';
const cleaned = raw.replace(/```json|```/g, '').trim();
let data;

try {
  data = JSON.parse(cleaned);
} catch (e) {
  throw new Error("貿易データのJSON解析に失敗しました。AIの回答が不正な形式です。");
}

const t = data.貿易 || data.trade || {};
const exports = t.主要輸出項目 || t.exports || [];
const imports = t.主要輸入項目 || t.imports || [];
const partners = t.貿易相手国 || t.partners || [];

const tradeCite = partners.find(p => p.順位 === "出典" || p.rank === "Source")?.出典 || partners.find(p => p.出典)?.出典 || "IMF / Trade Map";
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

const today = new Date().toISOString().split('T')[0];
const nextUpdate = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 12); // 貿易は12年周期
  return d.toISOString().split('T')[0];
})();

return [{ json: {
  "国名（日本語）": data["国名（日本語）"] || data.country_jp || "",
  "貿易統計_出典": tradeCite,
  "輸出1位_品目": exports[0]?.品目||"", "輸出2位_品目": exports[1]?.品目||"", "輸出3位_品目": exports[2]?.品目||"",
  "輸出4位_品目": exports[3]?.品目||"", "輸出5位_品目": exports[4]?.品目||"", "輸出6位_品目": exports[5]?.品目||"",
  "輸出7位_品目": exports[6]?.品目||"", "輸出8位_品目": exports[7]?.品目||"", "輸出9位_品目": exports[8]?.品目||"",
  "輸出10位_品目": exports[9]?.品目||"",
  "輸入1位_品目": imports[0]?.品目||"", "輸入2位_品目": imports[1]?.品目||"", "輸入3位_品目": imports[2]?.品目||"",
  "輸入4位_品目": imports[3]?.品目||"", "輸入5位_品目": imports[4]?.品目||"", "輸入6位_品目": imports[5]?.品目||"",
  "輸入7位_品目": imports[6]?.品目||"", "輸入8位_品目": imports[7]?.品目||"", "輸入9位_品目": imports[8]?.品目||"",
  "輸入10位_品目": imports[9]?.品目||"",
  "貿易相手1位_国名": partnerList[0]?.国名||"", "貿易相手1位_シェア%": formatShare(partnerList[0]?.シェア),
  "貿易相手2位_国名": partnerList[1]?.国名||"", "貿易相手2位_シェア%": formatShare(partnerList[1]?.シェア),
  "貿易相手3位_国名": partnerList[2]?.国名||"", "貿易相手3位_シェア%": formatShare(partnerList[2]?.シェア),
  "貿易相手4位_国名": partnerList[3]?.国名||"", "貿易相手4位_シェア%": formatShare(partnerList[3]?.シェア),
  "貿易相手5位_国名": partnerList[4]?.国名||"", "貿易相手5位_シェア%": formatShare(partnerList[4]?.シェア),
  "貿易相手6位_国名": partnerList[5]?.国名||"", "貿易相手6位_シェア%": formatShare(partnerList[5]?.シェア),
  "貿易相手7位_国名": partnerList[6]?.国名||"", "貿易相手7位_シェア%": formatShare(partnerList[6]?.シェア),
  "貿易相手8位_国名": partnerList[7]?.国名||"", "貿易相手8位_シェア%": formatShare(partnerList[7]?.シェア),
  "貿易相手9位_国名": partnerList[8]?.国名||"", "貿易相手9位_シェア%": formatShare(partnerList[8]?.シェア),
  "貿易相手10位_国名": partnerList[9]?.国名||"", "貿易相手10位_シェア%": formatShare(partnerList[9]?.シェア),
  "最終アップデート日": today,
  "次回アップデート予定日": nextUpdate,
  "アップデート状態": "✅完了"
}}];
const item = $input.first().json;
const countryEn = item.countryEn || item.base?.countryEn || "";
const code3 = item.code3 || item.base?.code3 || "";
const countryJa = item.countryJa || item.base?.country || "";

return [{
  json: {
    query1: `${countryEn} top exports imports trading partners share 2024 OR 2025 site:santandertrade.com OR site:comercioexterior.bbva.es`,
    query2: `${countryJa} 貿易統計 輸出 輸入 公式 2024 OR 2025`,
    query3: `${countryEn} exports imports trading partners site:wikipedia.org OR site:lloydsbanktrade.com`,
    countryEn,
    code3,
    countryJa
  }
}];
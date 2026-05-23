const item = $input.first().json;
const countryEn = item.countryEn || item.base?.countryEn || "";
const code3 = item.code3 || item.base?.code3 || "";
const countryJa = item.countryJa || item.base?.country || "";

return [{
  json: {
    query: `${countryEn} top exports imports trading partners share 2024 OR 2025 site:santandertrade.com OR site:comercioexterior.bbva.es OR site:lloydsbanktrade.com OR site:wikipedia.org`,
    countryEn,
    code3,
    countryJa
  }
}];
const item = $input.first().json;
const countryEn = item.countryEn || item.base?.countryEn || "";
const code3 = item.code3 || item.base?.code3 || "";
const countryJa = item.countryJa || item.base?.country || "";
const now = new Date();
const year = now.getFullYear();
const prevYear = year - 1;

return [{
  json: {
    query1: `${countryEn} top 10 export import products ${prevYear} OR ${year} percentage site:santandertrade.com`,
    query2: `${countryEn} major trading partners ${prevYear} OR ${year} export import share percentage`,
    query3: `${countryEn} exports imports trading partners site:oec.world OR site:wikipedia.org`,
    countryEn,
    code3,
    countryJa
  }
}];
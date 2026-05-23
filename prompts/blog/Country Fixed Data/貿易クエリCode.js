const item = $input.first().json;
const countryEn = item.countryEn || item.base?.countryEn || "";
const code3 = item.code3 || item.base?.code3 || "";
const countryJa = item.countryJa || item.base?.country || "";

return [{
  json: {
    query: `${countryEn} (top exports OR top imports OR "major exports" OR "major imports" OR "trading partners" OR "export partners" OR "import partners") (2023 OR 2024 OR 2025) 
    (OEC OR "Observatory of Economic Complexity" OR TrendEconomy OR "UN Comtrade" OR WITS OR "World Bank" OR Eurostat OR "national statistics" OR IMF)`,
    countryEn,
    code3,
    countryJa
  }
}];
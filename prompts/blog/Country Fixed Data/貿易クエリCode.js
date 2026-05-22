const item = $input.first().json;
const countryEn = item.countryEn || item.base?.countryEn || "";
const code3 = item.code3 || item.base?.code3 || "";
const countryJa = item.countryJa || item.base?.country || "";

return [{
    json: {
        query: `${countryEn} top exports imports trading partners 2024 2025 INDEC OR "World Bank" OR "IMF" trade statistics`,
        countryEn,
        code3,
        countryJa
    }
}];
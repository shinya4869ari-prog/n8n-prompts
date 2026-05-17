const html = $input.first().json.data;
const hasBeer = html.includes('Domestic Beer');
const hasGasoline = html.includes('Gasoline');
console.log("Beer found:", hasBeer, "Gasoline found:", hasGasoline);

function extractPrice(html, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped + '[^<]*<\\/td>\\s*<td[^>]*>\\s*<span class="first_currency">([^<]+)<\\/span>', 'i');
    const match = html.match(regex);
    if (!match) return "欠測";
    return match[1].replace(/[&#\d;]+|[^\d.,]/g, (m) => {
        if (/^[0-9.,]+$/.test(m)) return m;
        return '';
    }).trim() || "欠測";
}

const beer = extractPrice(html, 'Domestic Beer (0.5 liter draught)');
const cigarettes = extractPrice(html, 'Cigarettes 20 Pack (Marlboro)');
const water = extractPrice(html, 'Water (0.33 liter bottle)');
const gasoline = extractPrice(html, 'Gasoline (1 Liter)');
const meal = extractPrice(html, 'Meal, Inexpensive Restaurant');
const utilities = extractPrice(html, 'Basic (Electricity, Heating, Cooling, Water, Garbage) for 85m2 Apartment');
const rent = extractPrice(html, 'Apartment (1 bedroom) in City Centre');
const salary = extractPrice(html, 'Average Monthly Net Salary (After Tax)');

const item = $input.first().json;

return [{
    json: {
        "国名（日本語）": item.country ?? "",
        currencyCode: item.currencyCode ?? "",
        currencySymbol: item.currencySymbol ?? "",
        ビール: beer,
        タバコ: cigarettes,
        水: water,
        ガソリン: gasoline,
        外食: meal,
        光熱費: utilities,
        家賃: rent,
        月収: salary,
    }
}];
const html = $('HTTP Request').first().json.data;
const prev = $('プロンプト取得用 Code').first().json;
const country = prev.country ?? prev.base?.country ?? "";
const currencyCode = prev.currencyCode ?? prev.base?.currencyCode ?? "";
const currencySymbol = prev.currencySymbol ?? prev.base?.currencySymbol ?? "";
const today = new Date().toISOString().split('T')[0];

function extractPrice(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    escaped + '[^<]*<\\/td>\\s*<td[^>]*>\\s*<span class="first_currency">([^<]+)<\\/span>',
    'i'
  );
  const match = html.match(regex);
  if (!match) return "欠測";
  return match[1].replace(/&[^;]+;/g, '').replace(/[^\d.,]/g, '').trim() || "欠測";
}

const beer       = extractPrice(html, 'Domestic Draft Beer (1 Pint)');
const cigarettes = extractPrice(html, 'Cigarettes (Pack of 20, Marlboro)');
const water      = extractPrice(html, 'Bottled Water (50 oz)');
const gasoline   = extractPrice(html, 'Gasoline (1 Liter)');
const meal       = extractPrice(html, 'Meal at an Inexpensive Restaurant');
const utilities  = extractPrice(html, 'Basic Utilities for 915 Square Feet Apartment (Electricity, Heating, Cooling, Water, Garbage)');
const rent       = extractPrice(html, '1 Bedroom Apartment in City Centre');
const salary     = extractPrice(html, 'Average Monthly Net Salary (After Tax)');

return [{
  json: {
    "国名（日本語）": country,
    currencyCode,
    currencySymbol,
    取得日: today,
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
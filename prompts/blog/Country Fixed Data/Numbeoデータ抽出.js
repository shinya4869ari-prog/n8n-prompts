const prev = $('プロンプト取得用 Code').first().json;
const country = prev.country ?? prev.base?.country ?? "";
const currencyCode = prev.currencyCode ?? prev.base?.currencyCode ?? "";
const currencySymbol = prev.currencySymbol ?? prev.base?.currencySymbol ?? "";
const today = new Date().toISOString().split('T')[0];

let html = "";
try {
  html = $input.first().json.data || "";
} catch (e) {
  try {
    html = $('Numbeoデータ抽出').first().json.data || "";
  } catch (err) {
    throw new Error(`Numbeoデータ抽出: HTMLデータの取得に失敗しました。(${err.message})`);
  }
}

if (!html) {
  throw new Error("Numbeoデータ抽出: 取得したHTMLデータが空です。");
}

// 価格セルから実際に使われている通貨記号を抽出して判定
function detectActualCurrency(html, currencyCode) {
  // first_currencyスパンの直前にある通貨記号を取得
  const cellMatch = html.match(/<span class="first_currency">([^<]+)<\/span>/);
  if (!cellMatch) return currencyCode;

  const cellContent = cellMatch[1];

  // EUR記号
  if (cellContent.includes('€') || cellContent.includes('&#8364;') || cellContent.includes('&euro;')) return 'EUR';
  // USD記号（数字のみの場合はUSDの可能性があるが、現地通貨優先）
  if (cellContent.includes('$') || cellContent.includes('&#36;') || cellContent.includes('&dollar;')) return 'USD';
  // GBP記号
  if (cellContent.includes('£') || cellContent.includes('&#163;') || cellContent.includes('&pound;')) return 'GBP';

  // 記号がない or 現地通貨記号 → currencyCodeをそのまま返す
  return currencyCode;
}

const actualCurrencyCode = detectActualCurrency(html, currencyCode);

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

const beer = extractPrice(html, 'Domestic Draft Beer (1 Pint)');
const cigarettes = extractPrice(html, 'Cigarettes (Pack of 20, Marlboro)');
const water = extractPrice(html, 'Bottled Water (50 oz)');
const gasoline = extractPrice(html, 'Gasoline (1 Liter)');
const meal = extractPrice(html, 'Meal at an Inexpensive Restaurant');
const utilities = extractPrice(html, 'Basic Utilities for 915 Square Feet Apartment (Electricity, Heating, Cooling, Water, Garbage)');
const rent = extractPrice(html, '1 Bedroom Apartment in City Centre');
const salary = extractPrice(html, 'Average Monthly Net Salary (After Tax)');

return [{
  json: {
    "国名（日本語）": country,
    currencyCode,
    currencySymbol,
    actualCurrencyCode,
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
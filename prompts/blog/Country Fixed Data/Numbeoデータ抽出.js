const prev = $('プロンプト取得用 Code').first().json;
const country = prev.country ?? prev.base?.country ?? "";
const currencyCode = prev.currencyCode ?? prev.base?.currencyCode ?? "";
const currencySymbol = prev.currencySymbol ?? prev.base?.currencySymbol ?? "";
const today = new Date().toISOString().split('T')[0];

// htmlの取得（直前ノードからの入力または名前指定で安全にフォールバック）
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

// 表示価格に付随する通貨記号から、Numbeoの表示通貨（EUR, USD, GBP, または現地通貨）を判定する
function detectActualCurrency(html, fallbackCode) {
  const checkLabels = [
    'Domestic Draft Beer (1 Pint)',
    'Bottled Water (50 oz)',
    'Gasoline (1 Liter)',
    'Meal at an Inexpensive Restaurant'
  ];
  
  for (const label of checkLabels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      escaped + '[^<]*<\\/td>\\s*<td[^>]*>\\s*<span class="first_currency">([^<]+)<\\/span>',
      'i'
    );
    const match = html.match(regex);
    if (match) {
      const s = match[1];
      if (s.includes('&#8364;') || s.includes('&euro;') || s.includes('€')) return 'EUR';
      if (s.includes('&#36;') || s.includes('&dollar;') || s.includes('$')) return 'USD';
      if (s.includes('&#163;') || s.includes('&pound;') || s.includes('£')) return 'GBP';
      return fallbackCode;
    }
  }
  return fallbackCode;
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
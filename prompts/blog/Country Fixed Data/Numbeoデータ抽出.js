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

if (!html) throw new Error("Numbeoデータ抽出: 取得したHTMLデータが空です。");

function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractPrice(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    escaped + '[^<]*?<\\/td>[\\s\\S]*?<span class="first_currency">([^<]+?)<\\/span>',
    'i'
  );
  const match = html.match(regex);
  if (!match || !match[1]) return "欠測";

  const decoded = decodeEntities(match[1]);
  const numStr = decoded.replace(/[^\d.,]/g, '').trim();
  if (!numStr) return "欠測";

  const hasDot = numStr.includes('.');
  const hasComma = numStr.includes(',');

  let normalized;
  if (hasDot && hasComma) {
    const lastDot = numStr.lastIndexOf('.');
    const lastComma = numStr.lastIndexOf(',');
    if (lastComma > lastDot) {
      normalized = numStr.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = numStr.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    const parts = numStr.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = numStr.replace(',', '.');
    } else {
      normalized = numStr.replace(/,/g, '');
    }
  } else {
    normalized = numStr.replace(/,/g, '');
  }

  return normalized || "欠測";
}

const usdNumbeoCountries = ['AFN', 'IQD', 'SYP', 'YER', 'LYD'];

const actualCurrencyCode = (() => {
  const match = html.match(/<span class="first_currency">([^<]+?)<\/span>/);
  if (!match) return currencyCode;
  const decoded = decodeEntities(match[1]);
  if (decoded.includes('€')) return 'EUR';
  if (decoded.includes('EC$') || decoded.includes('EC ')) return 'XCD';
  if (decoded.includes('£')) return 'GBP';
  if (decoded.includes('$')) return usdNumbeoCountries.includes(currencyCode) ? 'USD' : currencyCode;
  return currencyCode;
})();

return [{
  json: {
    "国名（日本語）": country,
    currencyCode,
    currencySymbol,
    actualCurrencyCode,
    "Numbeo表示通貨": actualCurrencyCode,
    取得日: today,
    ビール: extractPrice(html, 'Domestic Draft Beer (1 Pint)'),
    タバコ: extractPrice(html, 'Cigarettes (Pack of 20, Marlboro)'),
    水: extractPrice(html, 'Bottled Water (50 oz)'),
    ガソリン: extractPrice(html, 'Gasoline (1 Liter)'),
    外食: extractPrice(html, 'Meal at an Inexpensive Restaurant'),
    光熱費: extractPrice(html, 'Basic Utilities for 915 Square Feet Apartment (Electricity, Heating, Cooling, Water, Garbage)'),
    家賃: extractPrice(html, '1 Bedroom Apartment in City Centre'),
    月収: extractPrice(html, 'Average Monthly Net Salary (After Tax)'),
    Netflix: extractPrice(html, 'Netflix (1 month)'),
  }
}];
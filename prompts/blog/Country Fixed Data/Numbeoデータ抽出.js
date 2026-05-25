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

// 通貨記号をよりロバストに検出
function detectActualCurrency(html) {
  const matches = html.match(/<span class="first_currency">([^<]+?)<\/span>/g);
  if (!matches) return currencyCode;
  
  // 最初の価格セルから通貨記号を抽出
  const firstCell = matches[0];
  if (firstCell.includes('EC$') || firstCell.includes('EC &#36;')) return 'XCD';
  if (firstCell.includes('€')) return 'EUR';
  if (firstCell.includes('$') && !firstCell.includes('EC$')) return 'USD';
  if (firstCell.includes('£')) return 'GBP';
  return currencyCode;
}

const actualCurrencyCode = detectActualCurrency(html);

// より柔軟な価格抽出関数（EC$対応強化）
function extractPrice(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // より広いパターンでマッチさせる（通貨記号 + 数字）
  const regex = new RegExp(
    escaped + '[^<]*?<\\/td>\\s*<td[^>]*>\\s*<span class="first_currency">([^<]*?)<\\/span>\\s*([\\d.,]+)',
    'i'
  );
  
  const match = html.match(regex);
  if (!match || !match[2]) return "欠測";
  
  // 数字部分だけ抽出
  let price = match[2].replace(/[^\d.,]/g, '').trim();
  // カンマをドットに統一（必要なら）
  price = price.replace(',', '.');
  
  return price || "欠測";
}

// 抽出実行
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
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

// HTMLエンティティを数値に変換
function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// <span class="first_currency">&#8364;5.00</span> のような構造から数値だけ抽出
function extractPrice(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    escaped + '[^<]*?<\\/td>[\\s\\S]*?<span class="first_currency">([^<]+?)<\\/span>',
    'i'
  );
  const match = html.match(regex);
  if (!match || !match[1]) return "欠測";

  const decoded = decodeEntities(match[1]);
  // 通貨記号・スペースを除去して数値だけ残す
  const numStr = decoded.replace(/[^\d.,]/g, '').trim();
  if (!numStr) return "欠測";

  // カンマが小数点の場合（欧州式）と桁区切りの場合を判別
  // ピリオドとカンマが両方ある → ピリオドが小数点（例: 1,234.56）または カンマが小数点（例: 1.234,56）
  const hasDot = numStr.includes('.');
  const hasComma = numStr.includes(',');

  let normalized;
  if (hasDot && hasComma) {
    // 最後の区切り文字が小数点
    const lastDot = numStr.lastIndexOf('.');
    const lastComma = numStr.lastIndexOf(',');
    if (lastComma > lastDot) {
      // 欧州式: 1.234,56 → 1234.56
      normalized = numStr.replace(/\./g, '').replace(',', '.');
    } else {
      // 英語式: 1,234.56 → 1234.56
      normalized = numStr.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // カンマのみ: 小数点として扱う（例: 8,36 → 8.36）
    // ただし3桁区切りの場合もある（例: 1,234）→ 小数点とみなす
    const parts = numStr.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = numStr.replace(',', '.');
    } else {
      normalized = numStr.replace(/,/g, '');
    }
  } else {
    // ドットのみまたは何もなし
    normalized = numStr.replace(/,/g, '');
  }

  return normalized || "欠測";
}

const actualCurrencyCode = (() => {
  const match = html.match(/<span class="first_currency">([^<]+?)<\/span>/);
  if (!match) return currencyCode;
  const decoded = decodeEntities(match[1]);
  if (decoded.includes('€')) return 'EUR';
  if (decoded.includes('EC$') || decoded.includes('EC ')) return 'XCD';
  if (decoded.includes('$')) return 'USD';
  if (decoded.includes('£')) return 'GBP';
  return currencyCode;
})();

return [{
  json: {
    "国名（日本語）": country,
    currencyCode,
    currencySymbol,
    actualCurrencyCode,
    取得日: today,
    ビール: extractPrice(html, 'Domestic Draft Beer (1 Pint)'),
    タバコ: extractPrice(html, 'Cigarettes (Pack of 20, Marlboro)'),
    水: extractPrice(html, 'Bottled Water (50 oz)'),
    ガソリン: extractPrice(html, 'Gasoline (1 Liter)'),
    外食: extractPrice(html, 'Meal at an Inexpensive Restaurant'),
    光熱費: extractPrice(html, 'Basic Utilities for 915 Square Feet Apartment (Electricity, Heating, Cooling, Water, Garbage)'),
    家賃: extractPrice(html, '1 Bedroom Apartment in City Centre'),
    月収: extractPrice(html, 'Average Monthly Net Salary (After Tax)'),
  }
}];
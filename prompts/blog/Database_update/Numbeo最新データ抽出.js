// Numbeo HTMLデータから最新の日常物価データを抽出するコード

let html = "";
let prevInfo = {};

try {
  const inputJson = $input.first()?.json || {};
  html = inputJson.data || inputJson.html || inputJson.body || "";
  prevInfo = inputJson;
} catch (e) {}

if (!html) {
  try {
    const httpData = $('Numbeoデータ抽出')?.first()?.json || $('HTTP Request（Numbeo）')?.first()?.json || {};
    html = httpData.data || httpData.html || httpData.body || "";
  } catch (err) {}
}

if (!html) {
  throw new Error("Numbeo最新データ抽出: 取得したHTMLデータが空です。HTTP Requestノードが正常に実行されているか確認してください。");
}

function normalizePriceString(numStr) {
  if (!numStr) return "欠測";
  const hasDot = numStr.includes('.');
  const hasComma = numStr.includes(',');
  let normalized;

  if (hasDot && hasComma) {
    if (numStr.lastIndexOf(',') > numStr.lastIndexOf('.')) {
      normalized = numStr.replace(/\./g, '').replace(',', '.'); // 欧州式 (1.234,56 -> 1234.56)
    } else {
      normalized = numStr.replace(/,/g, ''); // 英語式 (1,234.56 -> 1234.56)
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

function extractPrice(htmlContent, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  
  while ((match = trRegex.exec(htmlContent)) !== null) {
    const trContent = match[1];
    const keyRegex = new RegExp(`<td[^>]*>[^<]*?${escaped}[^<]*?<\\/td>`, 'i');
    
    if (keyRegex.test(trContent)) {
      const valMatch = trContent.match(/<span class="first_currency">([^<]+?)<\/span>/i);
      if (valMatch && valMatch[1]) {
        let decoded = valMatch[1]
          .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)))
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

        let numStr = decoded.replace(/[^\d.,]/g, '').trim();
        // 通貨記号等から残った先頭や末尾のドット・カンマを削除
        numStr = numStr.replace(/^[.,]+|[.,]+$/g, '');
        
        if (!numStr) continue;

        return normalizePriceString(numStr);
      }
    }
  }

  return "欠測";
}

// 通貨コードの検出（HTMLから直接確認）
const actualCurrencyCode = (() => {
  const currencyMatch = html.match(/Currency:\s*([A-Z]{3})/i) || html.match(/Prices in\s*([A-Z]{3})/i);
  if (currencyMatch && currencyMatch[1]) {
    return currencyMatch[1].toUpperCase();
  }
  return prevInfo.currencyCode || "";
})();

const today = new Date().toISOString().split('T')[0];

const extractedPrices = {
  "ビール": extractPrice(html, 'Domestic Draft Beer') !== "欠測" ? extractPrice(html, 'Domestic Draft Beer') : extractPrice(html, 'Domestic Beer'),
  "タバコ": extractPrice(html, 'Cigarettes'),
  "水": extractPrice(html, 'Water'),
  "ガソリン": extractPrice(html, 'Gasoline'),
  "外食": extractPrice(html, 'Meal at an Inexpensive') !== "欠測" ? extractPrice(html, 'Meal at an Inexpensive') : extractPrice(html, 'Meal, Inexpensive'),
  "光熱費": extractPrice(html, 'Basic Utilities') !== "欠測" ? extractPrice(html, 'Basic Utilities') : extractPrice(html, 'Basic (Electricity'),
  "家賃1LDK": extractPrice(html, '1 Bedroom') !== "欠測" ? extractPrice(html, '1 Bedroom') : extractPrice(html, 'Apartment (1 bedroom) in City Centre'),
  "月収": extractPrice(html, 'Average Monthly Net Salary'),
  "出典": "Numbeo",
  "取得日": today,
  "通貨コード": actualCurrencyCode
};

return [{
  json: {
    ...prevInfo,
    日常物価: extractedPrices,
    currencyCode: actualCurrencyCode
  }
}];

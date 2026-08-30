// ==========================================
// ブロック1: 前段データとHTMLの受け取り
// ==========================================
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

// ==========================================
// ブロック2: 価格抽出ロジック（部分一致への改良）
// ※英語の表記ブレ（大文字・小文字・スペース）に耐えるように変更
// ==========================================
function normalizePriceString(numStr) {
  const hasDot = numStr.includes('.');
  const hasComma = numStr.includes(',');
  let normalized;

  if (hasDot && hasComma) {
    if (numStr.lastIndexOf(',') > numStr.lastIndexOf('.')) {
      normalized = numStr.replace(/\./g, '').replace(',', '.'); // 欧州式
    } else {
      normalized = numStr.replace(/,/g, ''); // 英語式
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

function extractPrice(html, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  
  while ((match = trRegex.exec(html)) !== null) {
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
        // 通貨記号（例: "Nu."）から残った先頭や末尾のドット・カンマを削除
        numStr = numStr.replace(/^[.,]+|[.,]+$/g, '');
        
        if (!numStr) continue;

        return normalizePriceString(numStr);
      }
    }
  }

  return "欠測";
}

// ==========================================
// ブロック3: 通貨コードの厳格な判定
// ※NumbeoのHTML上部にある「Currency: XXX」という表示から直接抜く
// ==========================================
const actualCurrencyCode = (() => {
  // HTML内から「Currency: EUR」や「Prices in BBD」のような記述をダイレクトに探す
  const currencyMatch = html.match(/Currency:\s*([A-Z]{3})/i) || html.match(/Prices in\s*([A-Z]{3})/i);
  if (currencyMatch && currencyMatch[1]) {
    return currencyMatch[1].toUpperCase();
  }
  
  // 見つからない場合は従来の記号判定（フォールバック）
  const match = html.match(/<span class="first_currency">([^<]+?)<\/span>/);
  if (!match) return currencyCode;
  
  const decoded = match[1];
  if (decoded.includes('€')) return 'EUR';
  if (decoded.includes('₩')) return 'KRW';
  if (decoded.includes('£')) return 'GBP';
  
  // $記号は危険なので、前段のプロンプトで指定された通貨コードを優先する
  return currencyCode;
})();

// ==========================================
// ブロック4: 各項目の抽出（キーワードを少し短くしてブレに対応）
// ==========================================
return [{
  json: {
    "国名（日本語）": country,
    "設定通貨コード": currencyCode,
    "設定通貨記号": currencySymbol,
    "実際の通貨コード": actualCurrencyCode,
    // 互換性維持（英語キー）
    currencyCode: currencyCode,
    currencySymbol: currencySymbol,
    actualCurrencyCode: actualCurrencyCode,
    "取得日": today,
    ビール: extractPrice(html, 'Domestic Draft Beer') !== "欠測" ? extractPrice(html, 'Domestic Draft Beer') : extractPrice(html, 'Domestic Beer'),
    タバコ: extractPrice(html, 'Cigarettes'),
    水: extractPrice(html, 'Water'),
    ガソリン: extractPrice(html, 'Gasoline'),
    外食: extractPrice(html, 'Meal at an Inexpensive') !== "欠測" ? extractPrice(html, 'Meal at an Inexpensive') : extractPrice(html, 'Meal, Inexpensive'),
    光熱費: extractPrice(html, 'Basic Utilities') !== "欠測" ? extractPrice(html, 'Basic Utilities') : extractPrice(html, 'Basic (Electricity'),
    家賃: extractPrice(html, '1 Bedroom Apartment in City Centre') !== "欠測" ? extractPrice(html, '1 Bedroom Apartment in City Centre') : extractPrice(html, '1 Bedroom'),
    月収: extractPrice(html, 'Average Monthly Net Salary'),
  }
}];
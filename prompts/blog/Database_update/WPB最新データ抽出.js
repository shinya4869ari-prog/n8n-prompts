// WPB (World Prison Brief) HTMLデータから最新の刑務所データを抽出するコード

const html = $input.first().json.data; // HTTP Requestノードの生のHTML
const countryEn = $input.first().json.countryEn || "";

// 1. 最新稼働率 (Occupancy level) の抽出
let occupancyVal = "欠測";
let occupancyYear = "欠測";
const occupancyMatch = html.match(/Occupancy level[^<]*<\/th>\s*<td[^>]*>\s*([\d.]+%)\s*<div[^>]*>\s*\(([^)]+)\)/i);
if (occupancyMatch) {
  occupancyVal = occupancyMatch[1].trim();
  const dateStr = occupancyMatch[2];
  const yearMatch = dateStr.match(/\d{4}/);
  occupancyYear = yearMatch ? yearMatch[0] : dateStr.trim();
} else {
  const fallbackOccupancy = html.match(/Occupancy level[^<]*<\/th>\s*<td[^>]*>\s*([\d.]+%)/i);
  if (fallbackOccupancy) occupancyVal = fallbackOccupancy[1].trim();
}

// 2. 最新総収容者数 (Prison population total) の抽出
let totalVal = "欠測";
let totalYear = "欠測";
const totalMatch = html.match(/Prison population total \(including[^<]*<\/th>\s*<td[^>]*>\s*([\d,]+)\s*<div[^>]*>\s*at\s*([^<]+)\s*<\/div>/i);
if (totalMatch) {
  totalVal = totalMatch[1].trim().replace(/,/g, '');
  const dateStr = totalMatch[2];
  const yearMatch = dateStr.match(/\d{4}/);
  totalYear = yearMatch ? yearMatch[0] : dateStr.trim();
} else {
  const fallbackTotal = html.match(/Prison population total \(including[^<]*<\/th>\s*<td[^>]*>\s*([\d,]+)/i);
  if (fallbackTotal) totalVal = fallbackTotal[1].trim().replace(/,/g, '');
}

return [{
  json: {
    "刑務所稼働率": {
      "値": occupancyVal,
      "年": occupancyYear,
      "出典": "World Prison Brief"
    },
    "刑務所総収容者数": {
      "値": totalVal,
      "年": totalYear,
      "出典": "World Prison Brief"
    }
  }
}];

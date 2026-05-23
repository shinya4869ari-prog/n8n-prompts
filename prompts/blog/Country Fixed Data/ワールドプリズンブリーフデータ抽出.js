// WPB (World Prison Brief) HTMLデータから刑務所データを抽出するコード

const html = $input.first().json.data; // HTTP Requestノードの生のHTML
const countryEn = $input.first().json.countryEn || "";

// 1. 最新稼働率 (Occupancy level) の抽出
let occupancyVal = "欠測";
let occupancyYear = "欠測";
// 例: 78.8% (31.1.2025)
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
// 例: 4,394 at March 2026
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

// 3. 過去の収容推移 (Prison population trend) の抽出
let trends = [];
const trendTableMatch = html.match(/Prison population trend[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
if (trendTableMatch) {
  const tbodyHtml = trendTableMatch[1];
  const rowMatches = [...tbodyHtml.matchAll(/<tr>\s*<td[^>]*>\s*<time[^>]*>(\d{4})<\/time>[\s\S]*?<td[^>]*views-field-field-prison-population-total-integer[^>]*>\s*([\d,]+)/gi)];
  
  for (const m of rowMatches) {
    trends.push({
      "年": m[1],
      "総収容者数": m[2].replace(/,/g, '')
    });
  }
}

// 2000年以降のデータをフィルタして昇順ソート
let filteredTrends = trends
  .filter(t => parseInt(t.年) >= 2000)
  .sort((a, b) => parseInt(a.年) - parseInt(b.年));

// 10件を超える場合は均等に間引く（最後の最新値は必ず含める）
if (filteredTrends.length > 10) {
  const last = filteredTrends[filteredTrends.length - 1];
  const rest = filteredTrends.slice(0, -1);
  const result = [];
  const step = rest.length / 9;
  for (let i = 0; i < 9; i++) {
    result.push(rest[Math.floor(i * step)]);
  }
  result.push(last);
  filteredTrends = result;
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
    },
    "収容推移": filteredTrends
  }
}];

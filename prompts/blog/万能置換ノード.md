let prompt = "";
if (typeof $input.first().json.data === 'string') {
  prompt = $input.first().json.data;
} else if (typeof $input.first().json.content === 'string') {
  prompt = $input.first().json.content;
}

const allData = $input.first().json;

// 1. 対象国名の置換
const countryName = allData.対象国 || allData.target_country || allData.country || "不明";
prompt = prompt.replace(/\{\{\s*\$json\.対象国\s*\}\}/g, countryName);

// 2. 英語国名の置換
const countryNameEn = allData.countryEn || "";
prompt = prompt.replace(/\(正式な英語名称\)/g, countryNameEn ? `（${countryNameEn}）` : '');
prompt = prompt.replace(/\{\{\s*\$json\.countryEn\s*\}\}/g, countryNameEn);

// 3. 首都の置換
const capital = allData.data?.対象国データ?.地理?.首都_日本語 || "";
prompt = prompt.replace(/\{\{\s*\$json\.data\.対象国データ\.地理\.首都\s*\}\}/g, capital);

// 4. JSONデータの埋め込み
prompt = prompt.replace(/\{\{\s*JSON\.stringify\(\$json\.data\)\s*\}\}/g, JSON.stringify(allData.data || allData));

// 5. 日付の置換
const now = new Date();
const dateStr = now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
prompt = prompt.replace(/\{\{\s*\$now\.toFormat\(.*?\)\s*\}\}/g, dateStr);

return {
  json: {
    final_prompt: prompt,
    debug_data_received: Object.keys(allData)
  }
};

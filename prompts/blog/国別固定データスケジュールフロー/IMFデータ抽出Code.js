const allItems = $input.all();

const indicatorMap = {
  'NGDPD': 'GDP_USD',
  'NGDP_RPCH': 'GDP成長率',
  'NGDPDPC': '一人当たりGDP_USD',
  'PCPIPCH': 'インフレ率',
  'LUR': '失業率',
  'GGXWDG_NGDP': '政府債務残高_GDP比',
  'BCA_NGDPD': '経常収支_GDP比',
  'LP': '総人口'
};

const result = {};

for (const item of allItems) {
  const indId = item.json['INDICATOR.ID'];
  const key = indicatorMap[indId];
  if (!key) continue;

  const val = item.json['2025'] || item.json['2024'] || item.json['2023'] || '';
  const actualYear = item.json['2025'] ? '2025' : item.json['2024'] ? '2024' : '2023';

  result[key] = val;
  result[key + '_年'] = actualYear;
  result[key + '_出典'] = 'IMF World Economic Outlook April 2026';
}

const base = $('国名変換Code').first().json;

return [{
  json: {
    "国名（日本語）": base.country,
    "国名（英語）": base.countryEn,
    "国コード（ISO）": base.countryCode,
    "code3": base.code3,
    "首都（日本語）": base.capital,
    "物価": {
      "通貨名": base.currency,
      "通貨記号": base.currencySymbol,
      "通貨コード": base.currencyCode
    },
    "isJapan": base.isJapan,
    // --- 経済データ（チェックしやすい順序） ---
    "総人口": result["総人口"],
    "総人口_年": result["総人口_年"],
    "総人口_出典": result["総人口_出典"],
    "GDP_USD": result["GDP_USD"],
    "GDP_USD_年": result["GDP_USD_年"],
    "GDP_USD_出典": result["GDP_USD_出典"],
    "一人当たりGDP_USD": result["一人当たりGDP_USD"],
    "一人当たりGDP_USD_年": result["一人当たりGDP_USD_年"],
    "一人当たりGDP_USD_出典": result["一人当たりGDP_USD_出典"],
    "GDP成長率": result["GDP成長率"],
    "GDP成長率_年": result["GDP成長率_年"],
    "GDP成長率_出典": result["GDP成長率_出典"],
    "政府債務残高_GDP比": result["政府債務残高_GDP比"],
    "政府債務残高_GDP比_年": result["政府債務残高_GDP比_年"],
    "政府債務残高_GDP比_出典": result["政府債務残高_GDP比_出典"],
    "経常収支_GDP比": result["経常収支_GDP比"],
    "経常収支_GDP比_年": result["経常収支_GDP比_年"],
    "経常収支_GDP比_出典": result["経常収支_GDP比_出典"],
    "インフレ率": result["インフレ率"],
    "インフレ率_年": result["インフレ率_年"],
    "インフレ率_出典": result["インフレ率_出典"],
    "失業率": result["失業率"],
    "失業率_年": result["失業率_年"],
    "失業率_出典": result["失業率_出典"]
  }
}];
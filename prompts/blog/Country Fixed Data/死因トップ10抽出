const rows = $input.all().map(i => i.json);
const hub = $('プロンプト取得用 Code').first().json;
const base = hub.base;
const iso3 = base.code3;

const isoRow = rows.find(r => r.row_number === 8);
let countryCol = null;
for (const [key, val] of Object.entries(isoRow || {})) {
  if (val === iso3) {
    countryCol = key;
    break;
  }
}

if (!countryCol) {
  return [{ json: { 死因トップ10: [], 死因_年: "2021", 死因_出典: "WHO GHE 2021" } }];
}

// Persons行のみ、col_6に英単語の死因名がある行だけ抽出
const causeRows = rows.filter(r => {
  const causeName = r.col_6;
  const val = parseFloat(r[countryCol]);
  const isPerson = r.col_1 === 'Persons';
  const isRealCause = causeName && /^[A-Z]/.test(causeName.trim());
  return isPerson && isRealCause && !isNaN(val) && val > 0;
});

// 死亡数降順ソート
causeRows.sort((a, b) => parseFloat(b[countryCol]) - parseFloat(a[countryCol]));

// 英語→日本語変換
const causeJaMap = {
  'Tuberculosis': '結核',
  'HIV/AIDS': 'HIV/エイズ',
  'Diarrhoeal diseases': '下痢性疾患',
  'Whooping cough': '百日咳',
  'Diphtheria': 'ジフテリア',
  'Measles': '麻疹',
  'Tetanus': '破傷風',
  'Meningitis': '髄膜炎',
  'Encephalitis': '脳炎',
  'Acute hepatitis B': 'B型急性肝炎',
  'Acute hepatitis C': 'C型急性肝炎',
  'Malaria': 'マラリア',
  'Lower respiratory infections': '下気道感染症',
  'Upper respiratory infections': '上気道感染症',
  'COVID-19': '新型コロナウイルス感染症（COVID-19）',
  'Ischaemic heart disease': '虚血性心疾患',
  'Stroke': '脳卒中',
  'Hypertensive heart disease': '高血圧性心疾患',
  'Cardiomyopathy': '心筋症',
  'Aortic aneurysm': '大動脈瘤',
  'Chronic obstructive pulmonary disease': '慢性閉塞性肺疾患',
  'Asthma': '喘息',
  'Diabetes mellitus': '糖尿病',
  'Alzheimer disease and other dementias': 'アルツハイマー病およびその他の認知症',
  "Parkinson's disease": 'パーキンソン病',
  'Epilepsy': 'てんかん',
  'Cirrhosis of the liver': '肝硬変',
  'Kidney diseases': '腎臓疾患',
  'Colon and rectum cancers': '結腸・直腸がん',
  'Trachea, bronchus, lung cancers': '気管・気管支・肺がん',
  'Stomach cancer': '胃がん',
  'Liver cancer': '肝臓がん',
  'Breast cancer': '乳がん',
  'Oesophageal cancer': '食道がん',
  'Leukaemia': '白血病',
  'Pancreas cancer': '膵臓がん',
  'Prostate cancer': '前立腺がん',
  'Cervix uteri cancer': '子宮頸がん',
  'Bladder cancer': '膀胱がん',
  'Ovary cancer': '卵巣がん',
  'Road injury': '交通事故',
  'Poisonings': '中毒',
  'Falls': '転倒・転落',
  'Drowning': '溺水',
  'Burns': '熱傷・火災',
  'Self-harm': '自傷行為（自殺）',
  'Interpersonal violence': '対人暴力',
  'Nutritional deficiencies': '栄養不足',
  'Other circulatory diseases': 'その他の循環器疾患',
};

const top10en = causeRows.slice(0, 10).map(r => r.col_6);
const top10ja = top10en.map(en => {
  for (const [key, val] of Object.entries(causeJaMap)) {
    if (en && en.includes(key)) return val;
  }
  return en;
});

return [{
  json: {
    死因トップ10: top10ja,
    死因トップ10_英語: top10en,
    死因_年: "2021",
    死因_出典: "WHO GHE 2021"
  }
}];
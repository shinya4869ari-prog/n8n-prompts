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
  // 感染症
  'Tuberculosis': '結核',
  'HIV/AIDS': 'HIV/エイズ',
  'Diarrhoeal diseases': '下痢性疾患',
  'Childhood-cluster diseases': '主な小児感染症',
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
  'Sexually transmitted diseases': '性感染症',
  'Syphilis': '梅毒',
  'Gonorrhoea': '淋病',
  'Chlamydia': 'クラミジア感染症',
  'Trichomoniasis': 'トリコモナス症',
  'Leishmaniasis': 'リーシュマニア症',
  'Trypanosomiasis': 'トリパノソーマ症',
  'Schistosomiasis': '住血吸虫症',
  'Intestinal nematode infections': '腸管線虫症',
  'Lymphatic filariasis': 'リンパ系フィラリア症',
  'Onchocerciasis': 'オンコセルカ症',
  'Leprosy': 'ハンセン病',
  'Dengue': 'デング熱',
  'Yellow fever': '黄熱',
  'Ebola': 'エボラ出血熱',
  'Rabies': '狂犬病',
  'Typhoid fever': '腸チフス',
  'Cholera': 'コレラ',
  // 循環器
  'Ischaemic heart disease': '虚血性心疾患',
  'Stroke': '脳卒中',
  'Hypertensive heart disease': '高血圧性心疾患',
  'Cardiomyopathy': '心筋症',
  'Aortic aneurysm': '大動脈瘤',
  'Other circulatory diseases': 'その他の循環器疾患',
  'Atrial fibrillation and flutter': '心房細動・粗動',
  'Peripheral vascular disease': '末梢血管疾患',
  // 呼吸器
  'Chronic obstructive pulmonary disease': '慢性閉塞性肺疾患',
  'Asthma': '喘息',
  'Pneumoconiosis': '塵肺',
  // 代謝・内分泌
  'Diabetes mellitus': '糖尿病',
  'Nutritional deficiencies': '栄養不足',
  'Protein-energy malnutrition': 'たんぱく質・エネルギー栄養失調',
  'Vitamin A deficiency': 'ビタミンA欠乏症',
  // 神経
  'Alzheimer disease and other dementias': 'アルツハイマー病およびその他の認知症',
  "Parkinson's disease": 'パーキンソン病',
  'Epilepsy': 'てんかん',
  'Multiple sclerosis': '多発性硬化症',
  // 消化器
  'Cirrhosis of the liver': '肝硬変',
  'Kidney diseases': '腎臓疾患',
  // がん
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
  'Brain and nervous system cancers': '脳・神経系がん',
  'Lymphomas, multiple myeloma': 'リンパ腫・多発性骨髄腫',
  'Lip and oral cavity cancer': '口唇・口腔がん',
  'Nasopharynx cancer': '上咽頭がん',
  'Other pharynx cancer': 'その他咽頭がん',
  'Gallbladder and biliary tract cancer': '胆嚢・胆管がん',
  'Larynx cancer': '喉頭がん',
  'Thyroid cancer': '甲状腺がん',
  'Melanoma and other skin cancers': '黒色腫およびその他の皮膚がん',
  'Non-melanoma skin cancer': '非黒色腫皮膚がん',
  'Uterine cancer': '子宮体がん',
  'Kidney cancer': '腎臓がん',
  // 外因・傷害
  'Road injury': '交通事故',
  'Poisonings': '中毒',
  'Falls': '転倒・転落',
  'Drowning': '溺水',
  'Burns': '熱傷・火災',
  'Self-harm': '自傷行為（自殺）',
  'Interpersonal violence': '対人暴力',
  'Collective violence and legal intervention': '集団的暴力・司法介入',
  'Natural disasters': '自然災害',
  // 新生児・母体
  'Neonatal conditions': '新生児疾患',
  'Preterm birth complications': '早産合併症',
  'Preterm birth': '早産合併症',
  'Birth asphyxia and birth trauma': '出生時仮死・出生外傷',
  'Birth asphyxia': '出生時仮死',
  'Neonatal sepsis and infections': '新生児敗血症・感染症',
  'Maternal conditions': '母体疾患',
  // その他
  'Congenital anomalies': '先天性奇形',
  'Other non-communicable diseases': 'その他の非感染性疾患',
};

const top10en = causeRows.slice(0, 10).map(r => r.col_6);
const top10ja = top10en.map(en => {
  for (const [key, val] of Object.entries(causeJaMap)) {
    if (en && en.includes(key)) return val;
  }
  return en ? `【未翻訳: ${en}】` : "";
});

return [{
  json: {
    死因トップ10: top10ja,
    死因トップ10_英語: top10en,
    死因_年: "2021",
    死因_出典: "WHO GHE 2021"
  }
}];
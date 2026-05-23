// WPB (World Prison Brief) の国別URLを生成するコード

let countryEn = "";
try {
  countryEn = $('country-master-lookup').first().json.countryEn;
} catch (e) {
  try {
    countryEn = $('項目検出・国別マージ').first().json.countryEn;
  } catch (err) {
    countryEn = $input.first().json.countryEn || $input.first().json.rowData?.["国名（英語）"] || "";
  }
}

if (!countryEn) {
  throw new Error("英語の国名が取得できませんでした。");
}

// 例外的な国名スラグのマッピング
const wpbSlugMap = {
  "united-states": "united-states-america",
  "republic-of-korea": "republic-south-korea",
  "korea,-south": "republic-south-korea",
  "south-korea": "republic-south-korea",
  "russia": "russian-federation",
  "russian-federation": "russian-federation",
  "cote-d'ivoire": "cote-divoire",
  "cote-divoire": "cote-divoire",
  "congo,-democratic-republic-of-the": "democratic-republic-congo",
  "democratic-republic-of-the-congo": "democratic-republic-congo",
  "democratic-republic-congo": "democratic-republic-congo",
  "congo,-republic-of": "congo-republic",
  "republic-of-the-congo": "congo-republic",
  "congo-republic": "congo-republic",
  "cape-verde": "cape-verde-cabo-verde",
  "eswatini": "eswatiniswaziland",
  "swaziland": "eswatiniswaziland",
  "czech-republic": "czech-republic",
  "united-kingdom": "united-kingdom-england-wales",
  "moldova": "moldova-republic",
  "myanmar": "myanmar-formerly-burma",
  "north-korea": "democratic-peoples-republic-north-korea",
  "brunei": "brunei-darussalam",
  "micronesia": "micronesia-federated-states",
  "bosnia-and-herzegovina": "bosnia-herzegovina-federation",
  "timor-leste": "timor-leste-formerly-east-timor",
  "antigua-and-barbuda": "antigua-barbuda",
  "congo": "congo-republic",
  "cyprus": "cyprus-republic",
  "guinea": "guinea-republic",
  "ireland": "ireland-republic",
  "saint-kitts-and-nevis": "st-kitts-nevis",
  "saint-vincent-and-the-grenadines": "st-vincent-grenadines",
  "saint-lucia": "st-lucia"
};

let slug = countryEn.toLowerCase()
  .replace(/[^a-z0-9\s-]/g, '') // 記号（アポストロフィなど）の除去
  .replace(/\s+/g, '-');        // 空白をハイフンに

if (wpbSlugMap[slug]) {
  slug = wpbSlugMap[slug];
}

// パース用Codeノードに国名を引き継ぐため、countryEnも一緒に返す
return [{
  json: {
    url: `https://www.prisonstudies.org/country/${slug}`,
    countryEn: countryEn
  }
}];

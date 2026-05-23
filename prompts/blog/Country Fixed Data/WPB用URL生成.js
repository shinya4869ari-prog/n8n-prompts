// WPB (World Prison Brief) の国別URLを生成するコード

const countryEn = $input.first().json.countryEn || $input.first().json.rowData?.["国名（英語）"] || "";
if (!countryEn) {
  throw new Error("英語の国名が取得できませんでした。");
}

// 例外的な国名スラグのマッピング
const wpbSlugMap = {
  "united-states": "united-states-america",
  "republic-of-korea": "republic-korea",
  "korea,-south": "republic-korea",
  "south-korea": "republic-korea",
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
  "cape-verde": "cabo-verde",
  "eswatini": "eswatini-formerly-swaziland",
  "swaziland": "eswatini-formerly-swaziland",
  "czech-republic": "czech-republic-czechia"
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

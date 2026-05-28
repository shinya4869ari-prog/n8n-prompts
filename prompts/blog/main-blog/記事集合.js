const main = $('整形2').first().json.article ?? '';
const deep = $('整形3').first().json.article ?? '';
const country = $('整形2').first().json.country ?? $('整形ノード1').first().json.country ?? '';
return [{
  json: {
    article: main,
    deepDiveArticle: deep,
    country: country
  }
}];
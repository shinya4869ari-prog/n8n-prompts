const main = $('整形2_jp').first().json.article ?? '';
const deep = $('整形3_jp').first().json.article ?? '';
const country = $('整形2_jp').first().json.対象国 ?? '';

return [{
  json: {
    article: main + '\n\n' + deep,
    country: country
  }
}];
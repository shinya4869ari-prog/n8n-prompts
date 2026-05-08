const main = $('整形2').first().json.article ?? '';
const deep = $('整形3').first().json.article ?? '';
const country = $('整形2').first().json.対象国 ?? '';

return [{
  json: {
    article: main + '\n\n' + deep,
    country: country
  }
}];
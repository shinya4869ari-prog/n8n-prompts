const main = $('整形2').first().json.article ?? '';
const deep = $('整形3').first().json.article ?? '';

return [{
  json: {
    article: main + '\n\n' + deep
  }
}];

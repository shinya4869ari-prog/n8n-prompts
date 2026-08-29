let main = '';
let deep = '';
let country = '日本';

try {
  main = $('整形2_jp').first()?.json?.article ?? $('整形2').first()?.json?.article ?? '';
} catch (e) {}

try {
  deep = $('整形3_jp').first()?.json?.article ?? $('整形3').first()?.json?.article ?? '';
} catch (e) {}

try {
  country = $('整形2_jp').first()?.json?.対象国 ?? $('整形2').first()?.json?.対象国 ?? '日本';
} catch (e) {}

return [{
  json: {
    article: (main + '\n\n' + deep).trim(),
    country: country
  }
}];
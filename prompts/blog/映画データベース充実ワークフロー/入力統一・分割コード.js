const inputData = $input.first()?.json || {};
const allInputs = $input.all() || [];

let items = [];
const countryMapping = {
  'KR': { code: 'KR', lang: 'ko' },
  '韓国': { code: 'KR', lang: 'ko' },
  'JP': { code: 'JP', lang: 'ja' },
  '日本': { code: 'JP', lang: 'ja' },
  'US': { code: 'US', lang: 'en' },
  'アメリカ': { code: 'US', lang: 'en' },
};

// パターン1: すでに複数のアイテム（配列）としてn8nに直接渡ってきている場合
// (Webhookや手動トリガーでJSON配列を直接入力オブジェクトとして入力した場合など)
const firstJson = allInputs[0]?.json || {};
if (allInputs.length > 1 || (firstJson.title && !firstJson.titles && allInputs.length === 1 && typeof firstJson.title === 'string' && !firstJson.title.trim().startsWith('['))) {
  items = allInputs.map(item => {
    const movie = item.json || {};
    const inputCountry = movie.country || null;
    const countryInfo = inputCountry ? (countryMapping[inputCountry] || { code: inputCountry.toUpperCase(), lang: null }) : { code: null, lang: null };
    return {
      title: movie.title,
      origin_title: movie.original_title || movie.origin_title || null,
      year: movie.year || (movie.release_date ? movie.release_date.substring(0, 4) : null) || null,
      target_country: countryInfo.code,
      target_lang: countryInfo.lang,
      tmdb_id: movie.tmdb_id || movie.tmdb || null
    };
  }).filter(item => item.title);
}

// パターン2: 文字列としての入力からJSON配列を探してパースする
if (items.length === 0) {
  // inputData の中から最初に見つかった JSON 配列文字列を探す
  let jsonStr = "";
  for (const key in inputData) {
    if (typeof inputData[key] === 'string' && inputData[key].trim().startsWith('[')) {
      jsonStr = inputData[key].trim();
      break;
    }
  }

  if (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        items = parsed.map(movie => {
          const inputCountry = movie.country || inputData.country || null;
          const countryInfo = inputCountry ? (countryMapping[inputCountry] || { code: inputCountry.toUpperCase(), lang: null }) : { code: null, lang: null };
          return {
            title: movie.title,
            origin_title: movie.original_title || movie.origin_title || null,
            year: movie.year || (movie.release_date ? movie.release_date.substring(0, 4) : null) || null,
            target_country: countryInfo.code,
            target_lang: countryInfo.lang,
            tmdb_id: movie.tmdb_id || movie.tmdb || null
          };
        });
      }
    } catch (e) {
      // パース失敗時はスルー
    }
  }
}

// パターン3: 通常のテキスト（改行区切り）
if (items.length === 0) {
  // titles, title, または最初に見つかった文字列カラムを使用
  let text = "";
  if (inputData.titles) text = inputData.titles;
  else if (inputData.title) text = inputData.title;
  else {
    for (const key in inputData) {
      if (typeof inputData[key] === 'string' && inputData[key].trim().length > 0) {
        text = inputData[key];
        break;
      }
    }
  }

  const inputCountry = inputData.country || null;
  const countryInfo = inputCountry ? (countryMapping[inputCountry] || { code: inputCountry.toUpperCase(), lang: null }) : { code: null, lang: null };
  const titles = text.split('\n').map(t => t.trim()).filter(t => t.length > 0);
  items = titles.map(title => ({
    title,
    origin_title: inputData.origin_title || null,
    year: inputData.year || (inputData.release_date ? inputData.release_date.substring(0, 4) : null) || null,
    target_country: countryInfo.code,
    target_lang: countryInfo.lang,
    tmdb_id: inputData.tmdb_id || null
  }));
}

// n8nのループ用に出力
return items.map(item => ({ json: item }));



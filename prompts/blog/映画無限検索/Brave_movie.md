{{
  (() => {
    const tmdb = $('TMDb検索').first().json;
    let sourceData = {};
    try {
      sourceData = $('Loop Over Items').item?.json || {};
    } catch(e) {
      try {
        sourceData = $('Loop Over Items1').item?.json || {};
      } catch(e2) {
        try {
          sourceData = $('映画ごとにループ実行').item?.json || {};
        } catch(e3) {
          sourceData = $input.item?.json || {};
        }
      }
    }
    const resultsList = tmdb.results || tmdb.movie_results || (tmdb.id ? [tmdb] : []);
    let result = resultsList.length > 0 ? resultsList.find(m => 
      (m.original_language === sourceData.target_lang) || 
      (m.origin_country && m.origin_country.includes(sourceData.target_country))
    ) : null;
    
    if (!result && resultsList.length > 0) {
      result = resultsList[0];
    }
    
    const inputTitle = sourceData.title;
    const officialTitle = result?.title;
    const isPureDigits = inputTitle && String(inputTitle).split('').every(c => '0123456789'.includes(c));
    const resolvedTitle = (isPureDigits ? null : inputTitle) || officialTitle || '';
    
    const originalTitle = result?.original_title || '';
    
    // タイトルとオリジナルタイトルが同じ、あるいはオリジナルタイトルが無い場合は重複を避ける
    if (!originalTitle || originalTitle.toLowerCase() === resolvedTitle.toLowerCase()) {
      return `${resolvedTitle} あらすじ`;
    }
    
    return `${resolvedTitle} ${originalTitle} あらすじ`;
  })()
}}

{{
  (() => {
    let tmdb = {};
    let sourceData = {};
    try {
      tmdb = $('TMDb検索').first().json;
    } catch(e) {
      try {
        tmdb = $('Get TMDb Details').first().json;
      } catch(e2) {}
    }
    try {
      sourceData = $('Loop Over Items').item.json;
    } catch(e) {
      try {
        sourceData = $('Loop Over Items1').item.json;
      } catch(e2) {
        sourceData = $json;
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
    const resolvedTitle = (/^\d+$/.test(inputTitle || '') ? null : inputTitle) || officialTitle || '';
    
    const originalTitle = result?.original_title || '';
    
    // タイトルとオリジナルタイトルが同じ、あるいはオリジナルタイトルが無い場合は重複を避ける。末尾に 'youtube' を足すことでBraveから動画リンクをより確実に取得します。
    if (!originalTitle || originalTitle.toLowerCase() === resolvedTitle.toLowerCase()) {
      return `${resolvedTitle} 予告編 youtube`;
    }
    
    return `${resolvedTitle} ${originalTitle} 予告編 youtube`;
  })()
}}

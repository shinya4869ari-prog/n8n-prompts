{{
  (() => {
    const tmdb = $('TMDb検索').first().json;
    const sourceData = $('Loop Over Items').first().json;
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
    
    // タイトルとオリジナルタイトルが同じ、あるいはオリジナルタイトルが無い場合は重複を避ける
    if (!originalTitle || originalTitle.toLowerCase() === resolvedTitle.toLowerCase()) {
      return `${resolvedTitle} あらすじ`;
    }
    
    return `${resolvedTitle} ${originalTitle} あらすじ`;
  })()
}}

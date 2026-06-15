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
    
    // 日本語の映画情報や、漢字表記、邦題情報を引っ掛けるためのクエリを生成
    const queryParts = [];
    if (resolvedTitle) queryParts.push(`"${resolvedTitle}"`);
    if (originalTitle && originalTitle !== resolvedTitle) queryParts.push(`"${originalTitle}"`);
    
    return `${queryParts.join(' ')} (映画 OR 邦題 OR 日本語タイトル OR 漢字)`;
  })()
}}

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
    const resolvedTitle = (/^\d+$/.test(inputTitle || '') ? null : inputTitle) || officialTitle || '';
    
    const originalTitle = result?.original_title || '';
    
    // あらすじ・ストーリー情報を確実に取得するためのクエリを生成
    const queryParts = [];
    if (resolvedTitle) queryParts.push(`"${resolvedTitle}"`);
    if (originalTitle && originalTitle !== resolvedTitle) queryParts.push(`"${originalTitle}"`);
    
    return `${queryParts.join(' ')} あらすじ`;
  })()
}}

{{
  (() => {
    let tmdb = {};
    try { tmdb = $('TMDb検索').first()?.json || {}; } catch(e){}
    
    let sourceData = {};
    const nodeNames = ['入力統一・分割コード', 'On form submission1'];
    for (const name of nodeNames) {
      try {
        const d = $(name).first()?.json || $(name).item?.json;
        if (d && (d.title || d.origin_title || d.query)) {
          sourceData = d;
          break;
        }
      } catch(e) {}
    }
    if (!sourceData.title && !sourceData.origin_title) {
      sourceData = $input.first()?.json || {};
    }

    const resultsList = tmdb.results || tmdb.movie_results || tmdb.tv_results || (tmdb.id ? [tmdb] : []);
    let result = resultsList.length > 0 ? resultsList.find(m => 
      (m.original_language === sourceData.target_lang) || 
      (m.origin_country && m.origin_country.includes(sourceData.target_country))
    ) : null;
    
    if (!result && resultsList.length > 0) {
      result = resultsList[0];
    }
    
    const inputTitle = sourceData.title;
    const officialTitle = result?.title || result?.name;
    const resolvedTitle = (/^\d+$/.test(inputTitle || '') ? null : inputTitle) || officialTitle || '';
    
    const originalTitle = result?.original_title || result?.original_name || '';
    
    const queryParts = [];
    if (resolvedTitle) queryParts.push(`"${resolvedTitle}"`);
    if (originalTitle && originalTitle !== resolvedTitle) queryParts.push(`"${originalTitle}"`);
    
    return `${queryParts.join(' ')} (映画 OR ドラマ OR あらすじ OR 邦題)`;
  })()
}}

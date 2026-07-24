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
    const tmdbEnTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title || '';
    
    // 監督名を取得して検索精度を向上
    let directorName = '';
    try {
      const credits = $('TMDb credits取得').first().json;
      const dirObj = credits?.crew?.find(c => c.job === 'Director');
      if (dirObj?.name) directorName = dirObj.name;
    } catch(e) {}

    const queryParts = [resolvedTitle, originalTitle, tmdbEnTitle, directorName].filter(Boolean);
    const uniqueParts = Array.from(new Set(queryParts.map(p => p.trim()).filter(p => p.length > 0)));
    
    // タイトルに日本語が含まれているかチェック
    const isJapaneseTitle = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(resolvedTitle);
    
    // 日本語タイトルの場合は「予告編」を入れ、英語タイトルの場合は「trailer」に絞って検索ノイズを防ぐ
    const trailerKeyword = isJapaneseTitle ? '予告編 trailer youtube' : 'trailer movie youtube';
    
    return `${uniqueParts.join(' ')} ${trailerKeyword}`;
  })()
}}

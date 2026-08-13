https://api.themoviedb.org/3/{{
  (() => {
    // 1. 直前のノードから直接 id と media_type がある場合
    if ($json.id) {
      const type = $json.media_type || ($json.name ? 'tv' : 'movie');
      return `${type}/${$json.id}`;
    }

    const results = $json.results || $json.movie_results || $json.tv_results || [];
    if (results.length === 0) return 'movie/0';
    
    // 入力データの取得（ノード名のフォールバック対応）
    let sourceNode = {};
    try { sourceNode = $('映画ごとにループ実行').item?.json || {}; } catch(e) {
      try { sourceNode = $('Loop Over Items').item?.json || {}; } catch(e2) {
        sourceNode = $input.item?.json || {};
      }
    }
    const targetTitle = (sourceNode.origin_title || sourceNode.title || '').toLowerCase().trim();
    const targetYear = parseInt(sourceNode.year);
    
    let bestMatch = results[0];
    let bestScore = -Infinity;
    
    for (const movie of results) {
      let score = 0;
      // 💡 映画なら title / ドラマなら name
      const movieTitle = (movie.title || movie.name || '').toLowerCase().trim();
      const movieOrigTitle = (movie.original_title || movie.original_name || '').toLowerCase().trim();
      
      // ①タイトルが完全一致すれば高得点
      if (movieTitle === targetTitle || movieOrigTitle === targetTitle) {
        score += 100;
      } else if (movieTitle.includes(targetTitle) || movieOrigTitle.includes(targetTitle)) {
        score += 50;
      }
      
      // ②公開年/放送年が近ければ加点（映画: release_date / ドラマ: first_air_date）
      const rDate = movie.release_date || movie.first_air_date;
      if (targetYear && rDate) {
        const releaseYear = parseInt(rDate.substring(0, 4));
        if (releaseYear) {
          const diff = Math.abs(releaseYear - targetYear);
          score += Math.max(0, 50 - diff * 10);
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = movie;
      }
    }
    
    // 💡 映画なら 'movie/ID'、ドラマなら 'tv/ID' を動的に返す
    const mediaType = bestMatch.media_type || (bestMatch.name && !bestMatch.title ? 'tv' : 'movie');
    return `${mediaType}/${bestMatch.id}`;
  })()
}}/credits

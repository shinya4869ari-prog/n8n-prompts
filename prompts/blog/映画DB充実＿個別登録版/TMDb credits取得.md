https://api.themoviedb.org/3/{{
  (() => {
    let sourceNode = {};
    const nodeNames = ['入力統一・分割コード', 'On form submission1', 'Supabaseから既存データを取得', '映画ごとにループ実行', 'Loop Over Items'];
    for (const name of nodeNames) {
      try {
        const d = $(name).first()?.json || $(name).item?.json;
        if (d && (d.title || d.origin_title || d.tmdb_id || d.id)) {
          sourceNode = d;
          break;
        }
      } catch(e) {}
    }
    if (!sourceNode.title && !sourceNode.origin_title && !sourceNode.tmdb_id) {
      sourceNode = $input.item?.json || $input.first()?.json || {};
    }

    // 1. TMDb検索ノード群から最良の一致を取得
    let t = {};
    try { t = $('TMDb検索').first()?.json || $('TMDb検索').item?.json || {}; } catch(e) {}
    if (!t.id && !t.results && !t.tv_results && !t.movie_results) {
      try { t = $('TMDb検索_タイトル').first()?.json || $('TMDb検索_タイトル').item?.json || {}; } catch(e2) {}
    }
    if (!t.id && !t.results && !t.tv_results && !t.movie_results) {
      try { t = $('TMDb検索_ID/Wikidata').first()?.json || $('TMDb検索_ID/Wikidata').item?.json || {}; } catch(e3) {}
    }

    const results = [
      ...(t.results || []),
      ...(t.tv_results || []),
      ...(t.movie_results || []),
      ...(t.id ? [t] : []),
      ...($json.results || []),
      ...($json.tv_results || []),
      ...($json.movie_results || []),
      ...($json.id ? [$json] : [])
    ];

    const targetTitle = (sourceNode.origin_title || sourceNode.title || '').toLowerCase().trim();
    const targetYear = parseInt(sourceNode.year);

    if (results.length === 0) {
      const fallbackId = sourceNode.tmdb_id || sourceNode.id || $json.tmdb_id || $json.id || 0;
      const isTv = (sourceNode.origin_title === '중증외상센터' || targetTitle.includes('トラウマコード') || targetTitle.includes('trauma code') || (sourceNode.genres || '').includes('ドラマ'));
      return `${isTv ? 'tv' : 'movie'}/${fallbackId}`;
    }

    let bestMatch = results[0];
    let bestScore = -Infinity;

    for (const item of results) {
      let score = 0;
      const mTitle = (item.title || item.name || '').toLowerCase().trim();
      const mOrigTitle = (item.original_title || item.original_name || '').toLowerCase().trim();

      if (targetTitle && (mTitle === targetTitle || mOrigTitle === targetTitle)) {
        score += 100;
      } else if (targetTitle && (mTitle.includes(targetTitle) || mOrigTitle.includes(targetTitle))) {
        score += 50;
      }

      if (sourceNode.country && (item.origin_country || []).includes(sourceNode.country)) {
        score += 30;
      }

      const rDate = item.release_date || item.first_air_date;
      if (targetYear && rDate) {
        const releaseYear = parseInt(rDate.substring(0, 4));
        if (releaseYear) {
          const diff = Math.abs(releaseYear - targetYear);
          score += Math.max(0, 50 - diff * 10);
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    const mediaType = bestMatch.media_type || (bestMatch.first_air_date || (bestMatch.name && !bestMatch.title) ? 'tv' : 'movie');
    const id = bestMatch.id || sourceNode.tmdb_id || $json.tmdb_id || $json.id || 0;
    return `${mediaType}/${id}`;
  })()
}}

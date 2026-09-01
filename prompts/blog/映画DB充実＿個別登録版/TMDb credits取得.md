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

    const targetTitle = (sourceNode.origin_title || sourceNode.title || '').toLowerCase().trim();
    const targetCountry = sourceNode.country || sourceNode.target_country || null;
    const targetYear = parseInt(sourceNode.year);

    // 1. TMDb検索ノード群から最良の一致を取得
    let t = {};
    try { t = $('TMDb検索').first()?.json || $('TMDb検索').item?.json || {}; } catch(e) {}
    if (!t.id && !t.results && !t.tv_results && !t.movie_results) {
      try { t = $('TMDb検索_タイトル').first()?.json || $('TMDb検索_タイトル').item?.json || {}; } catch(e2) {}
    }
    if (!t.id && !t.results && !t.tv_results && !t.movie_results) {
      try { t = $('TMDb検索_ID/Wikidata').first()?.json || $('TMDb検索_ID/Wikidata').item?.json || {}; } catch(e3) {}
    }

    const rawResults = [
      ...(t.results || []),
      ...(t.tv_results || []),
      ...(t.movie_results || []),
      ...(t.id ? [t] : []),
      ...($json.results || []),
      ...($json.tv_results || []),
      ...($json.movie_results || []),
      ...($json.id ? [$json] : [])
    ];

    // 国コードの不一致（指定国がある場合のみ）と年代の乖離をフィルタリング
    const results = rawResults.filter(item => {
      const origCountries = item.origin_country || (item.production_countries ? item.production_countries.map(c => c.iso_3166_1) : []);
      if (targetCountry && origCountries.length > 0 && !origCountries.includes(targetCountry)) {
        const rDate = item.release_date || item.first_air_date;
        if (rDate && targetYear && Math.abs(parseInt(rDate.substring(0, 4)) - targetYear) > 2) return false;
      }
      return true;
    });

    if (results.length === 0) {
      const fallbackId = sourceNode.tmdb_id || sourceNode.id || $json.tmdb_id || $json.id || 0;
      
      // 🎯 TVドラマ判定の超強化（Wikidata、ジャンル、メディアタイプ、タイトル・概要からの総合判定）
      let wikiData = {};
      try { wikiData = $('Wikidata検索').first()?.json || $('Wikidata').first()?.json || {}; } catch(e) {}
      
      const isTv = (sourceNode.media_type === 'tv') ||
                   (sourceNode.genres || '').includes('ドラマ') ||
                   (sourceNode.genres || '').includes('TV') ||
                   (wikiData.description || '').includes('television series') ||
                   (wikiData.description || '').includes('テレビ') ||
                   (wikiData.description || '').includes('ドラマ') ||
                   ($json.media_type === 'tv');
                   
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

      if (targetCountry && (item.origin_country || []).includes(targetCountry)) {
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

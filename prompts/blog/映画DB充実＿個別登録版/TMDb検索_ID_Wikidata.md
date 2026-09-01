https://api.themoviedb.org/3/{{
  (() => {
    let sourceNode = {};
    const nodeNames = ['入力統一・分割コード', 'On form submission1', 'Supabaseから既存データを取得'];
    for (const name of nodeNames) {
      try {
        const d = $(name).first()?.json || $(name).item?.json;
        if (d && (d.title || d.origin_title || d.tmdb_id)) {
          sourceNode = d;
          break;
        }
      } catch(e) {}
    }
    if (!sourceNode.title && !sourceNode.origin_title && !sourceNode.tmdb_id) {
      sourceNode = $input.item?.json || $input.first()?.json || {};
    }

    const searchList = $json.search || $json.query?.search || [];
    const targetKeywords = [
      sourceNode.origin_title,
      sourceNode.title,
      sourceNode.query
    ].filter(Boolean).map(s => String(s).toLowerCase().trim());

    let selectedQid = null;

    if (Array.isArray(searchList) && searchList.length > 0) {
      let bestItem = searchList[0]; // 🎯 デフォルトは最上位の検索結果を採用（末尾誤爆を完全防止！）
      let maxScore = 0;

      for (const item of searchList) {
        let score = 0;
        const snip = (item.snippet || '').toLowerCase();
        
        for (const kw of targetKeywords) {
          if (kw && kw.length >= 2 && snip.includes(kw)) {
            score += 20;
          }
        }

        // 韓国・日本の作品であるキーワードが含まれていれば加点
        if (/korea|韓国|한국|drama|드라마|television|series/i.test(snip)) {
          score += 10;
        }

        if (score > maxScore) {
          maxScore = score;
          bestItem = item;
        }
      }

      selectedQid = bestItem?.title || searchList[0]?.title;
    }

    const qid = selectedQid || $json.qid || sourceNode.wikidata_id || sourceNode.qid;
    if (qid && /^Q\d+$/.test(qid)) {
      return `find/${qid}`;
    }

    const tmdbId = sourceNode.tmdb_id || $json.tmdb_id || sourceNode.id || 0;
    return `find/${tmdbId}`;
  })()
}}

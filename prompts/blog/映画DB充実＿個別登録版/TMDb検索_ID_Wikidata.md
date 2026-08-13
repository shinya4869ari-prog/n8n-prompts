{{
  (() => {
    const qid = $json.query?.search?.[0]?.title || $json.search?.[0]?.id || $json.qid;
    if (qid) return 'find/' + qid;
    let tmdbId = null;
    const nodeNames = ['入力統一・分割コード', 'On form submission1'];
    for (const name of nodeNames) {
      try {
        const d = $(name).first()?.json || $(name).item?.json;
        if (d && (d.tmdb_id || d.id)) { tmdbId = d.tmdb_id || d.id; break; }
      } catch(e) {}
    }
    return tmdbId ? ('movie/' + tmdbId) : 'find/Q18652415';
  })()
}}

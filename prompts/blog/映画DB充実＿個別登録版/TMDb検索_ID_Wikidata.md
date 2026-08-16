【TMDb検索_ID/Wikidata ノード URL 設定】

### 💻 URL 欄に貼り付けるコード（Expression `fx`）

```text
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
      // スニペットとキーワードの一致度スコアリング
      let bestItem = null;
      let maxScore = -1;

      for (const item of searchList) {
        let score = 0;
        const snip = (item.snippet || '').toLowerCase();
        
        for (const kw of targetKeywords) {
          if (kw && kw.length >= 2 && !/^\d+$/.test(kw) && snip.includes(kw)) {
            score += 10;
          }
        }
        if (score > maxScore) {
          maxScore = score;
          bestItem = item;
        }
      }

      if (bestItem && maxScore > 0) {
        selectedQid = bestItem.title;
      } else {
        // キーワード一致がない場合は、TVシリーズのID候補（末尾）または先頭を選択
        selectedQid = searchList[searchList.length - 1]?.title || searchList[0]?.title;
      }
    }

    const qid = selectedQid || $json.qid || sourceNode.wikidata_id || sourceNode.qid;
    if (qid && /^Q\d+$/.test(qid)) {
      return `find/${qid}`;
    }

    const tmdbId = sourceNode.tmdb_id || $json.tmdb_id || sourceNode.id || 0;
    return `find/${tmdbId}`;
  })()
}}
```

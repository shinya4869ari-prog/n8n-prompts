const idSearch = $('TMDb検索_ID/Wikidata').isExecuted ? ($('TMDb検索_ID/Wikidata').item?.json || {}) : {};
const hasIdHit = idSearch.id || idSearch.movie_results?.[0]?.id;
const titleSearch = $('TMDb検索_タイトル').isExecuted ? ($('TMDb検索_タイトル').item?.json || {}) : {};

// IDでヒットしていればそちらを優先、なければタイトル検索結果を使用
return [{ json: hasIdHit ? idSearch : titleSearch }];

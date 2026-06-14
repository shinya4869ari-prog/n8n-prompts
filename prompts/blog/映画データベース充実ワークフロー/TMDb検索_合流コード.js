const res1 = $('TMDb検索_ID/Wikidata').isExecuted ? ($('TMDb検索_ID/Wikidata').item?.json || {}) : {};
const res2 = ($('TMDb検索_タイトル').isExecuted && $('TMDb検索_タイトル').item?.json) ? $('TMDb検索_タイトル').item.json : null;

// タイトル検索が実行された場合はその結果を返し、そうでなければ最初のID/Wikidata検索の結果を返す
const activeRes = res2 || res1;

return [{ json: activeRes }];

const rawRes1 = $('TMDb検索_ID/Wikidata').isExecuted ? ($('TMDb検索_ID/Wikidata').first()?.json || {}) : {};
const res1 = JSON.parse(JSON.stringify(rawRes1));

// Wikidata経由の/find結果の場合、movie_results[0]の内容をルートにコピーして平坦化する
if (res1.movie_results && res1.movie_results.length > 0) {
  Object.assign(res1, res1.movie_results[0]);
}

const res2 = ($('TMDb検索_タイトル').isExecuted && $('TMDb検索_タイトル').first()?.json) ? $('TMDb検索_タイトル').first().json : null;

// タイトル検索が実行された場合はその結果を返し、そうでなければ最初のID/Wikidata検索の結果を返す
const activeRes = res2 || res1;

return [{ json: activeRes }];

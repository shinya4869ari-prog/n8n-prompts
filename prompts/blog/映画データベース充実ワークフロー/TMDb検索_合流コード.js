const rawRes1 = $('TMDb検索_ID/Wikidata').isExecuted ? ($('TMDb検索_ID/Wikidata').first()?.json || {}) : {};
const res1 = JSON.parse(JSON.stringify(rawRes1));

// Wikidata経由の/find結果の場合、movie_results[0]の内容をルートにコピーして平坦化する
if (res1.movie_results && res1.movie_results.length > 0) {
  Object.assign(res1, res1.movie_results[0]);
}

const res2 = ($('TMDb検索_タイトル').isExecuted && $('TMDb検索_タイトル').first()?.json) ? $('TMDb検索_タイトル').first().json : null;

// ID/Wikidata検索の結果（確実な一致）がある場合はそちらを最優先し、ない場合はタイトル検索結果（res2）を使用する
// ID/Wikidata検索で映画がヒットしなかった（idがない）場合は、空配列 [] を返してワークフローを安全に停止します
if (!res1 || !res1.id) {
  return [];
}

return [{ json: res1 }];

// TMDb Discoverの検索結果を、Wikidataノードの出力と全く同じ形（bindings配列）に変換します
// これにより、後続の「Wikidata結果整形Code」などのノードを一切変更せずに使い回せます。

const tmdbData = $input.first().json;
const results = tmdbData.results || [];

// formNode（元々の検索条件）を取得
let formNode = {};
try {
  formNode = $('country-master-lookup').first().json;
} catch(e) {
  try {
    formNode = $('n8n Form Trigger').first().json;
  } catch(e2) {
    formNode = {};
  }
}

// Wikidataの「bindings」フォーマットに合わせてJSONを構築
const bindings = results.map(movie => {
  return {
    movie: { value: `http://www.wikidata.org/entity/Q_TMDB_${movie.id}` }, // ダミーのWikidata URL（重複排除で弾かれないため）
    tmdb: { value: movie.id.toString() },
    movieLabel: { value: movie.title || movie.original_title },
    movieLabelKo: { value: movie.original_title },
    movieLabelEn: { value: movie.original_title },
    year: { value: movie.release_date ? movie.release_date.substring(0, 4) : formNode.year },
    countryCode: { value: formNode.country || formNode.countryCode || "" }
  };
});

// Wikidataノードと同じデータ構造で出力
return [{
  json: {
    results: {
      bindings: bindings
    }
  }
}];

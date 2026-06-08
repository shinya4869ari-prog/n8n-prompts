// 各国から収集する映画の件数上限（この件数分だけ後続のループでTMDb取得やOllamaによる要約が実行されます）
const LIMIT_PER_COUNTRY = 2;

const input = $input.first().json;
const raw = input.data || input;
let bindings = [];
try {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  bindings = parsed?.results?.bindings || [];
} catch(e) {
  return [{ json: { skip: true } }];
}
const countryCode = (input.code2 || input.json?.code2 || '').toUpperCase();
const countryName = input.name || input.json?.name || '';

const movieMap = new Map();

// 優先判定対象のジャンルQID
const priorityGenres = new Set([
  'Q9367',    // ドキュメンタリー映画
  'Q2002360',  // 犯罪映画
  'Q1262900',  // 災害映画
  'Q1254477',  // 歴史映画
  'Q2484376'   // スリラー映画
]);

for (const b of bindings) {
  const movieUrl = b.movie?.value;
  const tmdb_id = b.tmdb?.value ? parseInt(b.tmdb.value) : null;
  if (!movieUrl || !tmdb_id) continue;

  const title = b.movieLabel?.value;
  if (!title || /^Q\d+$/.test(title)) continue;

  let movie = movieMap.get(movieUrl);
  if (!movie) {
    movie = {
      title,
      origin_title: b.movieLabelKo?.value || b.movieLabelEn?.value || null,
      year: b.year?.value ? parseInt(b.year.value) : null,
      poster_url: b.poster?.value || null,
      country: countryCode,
      country_name: countryName,
      wikidata_id: movieUrl.split('/').pop() || null,
      tmdb_id,
      lang: b.lang?.value?.split('/').pop() || null,
      priority: 0,
      genres: new Set(),
      hasEvent: false
    };
    movieMap.set(movieUrl, movie);
  }

  // ジャンル情報の蓄積
  const genreQID = b.genre?.value?.split('/').pop();
  if (genreQID) movie.genres.add(genreQID);

  // 出来事の描写有無
  if (b.depictedEvent?.value) movie.hasEvent = true;
}

// 映画ごとに優先度を算出
const movieList = Array.from(movieMap.values()).map(movie => {
  // 優先ジャンルのいずれかを含んでいる、または描かれている出来事がある場合
  const hasPriorityGenre = Array.from(movie.genres).some(g => priorityGenres.has(g));
  if (hasPriorityGenre || movie.hasEvent) {
    movie.priority = 1;
  }
  return movie;
});

// 優先度が高い順（1 -> 0） ➡ 公開年が新しい順 でソート
movieList.sort((a, b) => {
  if (b.priority !== a.priority) {
    return b.priority - a.priority;
  }
  return (b.year || 0) - (a.year || 0);
});

// 設定された件数上限だけを抽出してn8nの出力フォーマットに変換
const results = movieList.slice(0, LIMIT_PER_COUNTRY).map(movie => ({ json: movie }));

return results.length ? results : [{ json: { skip: true } }];

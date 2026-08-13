// 他のノードから元の入力データ（国・年・タイトル）を安全に取得
function getSourceData() {
  const nodeNames = ['映画ごとにループ実行', 'Loop Over Items', '入力統一・分割コード', 'On form submission1'];
  for (const name of nodeNames) {
    try {
      const d = $(name).first()?.json || $(name).item?.json;
      if (d && (d.title || d.origin_title || d.target_country || d.country)) return d;
    } catch(e) {}
  }
  return $input.first()?.json || {};
}

const sourceData = getSourceData();
const targetCountry = sourceData.target_country || sourceData.country || null;
const targetYear = sourceData.year ? parseInt(sourceData.year, 10) : null;
const targetLang = sourceData.target_lang || null;

// 1. ID/Wikidata検索結果 (res1) の取得と平坦化
const rawRes1 = $('TMDb検索_ID/Wikidata').isExecuted ? ($('TMDb検索_ID/Wikidata').first()?.json || {}) : {};
const res1 = JSON.parse(JSON.stringify(rawRes1));
if (res1.movie_results && res1.movie_results.length > 0) {
  Object.assign(res1, res1.movie_results[0]);
} else if (res1.tv_results && res1.tv_results.length > 0) {
  Object.assign(res1, res1.tv_results[0]);
}

// 2. タイトル検索結果 (res2) の取得
const res2 = ($('TMDb検索_タイトル').isExecuted && $('TMDb検索_タイトル').first()?.json) ? $('TMDb検索_タイトル').first().json : null;
const res2List = res2?.results || (res2?.id ? [res2] : []);

// 候補リストの作成 (res1を優先し、res2のリストを補合)
const candidates = [];
if (res1 && res1.id) candidates.push(res1);
if (Array.isArray(res2List)) candidates.push(...res2List);

// 検証関数：国名・公開年/放送年の合致判定（映画・ドラマ両対応）
function isValidMatch(movie) {
  if (!movie || !movie.id) return false;

  const releaseDate = movie.release_date || movie.first_air_date || '';
  const releaseYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : null;

  // 公開年・放送年の判定：年指定がある場合、±2年以上離れていたら明確に別作品
  if (targetYear && releaseYear && Math.abs(releaseYear - targetYear) > 2) {
    return false;
  }

  // 国コード（origin_country）の判定：国指定がある場合、含まれていなければ別作品
  const originCountries = movie.origin_country || (movie.production_countries ? movie.production_countries.map(c => c.iso_3166_1) : []);
  if (targetCountry && Array.isArray(originCountries) && originCountries.length > 0) {
    if (!originCountries.includes(targetCountry) && (!releaseYear || !targetYear || Math.abs(releaseYear - targetYear) > 0)) {
      return false;
    }
  }

  return true;
}

// 最も合致する1件を探索
const matchedMovie = candidates.find(isValidMatch);

// 一致する映画が存在しない場合は、空配列 [] を返して後続ノード（Brave SearchやCredits取得等）の実行を安全に即時ストップ（APIコスト回避）
if (!matchedMovie) {
  return [];
}

return [{ json: matchedMovie }];

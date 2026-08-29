/**
 * 【n8n用】映画データ整形コード（TVドラマ・映画完全両対応・超堅牢マージ版）
 */

function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || $(nodeName).item?.json || {};
  } catch (e) {
    return {};
  }
}

const credits = getNodeData('TMDb credits取得');
const t1 = getNodeData('TMDb検索');
const t2 = getNodeData('TMDb検索_タイトル');
const wikiNode = getNodeData('Wikidata検索') || getNodeData('Wikidata') || {};
let existingDb = getNodeData('Supabaseから既存データを取得');

// 入力データの安全取得
let sourceData = {};
function getSourceNodeData() {
  const isValid = (d) => d && (d.title || d.country || d.target_country || d.overview || d.query || d.id || d.tmdb_id || d.wikidata_id || d.qid);
  let d = null;
  try { d = $input.first()?.json || $input.item?.json; } catch(e) {}
  if (isValid(d)) return d;

  const fallbackNodes = ['country-master-lookup', '国マスター', '入力統一・分割コード', 'On form submission1', '映画ごとにループ実行', 'Loop Over Items'];
  for (const name of fallbackNodes) {
    try {
      d = $(name).first()?.json || $(name).item?.json;
      if (isValid(d)) return d;
    } catch (e) {}
  }
  return d || {};
}
sourceData = getSourceNodeData();

// 🎯【全候補からTMDb情報を安全マージ】
// TVシリーズ/映画の検索結果(t1, t2)と詳細(credits)を合成し、タイトル・画像・キャストを漏れなく集約
const tmdbObj = Object.assign({}, 
  (t1.tv_results && t1.tv_results[0]) || {},
  (t1.movie_results && t1.movie_results[0]) || {},
  t1 || {},
  t2 || {},
  credits || {}
);

// 🎯【キャスト抽出（映画 cast / ドラマ aggregate_credits 両対応・最大25名制限）】
const rawCastList = (Array.isArray(tmdbObj.credits?.cast) && tmdbObj.credits.cast) || 
                    (Array.isArray(tmdbObj.cast) && tmdbObj.cast) || 
                    (Array.isArray(tmdbObj.aggregate_credits?.cast) && tmdbObj.aggregate_credits.cast) || [];
const castList = [...rawCastList]
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  .slice(0, 25);

const tmdbCast = castList.map(c => c.name || c.original_name).filter(Boolean).join(', ');
const tmdbCastEn = castList.map(c => c.original_name || c.name).filter(Boolean).join(', ');

// 🎯【監督・スタッフ抽出（映画 crew / ドラマ created_by 両対応）】
const crewList = (Array.isArray(tmdbObj.credits?.crew) && tmdbObj.credits.crew) || 
                 (Array.isArray(tmdbObj.crew) && tmdbObj.crew) || [];
const createdByList = (Array.isArray(tmdbObj.created_by) && tmdbObj.created_by) || 
                      (Array.isArray(tmdbObj.credits?.created_by) && tmdbObj.credits.created_by) || [];

const dirList = crewList.filter(c => c && (c.job === 'Director' || c.job === 'Writer' || c.job === 'Executive Producer'));
const effectiveDirList = dirList.length > 0 ? dirList : createdByList;

const tmdbDirector = effectiveDirList.map(c => c.name || c.original_name).filter(Boolean).join(', ');
const tmdbDirectorEn = effectiveDirList.map(c => c.original_name || c.name).filter(Boolean).join(', ');

// 🎯【タイトル・原題（公式邦題ja最優先 ➔ ドラマ name / 映画 title 両対応）】
const isJapanese = (str) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(str || '');
const translations = Array.isArray(tmdbObj.translations?.translations) ? tmdbObj.translations.translations : [];
const rawJaTitle = translations.find(t => t.iso_639_1 === 'ja')?.data?.title || 
                   translations.find(t => t.iso_639_1 === 'ja')?.data?.name;
const movieTitle = (rawJaTitle && isJapanese(rawJaTitle)) ? rawJaTitle : (sourceData.title || tmdbObj.name || tmdbObj.title || existingDb.title || '');
const originTitle = tmdbObj.original_name || tmdbObj.original_title || existingDb.origin_title || movieTitle;

// 🎯【国コード（country-master-lookup連携 ＆ TMDb公式製作国から全自動判定）】
// 1. country-master-lookup ノードからの国情報取得
const countryLookup = getNodeData('country-master-lookup') || getNodeData('国マスター') || {};
const lookupCountryCode = countryLookup.countryCode || countryLookup.code || null;

// 2. TMDbからの公式製作国（production_countries: 全世界のISO 3166-1コード / origin_country）
const tmdbProdCountry = (Array.isArray(tmdbObj.production_countries) && tmdbObj.production_countries[0]?.iso_3166_1) || null;
const tmdbOriginCountry = (Array.isArray(tmdbObj.origin_country) && tmdbObj.origin_country[0]) || (typeof tmdbObj.origin_country === 'string' ? tmdbObj.origin_country : null);

// 3. 入力データからの国コード（2文字コード）
const inputCountryCode = (sourceData.countryCode && sourceData.countryCode.length === 2) ? sourceData.countryCode.toUpperCase() :
                         (sourceData.country && sourceData.country.length === 2) ? sourceData.country.toUpperCase() : null;

// 4. 国コードの決定（既存DB ➔ country-master-lookup ➔ TMDb製作国 ➔ 入力指定）
const country = existingDb.country || 
                lookupCountryCode || 
                tmdbProdCountry || 
                tmdbOriginCountry || 
                inputCountryCode || 
                sourceData.target_country || 
                sourceData.country || 
                '';

// 🎯【あらすじ判定】
const rawJaOverview = translations.find(t => t.iso_639_1 === 'ja')?.data?.overview;
const tmdbJaOverview = isJapanese(rawJaOverview) ? rawJaOverview : (isJapanese(tmdbObj.overview) ? tmdbObj.overview : null);

const rawEnOverview = translations.find(t => t.iso_639_1 === 'en')?.data?.overview || (!isJapanese(tmdbObj.overview) ? tmdbObj.overview : null);
const rawKoOverview = translations.find(t => t.iso_639_1 === 'ko')?.data?.overview;
const overviewEn = existingDb.overview_en || rawEnOverview || rawKoOverview || sourceData.overview_en || null;
const overview = existingDb.overview || tmdbJaOverview || sourceData.overview || null;

// 🎯【ポスター】
const rawPoster = tmdbObj.poster_path || existingDb.poster_url || existingDb.poster_path || '';
const posterUrl = rawPoster ? (rawPoster.startsWith('http') ? rawPoster : `https://image.tmdb.org/t/p/w500${rawPoster}`) : null;

// 🎯【Wikidata ID】
const wikidataId = sourceData.wikidata_id || sourceData.qid || existingDb.wikidata_id || tmdbObj.external_ids?.wikidata_id || wikiNode.qid || wikiNode.wikidata_id || wikiNode.id || null;

// 🎯【公開年・放送年】
const releaseDateStr = tmdbObj.first_air_date || tmdbObj.release_date || sourceData.year || existingDb.year || '';
const year = releaseDateStr ? String(releaseDateStr).substring(0, 4) : (existingDb.year || null);

// 🎯【ジャンル】
const genreObjs = Array.isArray(tmdbObj.genres) ? tmdbObj.genres : [];
const genres = existingDb.genres || (genreObjs.length > 0 ? genreObjs.map(g => g.name).join(', ') : (sourceData.genres || ''));

// 🎯【配信プラットフォーム】
function getPlatform() {
  const prodCompanies = Array.isArray(tmdbObj.production_companies) ? tmdbObj.production_companies : [];
  const networks = Array.isArray(tmdbObj.networks) ? tmdbObj.networks : [];
  const allNames = [...prodCompanies, ...networks].map(c => c?.name || '').join(' ').toLowerCase();
  if (allNames.includes('netflix')) return 'Netflix';
  if (allNames.includes('disney')) return 'Disney+';
  if (allNames.includes('amazon') || allNames.includes('prime')) return 'Amazon Prime Video';
  if (allNames.includes('apple')) return 'Apple TV+';
  if (allNames.includes('watcha')) return 'Watcha';
  if (allNames.includes('tving')) return 'TVING';
  if (allNames.includes('wavve')) return 'Wavve';
  if (allNames.includes('u-next')) return 'U-NEXT';
  return existingDb.platform || null;
}

// 🎯【IMDb URL】
const imdbId = tmdbObj.external_ids?.imdb_id || existingDb.imdb_id || null;
const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : (existingDb.imdb_url || null);

// 🎯【予告編URL】
const trailerUrl = existingDb.trailer_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movieTitle || ''} 予告編`)}`;
const trailerTitle = existingDb.trailer_title || `${movieTitle || ''} 予告編 (YouTubeで検索)`;

const output = {
  idx: existingDb.idx || null,
  created_at: existingDb.created_at || null,
  country: country,
  year: year,
  genres: genres,
  platform: getPlatform(),
  wikidata_id: wikidataId,
  tmdb_id: tmdbObj.id || sourceData.tmdb_id || existingDb.tmdb_id || null,
  title: movieTitle,
  origin_title: originTitle,
  director: existingDb.director || tmdbDirector,
  director_en: existingDb.director_en || tmdbDirectorEn,
  cast: existingDb.cast || tmdbCast,
  cast_en: existingDb.cast_en || tmdbCastEn,
  overview: overview,
  overview_en: overviewEn,
  poster_path: tmdbObj.poster_path || existingDb.poster_path || '',
  poster_url: posterUrl,
  backdrop_path: tmdbObj.backdrop_path || existingDb.backdrop_path || '',
  trailer_url: trailerUrl,
  trailer_title: trailerTitle,
  imdb_id: imdbId,
  imdb_url: imdbUrl,
  raw_response: {
    status: existingDb.id ? "既存データ優先保護" : "新規登録"
  }
};

// n8nのCodeノード実行モード（Run Once for All Items / Run Once for Each Item）両対応
if (typeof $input.item !== 'undefined') {
  return { json: output };
}
return [{ json: output }];

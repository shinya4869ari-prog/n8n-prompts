/**
 * 【n8n用】映画データ整形コード（TMDbダイレクト抽出・完全版）
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

let sourceData = {};
function getSourceNodeData() {
  const isValid = (d) => d && (d.title || d.country || d.target_country || d.overview || d.query || d.id || d.tmdb_id || d.wikidata_id || d.qid);
  let d = $input.first()?.json || $input.item?.json;
  if (isValid(d)) return d;

  try {
    d = $('入力統一・分割コード').first()?.json || $('入力統一・分割コード').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  try {
    d = $('On form submission1').first()?.json || $('On form submission1').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  
  return $input.first()?.json || $input.item?.json || {};
}
sourceData = getSourceNodeData();

// 🎯【全候補からTMDbオブジェクトを特定】
const candidateSources = [credits, t1, t2, $input.first()?.json].filter(Boolean);
let tmdbObj = candidateSources.find(c => (c.credits?.cast || c.cast || c.id)) || candidateSources[0] || {};

// 🎯【キャスト抽出（そのまま取得し、後続のAI翻訳ノードへ渡す）】
const castList = tmdbObj.credits?.cast || tmdbObj.cast || [];
const tmdbCast = castList.map(c => c.name || c.original_name).filter(Boolean).join(', ');
const tmdbCastEn = castList.map(c => c.original_name || c.name).filter(Boolean).join(', ');

// 🎯【監督・スタッフ抽出】
const crewList = tmdbObj.credits?.crew || tmdbObj.crew || [];
const createdByList = tmdbObj.created_by || tmdbObj.credits?.created_by || [];

const dirList = crewList.filter(c => c.job === 'Director' || c.job === 'Writer' || c.job === 'Executive Producer');
const effectiveDirList = dirList.length > 0 ? dirList : createdByList;

const tmdbDirector = effectiveDirList.map(c => c.name || c.original_name).filter(Boolean).join(', ');
const tmdbDirectorEn = effectiveDirList.map(c => c.original_name || c.name).filter(Boolean).join(', ');

// 🎯【タイトル・原題】
const movieTitle = sourceData.title || tmdbObj.title || tmdbObj.name || existingDb.title || '';
const originTitle = tmdbObj.original_title || tmdbObj.original_name || existingDb.origin_title || movieTitle;

// 🎯【国コード】
const langToCountry = {
  'ko': 'KR', 'ja': 'JP', 'en': 'US', 'fr': 'FR', 'de': 'DE',
  'zh': 'CN', 'ar': 'SA', 'fa': 'IR', 'hi': 'IN', 'th': 'TH',
  'vi': 'VN', 'id': 'ID', 'tr': 'TR', 'ru': 'RU', 'es': 'ES',
  'pt': 'BR', 'it': 'IT', 'nl': 'NL', 'pl': 'PL', 'da': 'DK',
  'sv': 'SE', 'nb': 'NO', 'fi': 'FI',
};
const lang = tmdbObj.original_language;
const tmdbOriginCountry = (Array.isArray(tmdbObj.origin_country) && tmdbObj.origin_country[0]) || (typeof tmdbObj.origin_country === 'string' ? tmdbObj.origin_country : null);
const country = existingDb.country || sourceData.target_country || sourceData.country || tmdbOriginCountry || (lang ? langToCountry[lang] : null) || '';

// 🎯【あらすじ】
const isJapanese = (str) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(str || '');
const rawJaOverview = tmdbObj.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview;
const tmdbJaOverview = isJapanese(rawJaOverview) ? rawJaOverview : (isJapanese(tmdbObj.overview) ? tmdbObj.overview : null);

const rawEnOverview = tmdbObj.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || (!isJapanese(tmdbObj.overview) ? tmdbObj.overview : null);
const rawKoOverview = tmdbObj.translations?.translations?.find(t => t.iso_639_1 === 'ko')?.data?.overview;
const overviewEn = existingDb.overview_en || rawEnOverview || rawKoOverview || sourceData.overview_en || null;
const overview = existingDb.overview || tmdbJaOverview || sourceData.overview || null;

// 🎯【ポスター】
const rawPoster = tmdbObj.poster_path || existingDb.poster_url || existingDb.poster_path || '';
const posterUrl = rawPoster ? (rawPoster.startsWith('http') ? rawPoster : `https://image.tmdb.org/t/p/w500${rawPoster}`) : null;

// 🎯【Wikidata ID】
const wikidataId = sourceData.wikidata_id || sourceData.qid || existingDb.wikidata_id || tmdbObj.external_ids?.wikidata_id || wikiNode.qid || wikiNode.wikidata_id || wikiNode.id || null;

// 🎯【公開年】
const releaseDateStr = tmdbObj.release_date || tmdbObj.first_air_date || sourceData.year || existingDb.year || '';
const year = releaseDateStr ? String(releaseDateStr).substring(0, 4) : (existingDb.year || null);

// 🎯【ジャンル】
const genreObjs = tmdbObj.genres || [];
const genres = existingDb.genres || (Array.isArray(genreObjs) && genreObjs.length > 0 ? genreObjs.map(g => g.name).join(', ') : (sourceData.genres || ''));

// 🎯【プラットフォーム】
function getPlatform() {
  const allNames = [...(tmdbObj.production_companies || []), ...(tmdbObj.networks || [])].map(c => c.name || '').join(' ').toLowerCase();
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
const trailerUrl = existingDb.trailer_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movieTitle} 予告編`)}`;
const trailerTitle = existingDb.trailer_title || `${movieTitle} 予告編 (YouTubeで検索)`;

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

return [{ json: output }];

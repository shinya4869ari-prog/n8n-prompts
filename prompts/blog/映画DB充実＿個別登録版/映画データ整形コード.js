/**
 * 【n8n用】映画データ整形コード（Supabase既存データ最優先保護・数字IDタイトル排除＆重複監督除外版）
 * 
 * 役割: Supabaseに保存されている完成済み既存データ（カタカナキャスト・日本語監督名・あらすじ等）を最優先で保護し、
 *       数字のみのID文字列（"282631"等）がタイトルに設定される事故を100%防止します。
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
const existingDb = getNodeData('Supabaseから既存データを取得');

const resultsList = [
  ...(t1?.results || t1?.movie_results || t1?.tv_results || (t1?.id ? [t1] : [])),
  ...(t2?.results || t2?.movie_results || t2?.tv_results || (t2?.id ? [t2] : []))
];

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

const correctMovieId = credits?.id;

// 対象国と言語にマッチする映画・ドラマを検索結果（resultsList）から探す
let result = null;
if (correctMovieId && resultsList.length > 0) {
  result = resultsList.find(m => m.id === correctMovieId);
}
if (!result && resultsList.length > 0) {
  result = resultsList[0];
}

// 日本語判定関数
const isJapanese = (str) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(str || '');

// 数字のみの文字列（"282631"等のID）をタイトル候補から除外する関数
const isCleanTitle = (t) => t && !/^\d+$/.test(String(t).trim());

// 🎯【タイトル決定】（数字IDは排除し、本物の映画タイトルを最優先選択）
const movieTitle = 
  (isCleanTitle(existingDb.title) ? existingDb.title : null) ||
  (isCleanTitle(sourceData.title) ? sourceData.title : null) ||
  (isCleanTitle(sourceData.name) ? sourceData.name : null) ||
  (isCleanTitle(result?.title) ? result.title : null) ||
  (isCleanTitle(result?.name) ? result.name : null) ||
  (isCleanTitle(credits.title) ? credits.title : null) ||
  (isCleanTitle(credits.name) ? credits.name : null) ||
  (isCleanTitle(t1.title) ? t1.title : null) ||
  (isCleanTitle(t1.name) ? t1.name : null) ||
  (isCleanTitle(t2.title) ? t2.title : null) ||
  (isCleanTitle(t2.name) ? t2.name : null) ||
  (isCleanTitle(sourceData.query) ? sourceData.query : null) ||
  '';

if (!movieTitle && !credits.id && !existingDb.id) return [];

const langToCountry = {
  'ko': 'KR', 'ja': 'JP', 'en': 'US', 'fr': 'FR', 'de': 'DE',
  'zh': 'CN', 'ar': 'SA', 'fa': 'IR', 'hi': 'IN', 'th': 'TH',
  'vi': 'VN', 'id': 'ID', 'tr': 'TR', 'ru': 'RU', 'es': 'ES',
  'pt': 'BR', 'it': 'IT', 'nl': 'NL', 'pl': 'PL', 'da': 'DK',
  'sv': 'SE', 'nb': 'NO', 'fi': 'FI',
};
const nameToCountryCode = {
  'ブータン': 'BT', '韓国': 'KR', '大韓民国': 'KR', 'アメリカ': 'US',
  'アメリカ合衆国': 'US', '日本': 'JP', 'フランス': 'FR', 'ドイツ': 'DE',
  '中国': 'CN', '中華人民共和国': 'CN', 'インド': 'IN', 'イギリス': 'GB',
  'グレートブリテン': 'GB', 'イタリア': 'IT', 'カナダ': 'CA', 'オーストラリア': 'AU',
  'スペイン': 'ES', 'ロシア': 'RU', 'ロシア連邦': 'RU', '台湾': 'TW',
  'タイ': 'TH', 'ベトナム': 'VN', 'インドネシア': 'ID', 'トルコ': 'TR',
  'ブラジル': 'BR', 'メキシコ': 'MX', 'ニュージーランド': 'NZ',
};

const lang = result?.original_language || credits.original_language;

let rawCountry = sourceData.target_country || sourceData.country || existingDb.country || '';
if (nameToCountryCode[rawCountry]) {
  rawCountry = nameToCountryCode[rawCountry];
}

const tmdbOriginCountry = (Array.isArray(result?.origin_country) && result.origin_country[0]) || (Array.isArray(credits?.origin_country) && credits.origin_country[0]) || (typeof result?.origin_country === 'string' ? result.origin_country : null);

const finalCountry = 
  existingDb.country ||
  rawCountry || 
  tmdbOriginCountry || 
  (lang ? langToCountry[lang] : null) || 
  '';

// 🎯【監督/制作陣の安全マージ & 重複除去】
let directorName = '';
let directorEnName = '';

if (Array.isArray(credits.crew) && credits.crew.length > 0) {
  const directors = credits.crew.filter(c => c.job === 'Director');
  const execProducers = credits.crew.filter(c => c.job === 'Executive Producer');
  const dirList = directors.length > 0 ? directors : (execProducers.length > 0 ? execProducers : []);
  
  if (dirList.length > 0) {
    directorName = Array.from(new Set(dirList.map(c => c.name).filter(Boolean))).join(', ');
    directorEnName = Array.from(new Set(dirList.map(c => c.original_name || c.name).filter(Boolean))).join(', ');
  }
}
if (!directorName && Array.isArray(credits.created_by) && credits.created_by.length > 0) {
  directorName = Array.from(new Set(credits.created_by.map(c => c.name).filter(Boolean))).join(', ');
  directorEnName = Array.from(new Set(credits.created_by.map(c => c.original_name || c.name).filter(Boolean))).join(', ');
}

const finalDirector = (existingDb.director && isJapanese(existingDb.director)) ? existingDb.director : (directorName || existingDb.director || '');
const finalDirectorEn = existingDb.director_en || directorEnName || '';

// 🎯【キャスト一覧の安全マージ & 重複除去】
const tmdbCastNames = (Array.isArray(credits.cast) && credits.cast.length > 0)
  ? Array.from(new Set(credits.cast.map(c => c.name).filter(Boolean))).join(', ')
  : '';

const tmdbCastEnNames = (Array.isArray(credits.cast) && credits.cast.length > 0)
  ? Array.from(new Set(credits.cast.map(c => c.original_name || c.name).filter(Boolean))).join(', ')
  : '';

const finalCast = (existingDb.cast && isJapanese(existingDb.cast)) ? existingDb.cast : (tmdbCastNames || existingDb.cast || '');
const finalCastEn = existingDb.cast_en || tmdbCastEnNames || '';

// 🎯【原題の安全マージ】(既存DB ➔ TMDb)
const tmdbOrigTitle = result?.original_title || result?.original_name || credits.original_title || credits.original_name || '';
const finalOriginTitle = existingDb.origin_title || tmdbOrigTitle || movieTitle;

// 🎯【あらすじ (overview / overview_en) の安全継承】
const tmdbOverview = credits.overview || result?.overview || '';
const finalOverview = (existingDb.overview && isJapanese(existingDb.overview)) ? existingDb.overview : (isJapanese(tmdbOverview) ? tmdbOverview : (sourceData.overview || existingDb.overview || ''));

const rawOverviewEn = sourceData.overview_en || credits.overview_en || (!isJapanese(tmdbOverview) ? tmdbOverview : '');
const finalOverviewEn = existingDb.overview_en || rawOverviewEn || '';

// 🎯【ポスターURL (poster_url) の自動構築】
const rawPoster = credits.poster_path || result?.poster_path || existingDb.poster_url || existingDb.poster_path || '';
const finalPosterUrl = rawPoster ? (rawPoster.startsWith('http') ? rawPoster : `https://image.tmdb.org/t/p/w500${rawPoster}`) : '';

// 🎯【Wikidata ID (QID) の安全継承】
let fetchedWikidataId = existingDb.wikidata_id || sourceData.wikidata_id || sourceData.qid || wikiNode.qid || wikiNode.wikidata_id || wikiNode.id || credits.wikidata_id || null;
if (!fetchedWikidataId && credits.external_ids?.wikidata_id) {
  fetchedWikidataId = credits.external_ids.wikidata_id;
}

// 🎬【YouTube 予告編の安全継承（日本国内再生可能な動画のみ採用）】
let finalTrailerUrl = '';
let finalTrailerTitle = '';

const tmdbVideos = credits.videos?.results || credits.videos || result?.videos?.results || [];
if (Array.isArray(tmdbVideos) && tmdbVideos.length > 0) {
  // 日本語の公式予告編のみ抽出（海外動画はジオブロックされるため除外）
  const jpTrailer = tmdbVideos.find(v => v.site === 'YouTube' && (v.iso_639_1 === 'ja' || v.iso_3166_1 === 'JP') && (v.type === 'Trailer' || v.type === 'Teaser'));
  if (jpTrailer && jpTrailer.key) {
    finalTrailerUrl = `https://www.youtube.com/watch?v=${jpTrailer.key}`;
    finalTrailerTitle = jpTrailer.name || `${movieTitle} 公式予告編`;
  }
}

if (existingDb.trailer_url && existingDb.trailer_url.includes('watch?v=')) {
  finalTrailerUrl = existingDb.trailer_url;
  finalTrailerTitle = existingDb.trailer_title || `${movieTitle} 予告編`;
} else if (!finalTrailerUrl) {
  // 海外ジオブロック動画を回避し、日本検索リンクをフォールバックに設定
  const searchQuery = encodeURIComponent(`${movieTitle} 予告編`);
  finalTrailerUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
  finalTrailerTitle = `${movieTitle} 予告編 (YouTubeで検索)`;
}

// 🎯【ジャンル (genres) の抽出・継承】
const genreIdMap = {
  28: 'アクション', 12: 'アドベンチャー', 16: 'アニメ', 35: 'コメディ', 80: '犯罪',
  99: 'ドキュメンタリー', 18: 'ドラマ', 10751: 'ファミリー', 14: 'ファンタジー', 36: '歴史',
  27: 'ホラー', 10402: '音楽', 9648: 'ミステリー', 10749: 'ロマンス', 878: 'SF',
  10770: 'テレビ映画', 53: 'スリラー', 10752: '戦争', 37: '西部劇',
  10759: 'アクション', 10762: 'キッズ', 10765: 'SF', 10768: '戦争'
};

let finalGenres = '';
const tmdbGenreObjs = credits.genres || result?.genres;
if (Array.isArray(tmdbGenreObjs) && tmdbGenreObjs.length > 0) {
  finalGenres = tmdbGenreObjs.map(g => g.name).join(', ');
} else if (Array.isArray(result?.genre_ids) && result.genre_ids.length > 0) {
  finalGenres = result.genre_ids.map(id => genreIdMap[id]).filter(Boolean).join(', ');
}
finalGenres = existingDb.genres || finalGenres || sourceData.genres || '';

const isExisting = existingDb && (existingDb.id || existingDb.created_at);
let updateReason = isExisting ? 'データ補完・更新' : '新規登録';

const releaseDateStr = result?.release_date || result?.first_air_date || credits.release_date || credits.first_air_date || sourceData.year || existingDb.year || '';

return [{
  json: {
    tmdb_id: credits.id || result?.id || sourceData.tmdb_id || sourceData.id || existingDb.tmdb_id,
    wikidata_id: fetchedWikidataId,
    title: movieTitle,
    title_en: finalOriginTitle,
    origin_title: finalOriginTitle,
    year: String(releaseDateStr).substring(0, 4),
    country: finalCountry,
    genres: finalGenres,
    director: finalDirector,
    director_en: finalDirectorEn,
    cast: finalCast,
    cast_en: finalCastEn,
    overview: finalOverview,
    overview_en: finalOverviewEn,
    poster_path: rawPoster,
    poster_url: finalPosterUrl,
    backdrop_path: credits.backdrop_path || result?.backdrop_path || existingDb.backdrop_path || '',
    trailer_url: finalTrailerUrl,
    trailer_title: finalTrailerTitle,
    update_reason: updateReason
  }
}];

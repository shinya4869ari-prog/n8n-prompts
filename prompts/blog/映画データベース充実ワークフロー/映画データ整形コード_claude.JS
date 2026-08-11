/**
 * 【n8n用】映画データ整形コード（Supabase既存データ保護・あらすじ＆予告編安全継承版）
 * 
 * 役割: TMDb API から取得した映画情報および Supabase に既に保存されている既存データ（あらすじ文や予告編URL等）を
 *       安全に統合・保護し、上書きによるデータの消失を防ぎます。
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
  ...(t1?.results || t1?.movie_results || (t1?.id ? [t1] : [])),
  ...(t2?.results || t2?.movie_results || (t2?.id ? [t2] : []))
];

let sourceData = {};
function getSourceNodeData() {
  const isValid = (d) => d && (d.title || d.country || d.target_country || d.overview || d.query || d.id || d.tmdb_id || d.wikidata_id || d.qid);
  
  let d = $input.first()?.json || $input.item?.json;
  if (isValid(d)) return d;

  try {
    d = $('Loop Over Items').first()?.json || $('Loop Over Items').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  try {
    d = $('映画ごとにループ実行').first()?.json || $('映画ごとにループ実行').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  
  return $input.first()?.json || $input.item?.json || {};
}
sourceData = getSourceNodeData();

const correctMovieId = credits?.id;

// 対象国と言語にマッチする映画を検索結果（resultsList）から探す
let result = null;
if (correctMovieId && resultsList.length > 0) {
  result = resultsList.find(m => m.id === correctMovieId);
}
if (!result && resultsList.length > 0) {
  result = resultsList[0];
}

const movieTitle = sourceData.title || sourceData.query || sourceData.name || credits.title || result?.title || t1.title || existingDb.title || '';

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

let rawCountry = sourceData.target_country || sourceData.country || '';
if (nameToCountryCode[rawCountry]) {
  rawCountry = nameToCountryCode[rawCountry];
}

const tmdbOriginCountry = (Array.isArray(result?.origin_country) && result.origin_country[0]) || (typeof result?.origin_country === 'string' ? result.origin_country : null);

const finalCountry = 
  rawCountry || 
  tmdbOriginCountry || 
  (lang ? langToCountry[lang] : null) || 
  existingDb.country || 
  '';

// キャストと監督の取得（TMDb credits優先 ➔ 既存DBの継承）
const directorName = (Array.isArray(credits.crew) && credits.crew.length > 0)
  ? credits.crew.filter(c => c.job === 'Director').map(c => c.name).join(', ')
  : (existingDb.director || '');

const directorEnName = (Array.isArray(credits.crew) && credits.crew.length > 0)
  ? credits.crew.filter(c => c.job === 'Director').map(c => c.original_name || c.name).join(', ')
  : (existingDb.director_en || '');

const castNames = (Array.isArray(credits.cast) && credits.cast.length > 0)
  ? credits.cast.slice(0, 10).map(c => c.name).join(', ')
  : (existingDb.cast || '');

const castEnNames = (Array.isArray(credits.cast) && credits.cast.length > 0)
  ? credits.cast.slice(0, 10).map(c => c.original_name || c.name).join(', ')
  : (existingDb.cast_en || '');

// 🎯【あらすじ (overview) の安全継承】
// TMDbのあらすじ ➔ Supabaseに既にある長文あらすじ (existingDb.overview) を最優先保護！
const tmdbOverview = credits.overview || result?.overview || '';
const finalOverview = tmdbOverview || existingDb.overview || sourceData.overview || '';

// 🎯【Wikidata ID (QID) の動的抽出・継承】
let fetchedWikidataId = sourceData.wikidata_id || sourceData.qid || wikiNode.qid || wikiNode.wikidata_id || wikiNode.id || credits.wikidata_id || existingDb.wikidata_id || null;
if (!fetchedWikidataId && credits.external_ids?.wikidata_id) {
  fetchedWikidataId = credits.external_ids.wikidata_id;
}

// 🎬【YouTube 予告編の安全継承】
// 1. TMDb公式動画URL ➔ 2. Supabase既存の直通動画URL(watch?v=) ➔ 3. 検索リンク
let finalTrailerUrl = '';
let finalTrailerTitle = '';

const tmdbVideos = credits.videos?.results || credits.videos || result?.videos?.results || [];
let officialTrailerKey = null;
if (Array.isArray(tmdbVideos) && tmdbVideos.length > 0) {
  const officialTrailer = tmdbVideos.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || tmdbVideos.find(v => v.site === 'YouTube');
  if (officialTrailer && officialTrailer.key) {
    officialTrailerKey = officialTrailer.key;
    finalTrailerUrl = `https://www.youtube.com/watch?v=${officialTrailer.key}`;
    finalTrailerTitle = officialTrailer.name || `${movieTitle} 公式予告編`;
  }
}

if (!finalTrailerUrl && existingDb.trailer_url && existingDb.trailer_url.includes('watch?v=')) {
  // Supabase に既にある直通 YouTube 動画 URL を絶対に保護！
  finalTrailerUrl = existingDb.trailer_url;
  finalTrailerTitle = existingDb.trailer_title || `${movieTitle} 予告編`;
} else if (!finalTrailerUrl) {
  const searchQuery = encodeURIComponent(`${movieTitle} 予告編`);
  finalTrailerUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
  finalTrailerTitle = `${movieTitle} 予告編 (YouTubeで検索)`;
}

const isExisting = existingDb && (existingDb.id || existingDb.created_at);
let updateReason = isExisting ? 'データ補完・更新' : '新規登録';

return [{
  json: {
    tmdb_id: credits.id || result?.id || sourceData.tmdb_id || sourceData.id || existingDb.tmdb_id,
    wikidata_id: fetchedWikidataId,
    title: movieTitle,
    title_en: result?.original_title || credits.original_title || movieTitle,
    origin_title: result?.original_title || credits.original_title || existingDb.origin_title || movieTitle,
    year: (result?.release_date || credits.release_date || sourceData.year || existingDb.year || '').substring(0, 4),
    country: finalCountry,
    director: directorName,
    director_en: directorEnName,
    cast: castNames,
    cast_en: castEnNames,
    overview: finalOverview, // 🎯 既存の長文あらすじ文を絶対に消さずに保護・保存！
    poster_path: credits.poster_path || result?.poster_path || existingDb.poster_path || '',
    backdrop_path: credits.backdrop_path || result?.backdrop_path || existingDb.backdrop_path || '',
    trailer_url: finalTrailerUrl, // 🎯 既存の動画URLを最優先保護！
    trailer_title: finalTrailerTitle,
    update_reason: updateReason
  }
}];

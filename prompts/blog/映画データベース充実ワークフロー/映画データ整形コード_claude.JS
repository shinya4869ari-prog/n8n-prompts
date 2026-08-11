const brave = $input.first()?.json || $input.item?.json || {};
const credits = getNodeData('TMDb credits取得');
const t1 = getNodeData('TMDb検索');
const t2 = getNodeData('TMDb検索_タイトル');
const wikiNode = getNodeData('Wikidata検索') || getNodeData('Wikidata') || {};

const resultsList = [
  ...(t1?.results || t1?.movie_results || (t1?.id ? [t1] : [])),
  ...(t2?.results || t2?.movie_results || (t2?.id ? [t2] : []))
];

// 実行されていないノードでも安全にデータを取得するヘルパー関数
function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || $(nodeName).item?.json || {};
  } catch (e) {
    return {};
  }
}

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

const movieTitle = sourceData.title || sourceData.query || sourceData.name || credits.title || result?.title || t1.title || '';

if (!movieTitle && !credits.id) return [];

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
  '';

// キャストと監督の取得（TMDb credits優先）
const directorName = Array.isArray(credits.crew) 
  ? credits.crew.filter(c => c.job === 'Director').map(c => c.name).join(', ')
  : '';

const directorEnName = Array.isArray(credits.crew) 
  ? credits.crew.filter(c => c.job === 'Director').map(c => c.original_name || c.name).join(', ')
  : '';

const castNames = Array.isArray(credits.cast) 
  ? credits.cast.slice(0, 10).map(c => c.name).join(', ')
  : '';

const castEnNames = Array.isArray(credits.cast) 
  ? credits.cast.slice(0, 10).map(c => c.original_name || c.name).join(', ')
  : '';

// TMDb の概要文 (overview) 取得
const tmdbOverview = credits.overview || result?.overview || '';

// 🎯 Wikidata ID (QID) の動的抽出
let fetchedWikidataId = sourceData.wikidata_id || sourceData.qid || wikiNode.qid || wikiNode.wikidata_id || wikiNode.id || credits.wikidata_id || null;
if (!fetchedWikidataId && credits.external_ids?.wikidata_id) {
  fetchedWikidataId = credits.external_ids.wikidata_id;
}

// 🎬 予告編ハイブリッド抽出（第1優先: TMDb公式動画キー、第2優先: Brave Search）
let trailerUrl = '';
let trailerTitle = '';

// 1. 第1優先: TMDb公式動画 (videos / credits.videos) からYouTube予告編を取得 (誤検索0%)
const tmdbVideos = credits.videos?.results || credits.videos || result?.videos?.results || [];
if (Array.isArray(tmdbVideos) && tmdbVideos.length > 0) {
  // Trailer または Teaser を最優先で探す
  const officialTrailer = tmdbVideos.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || tmdbVideos.find(v => v.site === 'YouTube');
  if (officialTrailer && officialTrailer.key) {
    trailerUrl = `https://www.youtube.com/watch?v=${officialTrailer.key}`;
    trailerTitle = officialTrailer.name || `${movieTitle} 予告編`;
  }
}

// 2. 第2優先 (フォールバック): TMDbに動画がない場合のみ Brave Search を活用
if (!trailerUrl && Array.isArray(brave.results)) {
  const searchTitleLower = movieTitle.toLowerCase();
  const searchTitleClean = searchTitleLower.replace(/[\s:：・\-_]/g, '');

  const matchedVideo = brave.results.find(v => {
    const vt = (v.title || '').toLowerCase().replace(/[\s:：・\-_]/g, '');
    const vd = (v.description || '').toLowerCase();
    const isTrailer = vt.includes('予告') || vt.includes('特報') || vt.includes('trailer') || vd.includes('予告') || vd.includes('trailer');
    const isTitleMatch = vt.includes(searchTitleClean) || searchTitleClean.split('').every(char => vt.includes(char));
    return isTrailer && isTitleMatch;
  });

  if (matchedVideo) {
    trailerUrl = matchedVideo.url || (matchedVideo.video?.url) || '';
    trailerTitle = matchedVideo.title || '';
  } else if (brave.results[0]) {
    trailerUrl = brave.results[0].url || '';
    trailerTitle = brave.results[0].title || '';
  }
}

// 変更理由ログの作成
const existingDb = getNodeData('Supabaseから既存データを取得');
const isExisting = existingDb && existingDb.id;

let updateReason = isExisting ? 'データ補完・更新' : '新規登録';

return [{
  json: {
    tmdb_id: credits.id || result?.id || sourceData.tmdb_id || sourceData.id,
    wikidata_id: fetchedWikidataId,
    title: movieTitle,
    title_en: result?.original_title || credits.original_title || movieTitle,
    origin_title: result?.original_title || credits.original_title || movieTitle,
    year: (result?.release_date || credits.release_date || sourceData.year || '').substring(0, 4),
    country: finalCountry,
    director: directorName,
    director_en: directorEnName,
    cast: castNames,
    cast_en: castEnNames,
    overview: tmdbOverview,
    poster_path: credits.poster_path || result?.poster_path || '',
    backdrop_path: credits.backdrop_path || result?.backdrop_path || '',
    trailer_url: trailerUrl,
    trailer_title: trailerTitle,
    update_reason: updateReason
  }
}];

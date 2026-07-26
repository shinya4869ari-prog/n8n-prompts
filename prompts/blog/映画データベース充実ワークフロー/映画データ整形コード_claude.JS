const brave = $input.first()?.json || $input.item?.json || {};
const credits = getNodeData('TMDb credits取得');
const t1 = getNodeData('TMDb検索');
const t2 = getNodeData('TMDb検索_タイトル');
const resultsList = [
  ...(t1?.results || t1?.movie_results || (t1?.id ? [t1] : [])),
  ...(t2?.results || t2?.movie_results || (t2?.id ? [t2] : []))
];
let sourceData = {};
function getSourceNodeData() {
  const isValid = (d) => d && (d.title || d.country || d.target_country || d.overview);
  
  let d = $input.first()?.json || $input.item?.json;
  if (isValid(d)) return d;

  try {
    d = $('Loop Over Items').first()?.json || $('Loop Over Items').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  try {
    d = $('Loop Over Items1').first()?.json || $('Loop Over Items1').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  try {
    d = $('映画ごとにループ実行').first()?.json || $('映画ごとにループ実行').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  
  return $input.first()?.json || $input.item?.json || {};
}
sourceData = getSourceNodeData();

function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || $(nodeName).item?.json || {};
  } catch (e) {
    return {};
  }
}

const correctMovieId = credits?.id;

let result = null;
if (correctMovieId && resultsList.length > 0) {
  result = resultsList.find(m => m.id === correctMovieId);
}

if (!result && resultsList.length > 0) {
  result = resultsList.find(m => 
    (m.original_language === sourceData.target_lang) || 
    (m.origin_country && m.origin_country.includes(sourceData.target_country))
  );
  if (!result) {
    result = resultsList[0];
  }
}

if (!sourceData?.title && !result?.title) return [];

const langToCountry = {
  'ko': 'KR', 'ja': 'JP', 'en': 'US', 'fr': 'FR', 'de': 'DE',
  'zh': 'CN', 'ar': 'SA', 'fa': 'IR', 'hi': 'IN', 'th': 'TH',
  'vi': 'VN', 'id': 'ID', 'tr': 'TR', 'ru': 'RU', 'es': 'ES',
  'pt': 'BR', 'it': 'IT', 'nl': 'NL', 'pl': 'PL', 'da': 'DK',
  'sv': 'SE', 'nb': 'NO', 'fi': 'FI',
};
const nameToCountryCode = {
  'ブータン': 'BT', '韓国': 'KR', '大韓民国': 'KR', 'アメリカ': 'US', 'アメリカ合衆国': 'US',
  '日本': 'JP', 'フランス': 'FR', 'ドイツ': 'DE', '中国': 'CN', '中華人民共和国': 'CN',
  'インド': 'IN', 'イギリス': 'GB', 'グレートブリテン': 'GB', 'イタリア': 'IT', 'カナダ': 'CA',
  'オーストラリア': 'AU', 'スペイン': 'ES', 'ロシア': 'RU', 'ロシア連邦': 'RU', '台湾': 'TW',
  'タイ': 'TH', 'ベトナム': 'VN', 'インドネシア': 'ID', 'トルコ': 'TR', 'ブラジル': 'BR',
  'メキシコ': 'MX', 'ニュージーランド': 'NZ',
};
const lang = result?.original_language;

let rawCountry = sourceData.target_country || sourceData.country || '';
if (nameToCountryCode[rawCountry]) {
  rawCountry = nameToCountryCode[rawCountry];
}

const tmdbOriginCountry = (Array.isArray(result?.origin_country) && result.origin_country[0]) || (typeof result?.origin_country === 'string' ? result.origin_country : null);
const country = (rawCountry && rawCountry.length === 2 ? rawCountry.toUpperCase() : null) || 
                (tmdbOriginCountry && tmdbOriginCountry.length === 2 ? tmdbOriginCountry.toUpperCase() : null) ||
                langToCountry[lang] || 
                lang?.toUpperCase() || 
                null;

// 1. ポスターURL: 既存データを絶対最優先、なければTMDb画像
let rawPoster = sourceData.poster_url || (result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null);
if (rawPoster && (rawPoster.includes('v6v6v6') || rawPoster.includes('dummy') || rawPoster.includes('sample'))) {
  rawPoster = sourceData.poster_url && !sourceData.poster_url.includes('v6v6v6') ? sourceData.poster_url : null;
}
const posterPath = rawPoster;

// 2. Wikidata ID & TMDb ID: 既存データを絶対最優先
let wikidata_id = sourceData.wikidata_id || result?.external_ids?.wikidata_id || null;
if (!wikidata_id) {
  try {
    const wikiJson1 = getNodeData('Wikidata検索');
    let fallbackId = wikiJson1?.query?.search?.[0]?.title || wikiJson1?.search?.[0]?.id || null;
    const wikiJson2 = getNodeData('Wikidata検索 (タイトル検索用)');
    if (!fallbackId && wikiJson2) {
      fallbackId = wikiJson2?.search?.[0]?.id || wikiJson2?.query?.[0]?.title || null;
    }
    wikidata_id = fallbackId;
  } catch (e) {}
}

const tmdb_id = sourceData.tmdb_id || result?.id || null;

// 3. 監督名・キャスト名: 既存の日本語データを絶対最優先
const fetchedCast = Array.isArray(credits?.cast) ? credits.cast.map(c => c.name || c.original_name).join(', ') : null;
const fetchedDirector = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.name || credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
const fetchedCastEn = Array.isArray(credits?.cast) ? credits.cast.map(c => c.original_name).join(', ') : null;
const fetchedDirectorEn = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;

const director = sourceData.director || fetchedDirector || null;
const cast = sourceData.cast || fetchedCast || null;
const director_en = sourceData.director_en || fetchedDirectorEn || null;
const cast_en = sourceData.cast_en || fetchedCastEn || null;

// 4. YouTube 予告編URL: 既存データを絶対最優先
const braveMovie = getNodeData('Brave Search_movie');
const braveTrailer = getNodeData('Brave Search_trailer');
const videoResults = [
  ...(braveMovie?.videos?.results || []),
  ...(braveMovie?.web?.results || []),
  ...(braveMovie?.results || []),
  ...(braveTrailer?.videos?.results || []),
  ...(braveTrailer?.web?.results || []),
  ...(braveTrailer?.results || [])
];

const youtubeVideo = videoResults.find(v => {
  const url = v.url || v.profile?.url || '';
  const videoTitle = (v.title || '') + ' ' + (v.description || '');
  const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/shorts/');
  if (!isYouTube) return false;
  
  const isNoise = videoTitle.toLowerCase().includes('not currently available') || videoTitle.toLowerCase().includes('利用できません') || videoTitle.toLowerCase().includes('device');
  if (isNoise) return false;
  
  const hasKeyword = videoTitle.toLowerCase().includes('予告') || 
                    videoTitle.toLowerCase().includes('特報') || 
                    videoTitle.toLowerCase().includes('trailer') || 
                    videoTitle.toLowerCase().includes('teaser') || 
                    videoTitle.toLowerCase().includes('preview') || 
                    videoTitle.toLowerCase().includes('promo') || 
                    videoTitle.toLowerCase().includes('예고');
  if (!hasKeyword) return false;

  const normalize = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]]/g, '');
  };

  const normalizedVideo = normalize(videoTitle);
  const movieTitleKeywords = [
    sourceData.title,
    sourceData.origin_title,
    result?.title,
    result?.original_title,
    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title,
    result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title
  ].filter(Boolean).map(normalize);

  return movieTitleKeywords.some(keyword => keyword.length > 1 && normalizedVideo.includes(keyword));
});

const fetchedTrailerUrl = youtubeVideo?.url || youtubeVideo?.profile?.url || null;
const trailer_url = sourceData.trailer_url || fetchedTrailerUrl || null;

// 5. あらすじ（overview）: 既存データを絶対最優先
const rawOverview = result?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                    null;

const finalOverview = sourceData.overview || rawOverview || null;
const finalOverviewEn = sourceData.overview_en || ((rawOverview && rawOverview !== finalOverview) ? rawOverview : null);

// 6. タイトル・原題: 既存データを絶対最優先
const inputTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title);
const isInputTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(inputTitle || '');
const isTmdbTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(result?.title || '');
const tmdbJaTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title || null;
const tmdbEnTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title || null;
const finalTitle = sourceData.title || (isInputTitleJapanese ? inputTitle : null) || tmdbJaTitle || (isTmdbTitleJapanese ? result?.title : null) || tmdbEnTitle || (result?.original_language === 'en' ? result?.original_title : null) || result?.title || result?.original_title || null;

const isAllowedOriginTitle = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3005-\u3006\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\u0020-\u007E\u00C0-\u024F\u1E00-\u1EFF\s\-_:'",\.!\?&\(\)]+$/.test(str.trim());
};

const rawTmdbOrigin = result?.original_title || null;
const rawSourceOrigin = sourceData.origin_title || null;

let finalOriginTitle = null;
if (isAllowedOriginTitle(rawSourceOrigin)) {
  finalOriginTitle = rawSourceOrigin;
} else if (isAllowedOriginTitle(rawTmdbOrigin)) {
  finalOriginTitle = rawTmdbOrigin;
} else if (isAllowedOriginTitle(tmdbEnTitle)) {
  finalOriginTitle = tmdbEnTitle;
} else if (isAllowedOriginTitle(result?.title)) {
  finalOriginTitle = result.title;
}

const genreMap = {
  28: "アクション", 12: "アドベンチャー", 16: "アニメ", 35: "コメディ", 80: "犯罪",
  99: "ドキュメンタリー", 18: "ドラマ", 10751: "ファミリー", 14: "ファンタジー", 36: "歴史",
  27: "ホラー", 10402: "音楽", 9648: "ミステリー", 10749: "ロマンス", 878: "SF",
  10770: "テレビ映画", 53: "スリラー", 10752: "戦争", 37: "西部劇"
};
const rawGenreIds = result?.genre_ids || (result?.genres ? result.genres.map(g => g.id) : []);
const genres = sourceData.genres || sourceData.genre || (Array.isArray(rawGenreIds) && rawGenreIds.length > 0 ? rawGenreIds.map(id => genreMap[id]).filter(Boolean).join(', ') : '') || null;

const escapeJsonString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
};

return [{
  json: {
    title: escapeJsonString(finalTitle),
    origin_title: escapeJsonString(finalOriginTitle),
    year: sourceData.year || (result?.release_date ? result.release_date.substring(0, 4) : null) || null,
    poster_url: posterPath,
    country,
    genres: escapeJsonString(genres),
    wikidata_id,
    tmdb_id,
    overview: escapeJsonString(finalOverview),
    overview_en: escapeJsonString(finalOverviewEn),
    trailer_url,
    director: escapeJsonString(director),
    cast: escapeJsonString(cast),
    director_en: escapeJsonString(director_en),
    cast_en: escapeJsonString(cast_en),
  }
}];

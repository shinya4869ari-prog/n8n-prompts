function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || {};
  } catch (e) {
    return {};
  }
}

const credits = getNodeData('TMDb credits取得');
const tmdb = getNodeData('TMDb検索');
let sourceData = {};
try {
  sourceData = $('映画ごとにループ実行').item?.json || {};
} catch (e) {
  sourceData = $input.item?.json || {};
}

const resultsList = tmdb?.results || tmdb?.movie_results || (tmdb?.id ? [tmdb] : []);

let result = null;
if (resultsList.length > 0) {
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
const lang = result?.original_language;
const country = sourceData.target_country || sourceData.country || langToCountry[lang] || lang?.toUpperCase() || null;

let rawPosterPath = sourceData.poster_url || (result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null);
if (rawPosterPath && (rawPosterPath.includes('v6v6v6') || rawPosterPath.includes('dummy') || rawPosterPath.includes('sample'))) {
  rawPosterPath = sourceData.poster_url && !sourceData.poster_url.includes('v6v6v6') ? sourceData.poster_url : null;
}
const posterPath = rawPosterPath;
const wikidata_id = sourceData.wikidata_id || null;
const tmdb_id = sourceData.tmdb_id || result?.id || null;

const fetchedCast = Array.isArray(credits?.cast) ? credits.cast.map(c => c.name || c.original_name).join(', ') : null;
const fetchedDirector = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.name || credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
const fetchedCastEn = Array.isArray(credits?.cast) ? credits.cast.map(c => c.original_name).join(', ') : null;
const fetchedDirectorEn = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;

const director = sourceData.director || fetchedDirector || null;
const cast = sourceData.cast || fetchedCast || null;
const director_en = sourceData.director_en || fetchedDirectorEn || null;
const cast_en = sourceData.cast_en || fetchedCastEn || null;

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

const rawOverview = result?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                    null;

const finalOverview = sourceData.overview || rawOverview || null;
const overviewEn = sourceData.overview_en || ((rawOverview && rawOverview !== finalOverview) ? rawOverview : null);

const inputTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title);
const isInputTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(inputTitle || '');
const isTmdbTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(result?.title || '');
const tmdbJaTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title || null;
const tmdbEnTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title || null;
const finalTitle = sourceData.title || (isInputTitleJapanese ? inputTitle : null) || tmdbJaTitle || (isTmdbTitleJapanese ? result?.title : null) || tmdbEnTitle || (result?.original_language === 'en' ? result?.original_title : null) || result?.title || result?.original_title || null;

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
    origin_title: escapeJsonString(sourceData.origin_title || result?.original_title || null),
    year: sourceData.year || (result?.release_date ? result.release_date.substring(0, 4) : null) || null,
    poster_url: posterPath,
    country,
    genres: escapeJsonString(genres),
    wikidata_id,
    tmdb_id,
    overview: escapeJsonString(finalOverview),
    overview_en: escapeJsonString(overviewEn),
    director: escapeJsonString(director),
    cast: escapeJsonString(cast),
    director_en: escapeJsonString(director_en),
    cast_en: escapeJsonString(cast_en),
    trailer_url,
  }
}];

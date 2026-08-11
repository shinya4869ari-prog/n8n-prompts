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
  
  // 1. First, check direct input
  let d = $input.first()?.json || $input.item?.json;
  if (isValid(d)) return d;

  // 2. Check fallback nodes if direct input doesn't have movie data
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
  
  // 3. Ultimate fallback
  return $input.first()?.json || $input.item?.json || {};
}
sourceData = getSourceNodeData();

// 実行されていないノードでも安全にデータを取得するヘルパー関数
function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || $(nodeName).item?.json || {};
  } catch (e) {
    return {};
  }
}

const correctMovieId = credits?.id;

// 対象国と言語にマッチする映画を検索結果（resultsList）から探す
let result = null;
if (correctMovieId && resultsList.length > 0) {
  // 0. creditsのIDと完全一致するものを最優先（最も確実）
  result = resultsList.find(m => m.id === correctMovieId);
}

  // 1. 国コードまたは言語が一致するものを検索
  result = resultsList.find(m => 
    (m.original_language && sourceData.target_lang && m.original_language === sourceData.target_lang) || 
    (m.origin_country && sourceData.target_country && m.origin_country.includes(sourceData.target_country))
  );

  // 2. 公開年（year）が近しいもの（±2年以内）を検証検索
  if (!result && sourceData.year) {
    const targetY = parseInt(sourceData.year, 10);
    result = resultsList.find(m => {
      const y = m.release_date ? parseInt(m.release_date.substring(0, 4), 10) : null;
      return y && Math.abs(y - targetY) <= 2;
    });
  }

  // 3. 国・年の条件に一致しない場合、別作品で誤上書きするのを防ぐためnullのままとします
  if (!result) {
    result = null;
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
  'ブータン': 'BT', '韓国': 'KR', '大韓民国': 'KR', 'アメリカ': 'US',
  'アメリカ合衆国': 'US', '日本': 'JP', 'フランス': 'FR', 'ドイツ': 'DE',
  '中国': 'CN', '中華人民共和国': 'CN', 'インド': 'IN', 'イギリス': 'GB',
  'グレートブリテン': 'GB', 'イタリア': 'IT', 'カナダ': 'CA', 'オーストラリア': 'AU',
  'スペイン': 'ES', 'ロシア': 'RU', 'ロシア連邦': 'RU', '台湾': 'TW',
  'タイ': 'TH', 'ベトナム': 'VN', 'インドネシア': 'ID', 'トルコ': 'TR',
  'ブラジル': 'BR', 'メキシコ': 'MX', 'ニュージーランド': 'NZ',
};
const lang = result?.original_language;

// カタカナ国名が流れてきた場合は2文字コードに変換する
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
const posterPath = result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null;
let wikidata_id = result?.external_ids?.wikidata_id || null;
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
const fetchedCast = (Array.isArray(credits?.cast) && credits.cast.length > 0) ? credits.cast.map(c => c.name || c.original_name).join(', ') : null;
const fetchedDirector = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.name || credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
const fetchedCastEn = (Array.isArray(credits?.cast) && credits.cast.length > 0) ? credits.cast.map(c => c.original_name).join(', ') : null;
const fetchedDirectorEn = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;

const cast = sourceData.cast || fetchedCast || null;
const director = sourceData.director || fetchedDirector || null;
const cast_en = sourceData.cast_en || fetchedCastEn || null;
const director_en = sourceData.director_en || fetchedDirectorEn || null;

// Braveの動画結果およびウェブ検索結果（動画が含まれるため）を統合して安全に取得
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

  const rawTitles = [
    sourceData.title,
    sourceData.origin_title,
    ...(sourceData.title ? sourceData.title.split(/[:\-\s]+/).filter(w => w.toLowerCase() !== 'hunt' && w.toLowerCase() !== 'the' && w.length >= 4) : []),
    ...(sourceData.origin_title ? sourceData.origin_title.split(/[:\-\s]+/).filter(w => w.toLowerCase() !== 'hunt' && w.toLowerCase() !== 'the' && w.length >= 4) : []),
    result?.title,
    result?.original_title
  ].filter(Boolean);

  const movieTitleKeywords = rawTitles.map(normalize);

  const containsMovieTitle = movieTitleKeywords.some(keyword => {
    if (keyword.length <= 2 || keyword === 'hunt' || keyword === 'the') return false;
    return normalizedVideo.includes(keyword);
  });

  return containsMovieTitle;
});

const fetchedTrailerUrl = youtubeVideo?.url || youtubeVideo?.profile?.url || null;
const trailer_url = fetchedTrailerUrl || sourceData.trailer_url || null;

const rawOverview = result?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                    null;

const finalOverview = sourceData.overview || rawOverview || null;
const finalOverviewEn = (rawOverview && rawOverview !== finalOverview) ? rawOverview : null;

const inputTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title);
const isInputTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(inputTitle || '');
const isTmdbTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(result?.title || '');
const tmdbJaTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title || null;
const tmdbEnTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title || null;
const finalTitle = (isInputTitleJapanese ? inputTitle : null) || tmdbJaTitle || (isTmdbTitleJapanese ? result?.title : null) || tmdbEnTitle || (result?.original_language === 'en' ? result?.original_title : null) || inputTitle || result?.title || result?.original_title || null;

const isAllowedOriginTitle = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3005-\u3006\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\u0020-\u007E\u00C0-\u024F\u1E00-\u1EFF\s\-_:'",\.!\?&\(\)]+$/.test(str.trim());
};

const rawTmdbOrigin = result?.original_title || null;
const rawSourceOrigin = sourceData.origin_title || null;

let finalOriginTitle = null;
if (isAllowedOriginTitle(rawTmdbOrigin)) {
  finalOriginTitle = rawTmdbOrigin;
} else if (isAllowedOriginTitle(tmdbEnTitle)) {
  finalOriginTitle = tmdbEnTitle;
} else if (isAllowedOriginTitle(rawSourceOrigin)) {
  finalOriginTitle = rawSourceOrigin;
} else if (isAllowedOriginTitle(result?.title)) {
  finalOriginTitle = result.title;
}

if (!isAllowedOriginTitle(finalOriginTitle)) {
  finalOriginTitle = null;
}

const genreMap = {
  28: "アクション", 12: "アドベンチャー", 16: "アニメ", 35: "コメディ", 80: "犯罪",
  99: "ドキュメンタリー", 18: "ドラマ", 10751: "ファミリー", 14: "ファンタジー", 36: "歴史",
  27: "ホラー", 10402: "音楽", 9648: "ミステリー", 10749: "ロマンス", 878: "SF",
  10770: "テレビ映画", 53: "スリラー", 10752: "戦争", 37: "西部劇"
};
const rawGenreIds = result?.genre_ids || (result?.genres ? result.genres.map(g => g.id) : []);
const genres = (Array.isArray(rawGenreIds) && rawGenreIds.length > 0 ? rawGenreIds.map(id => genreMap[id]).filter(Boolean).join(', ') : '') || sourceData.genres || sourceData.genre || null;

const escapeJsonString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/\r/g, '').replace(/\n/g, ' ').replace(/\\/g, '\\\\').replace(/"/g, '\\"').trim();
};

const outputObj = {
  title: escapeJsonString(finalTitle),
  origin_title: escapeJsonString(finalOriginTitle),
  year: (result?.release_date ? result.release_date.substring(0, 4) : null) || sourceData.year || null,
  tmdb_id: result?.id || sourceData.tmdb_id || null,
  wikidata_id,
  poster_url: posterPath,
  overview: escapeJsonString(finalOverview),
  overview_en: escapeJsonString(finalOverviewEn),
  genres: escapeJsonString(genres),
  director: escapeJsonString(director),
  director_en: escapeJsonString(director_en),
  cast: escapeJsonString(cast),
  cast_en: escapeJsonString(cast_en),
  trailer_url,
  country
};
return [{ json: outputObj }];

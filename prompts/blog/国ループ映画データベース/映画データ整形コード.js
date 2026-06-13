const credits = $('TMDb credits取得').item?.json || {};
const tmdb = $('TMDb検索').item?.json || {};
const sourceData = $('Loop Over Items1').item?.json || {}; // 修正：.item.jsonにして周回ごとの映画を正しく取得
const result = tmdb?.movie_results?.[0] || tmdb?.results?.[0] || tmdb;
if (!sourceData?.title && !result?.title) return [];
const langToCountry = {
  'ko': 'KR', 'ja': 'JP', 'en': 'US', 'fr': 'FR', 'de': 'DE',
  'zh': 'CN', 'ar': 'SA', 'fa': 'IR', 'hi': 'IN', 'th': 'TH',
  'vi': 'VN', 'id': 'ID', 'tr': 'TR', 'ru': 'RU', 'es': 'ES',
  'pt': 'BR', 'it': 'IT', 'nl': 'NL', 'pl': 'PL', 'da': 'DK',
  'sv': 'SE', 'nb': 'NO', 'fi': 'FI',
};
const lang = result?.original_language;
const country = sourceData?.country || langToCountry[lang] || lang?.toUpperCase() || null;
const posterPath = result?.poster_path 
  ? `https://image.tmdb.org/t/p/w500${result.poster_path}` 
  : (sourceData?.poster_url || null);
const wikidata_id = sourceData?.wikidata_id || null;
const cast = credits?.cast?.map(c => c.original_name).join(', ') || null;
const director = credits?.crew?.find(c => c.job === 'Director')?.original_name || null;
const ollama = $('Ollama').item?.json || {};
const ai_summary = (ollama?.content || '').replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
const braveVideos = $('Brave Search_movie').item?.json?.videos?.results || $('Brave Search_movie').first().json.videos?.results || [];
const youtubeVideo = braveVideos.find(v => v.url?.includes('youtube.com') || v.url?.includes('youtu.be'));
const trailer_url = youtubeVideo?.url || null;
return [{
  json: {
    title: sourceData?.title || result?.title || null,
    origin_title: sourceData?.origin_title || result?.original_title || null,
    year: result?.release_date ? result.release_date.substring(0, 4) : (sourceData?.year || null),
    poster_url: posterPath,
    country,
    wikidata_id,
    tmdb_id: result?.id || null,
    overview: result?.overview || 
              result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
              result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
              null,
    ai_summary,
    director,
    cast,
    trailer_url,
  }
}];
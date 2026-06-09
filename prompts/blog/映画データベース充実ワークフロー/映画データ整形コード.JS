const brave = $input.first().json;
const credits = $('TMDb credits取得').first().json;
const tmdb = $('TMDb検索').first().json;
const formData = $('フォーム整形Code').first().json;
const tmdb_input = tmdb?.results?.[0] || tmdb;
const result = tmdb_input?.id ? tmdb_input : tmdb?.results?.[0];
if (!formData?.title && !result?.title) return [];
const langToCountry = {
  'ko': 'KR', 'ja': 'JP', 'en': 'US', 'fr': 'FR', 'de': 'DE',
  'zh': 'CN', 'ar': 'SA', 'fa': 'IR', 'hi': 'IN', 'th': 'TH',
  'vi': 'VN', 'id': 'ID', 'tr': 'TR', 'ru': 'RU', 'es': 'ES',
  'pt': 'BR', 'it': 'IT', 'nl': 'NL', 'pl': 'PL', 'da': 'DK',
  'sv': 'SE', 'nb': 'NO', 'fi': 'FI',
};
const lang = result?.original_language;
const country = langToCountry[lang] || lang?.toUpperCase() || null;
const posterPath = result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null;
const wikidata = $('Wikidata検索').first().json;
const wikidata_id = wikidata?.error ? null : wikidata?.search?.[0]?.id || null;
const cast = credits?.cast?.map(c => c.original_name).join(', ') || null;
const director = credits?.crew?.find(c => c.job === 'Director')?.original_name || null;
const ollama = $('Ollama').first().json;
const ai_summary = (ollama?.content || '').replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
const videoResults = brave?.videos?.results || $('Brave Search_movie').first().json.videos?.results || [];
const youtubeVideo = videoResults.find(v => v.url?.includes('youtube.com') || v.url?.includes('youtu.be'));
const trailer_url = youtubeVideo?.url || null;
return [{
  json: {
    title: formData.title || result?.title || null,
    origin_title: formData.origin_title || result?.original_title || null,
    year: result?.release_date ? result.release_date.substring(0, 4) : null,
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
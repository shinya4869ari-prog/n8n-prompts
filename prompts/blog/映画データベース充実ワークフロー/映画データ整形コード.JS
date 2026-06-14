const brave = $input.item?.json || {};
const credits = $('TMDb credits取得').item?.json || {};
const tmdb = $('TMDb検索').item?.json || {};
const sourceData = $('Loop Over Items').item?.json || {};

// 実行されていないノードでも安全にデータを取得するヘルパー関数
function getNodeData(nodeName) {
  try {
    return $(nodeName).item?.json || {};
  } catch (e) {
    return {};
  }
}

const resultsList = tmdb?.results || tmdb?.movie_results || (tmdb?.id ? [tmdb] : []);

// 対象国と言語にマッチする映画を検索結果（resultsList）から探す
let result = null;
if (resultsList.length > 0) {
  // 1. 国コードとオリジナル言語の両方が一致するものを最優先
  result = resultsList.find(m => 
    (m.original_language === sourceData.target_lang) || 
    (m.origin_country && m.origin_country.includes(sourceData.target_country))
  );
  
  // 2. マッチするものがない場合は、最初の検索結果をフォールバックとして使用
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
// 判定された国、または指定された対象国を格納
const country = sourceData.target_country || langToCountry[lang] || lang?.toUpperCase() || null;
const posterPath = result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null;
const wikidata = getNodeData('Wikidata検索');
const wikidata_id = wikidata?.error ? null : wikidata?.search?.[0]?.id || null;
const cast = credits?.cast?.map(c => c.original_name).join(', ') || null;
const director = credits?.crew?.find(c => c.job === 'Director')?.original_name || null;
const ollama = getNodeData('Ollama');
const ai_summary = (ollama?.content || '').replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
const braveSearchData = getNodeData('Brave Search_movie');
const braveVideos = braveSearchData?.videos?.results || [];
const videoResults = brave?.videos?.results || braveVideos;
const youtubeVideo = videoResults.find(v => v.url?.includes('youtube.com') || v.url?.includes('youtu.be'));
const trailer_url = youtubeVideo?.url || null;

const rawOverview = result?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                    null;

// 日本語が含まれているかを判定
const isOverviewJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(rawOverview || '');

// 日本語以外のあらすじ（英語など）で、AI要約（ai_summary）がある場合はAI翻訳文をセット
const finalOverview = (!isOverviewJapanese && ai_summary) ? ai_summary : rawOverview;

return [{
  json: {
    title: (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title) || result?.title || null,
    origin_title: sourceData.origin_title || result?.original_title || null,
    year: result?.release_date ? result.release_date.substring(0, 4) : null,
    poster_url: posterPath,
    country,
    wikidata_id,
    tmdb_id: result?.id || null,
    overview: finalOverview,
    ai_summary: (rawOverview && !isOverviewJapanese) ? null : ai_summary,
    director,
    cast,
    trailer_url,
  }
}];

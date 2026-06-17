const brave = $input.item?.json || {};
const credits = $('TMDb credits取得').item?.json || {};
const tmdb = $('TMDb検索').item?.json || {};
let sourceData = {};
try {
  sourceData = $('Loop Over Items').item?.json || {};
} catch(e) {
  try {
    sourceData = $('Loop Over Items1').item?.json || {};
  } catch(e2) {
    try {
      sourceData = $('映画ごとにループ実行').item?.json || {};
    } catch(e3) {
      sourceData = $input.item?.json || {};
    }
  }
}

// 実行されていないノードでも安全にデータを取得するヘルパー関数
function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || {};
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
const country = langToCountry[lang] || sourceData.target_country || lang?.toUpperCase() || null;
const posterPath = result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null;
const wikidata = getNodeData('Wikidata検索');
const wikidata_id = result?.external_ids?.wikidata_id || (wikidata?.error ? null : wikidata?.search?.[0]?.id || null);
const cast = credits?.cast?.map(c => c.original_name).join(', ') || null;
const director = credits?.crew?.find(c => c.job === 'Director')?.original_name || null;
const ollama = getNodeData('Ollama');
const rawOllamaText = (ollama?.content || '').trim();
let ai_title = null;
let ai_summary = null;
if (rawOllamaText) {
  const titleMatch = rawOllamaText.match(/\[TITLE:\s*(.+?)\]/i);
  if (titleMatch) {
    ai_title = titleMatch[1].trim();
    ai_summary = rawOllamaText.replace(/\[TITLE:\s*(.+?)\]/i, '').replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
  } else {
    ai_summary = rawOllamaText.replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
  }
}
const tavilyData = getNodeData('Tavily');
const braveTrailer = getNodeData('Brave Search_trailer');
const braveVideos = braveTrailer?.results || braveTrailer?.videos?.results || [];
const videoResults = brave?.results || brave?.videos?.results || braveVideos;

const youtubeVideo = videoResults.find(v => {
  const url = v.url || v.profile?.url || '';
  const title = (v.title || v.description || '').toLowerCase();
  
  // YouTubeの動画リンクであること
  const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
  if (!isYouTube) return false;
  
  // YouTubeのエラー画面（ノイズ）を除外する
  const isNoise = title.includes('not currently available') || title.includes('利用できません') || title.includes('device');
  if (isNoise) return false;
  
  // 映画の予告編に関連するキーワードが含まれているものを厳格に判定（「映画」などの広すぎる言葉は除外）
  const hasKeyword = title.includes('予告') || 
                    title.includes('特報') || 
                    title.includes('trailer') || 
                    title.includes('teaser') || 
                    title.includes('preview') || 
                    title.includes('promo') || 
                    title.includes('예고'); // 韓国語の「予告」
  return hasKeyword;
});

const trailer_url = youtubeVideo?.url || youtubeVideo?.profile?.url || null;

const rawOverview = result?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                    null;

// 日本語が含まれているかを判定
const isOverviewJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(rawOverview || '');

// 日本語以外のあらすじ（英語など）で、AI要約（ai_summary）がある場合はAI翻訳文をセット
const finalOverview = (!isOverviewJapanese && ai_summary) ? ai_summary : rawOverview;

const inputTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title);
const isTmdbTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(result?.title || '');
const tmdbJaTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title || null;
const finalTitle = inputTitle || (isTmdbTitleJapanese ? result?.title : null) || tmdbJaTitle || result?.title || result?.original_title || null;

// JSON壊れ（パースエラー）を防ぐため、文字列の特殊文字をエスケープするヘルパー関数
const escapeJsonString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
};

return [{
  json: {
    title: escapeJsonString(finalTitle),
    origin_title: escapeJsonString(sourceData.origin_title || result?.original_title || null),
    year: (result?.release_date ? result.release_date.substring(0, 4) : null) || sourceData.year || null,
    poster_url: posterPath,
    country,
    wikidata_id,
    tmdb_id: result?.id || null,
    overview: escapeJsonString(finalOverview),
    ai_summary: escapeJsonString((rawOverview && !isOverviewJapanese) ? null : ai_summary),
    director: escapeJsonString(director),
    cast: escapeJsonString(cast),
    trailer_url,
  }
}];

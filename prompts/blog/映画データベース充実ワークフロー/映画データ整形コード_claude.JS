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
const nameToCountryCode = {
  'ブータン': 'BT',
  '韓国': 'KR',
  '大韓民国': 'KR',
  'アメリカ': 'US',
  'アメリカ合衆国': 'US',
  '日本': 'JP',
  'フランス': 'FR',
  'ドイツ': 'DE',
  '中国': 'CN',
  '中華人民共和国': 'CN',
  'インド': 'IN',
  'イギリス': 'GB',
  'グレートブリテン': 'GB',
  'イタリア': 'IT',
  'カナダ': 'CA',
  'オーストラリア': 'AU',
  'スペイン': 'ES',
  'ロシア': 'RU',
  'ロシア連邦': 'RU',
  '台湾': 'TW',
  'タイ': 'TH',
  'ベトナム': 'VN',
  'インドネシア': 'ID',
  'トルコ': 'TR',
  'ブラジル': 'BR',
  'メキシコ': 'MX',
  'ニュージーランド': 'NZ',
};
const lang = result?.original_language;

// カタカナ国名が流れてきた場合は2文字コードに変換する
let rawCountry = sourceData.target_country || '';
if (nameToCountryCode[rawCountry]) {
  rawCountry = nameToCountryCode[rawCountry];
}

const country = (rawCountry && rawCountry.length === 2 ? rawCountry.toUpperCase() : null) || langToCountry[lang] || lang?.toUpperCase() || null;
const posterPath = result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null;
const wikidata = getNodeData('Wikidata検索');
const wikidata_id = result?.external_ids?.wikidata_id || (wikidata?.error ? null : wikidata?.search?.[0]?.id || null);
const cast = credits?.cast?.map(c => c.name || c.original_name).join(', ') || null;
const director = credits?.crew?.find(c => c.job === 'Director')?.name || credits?.crew?.find(c => c.job === 'Director')?.original_name || null;
const cast_en = credits?.cast?.map(c => c.original_name).join(', ') || null;
const director_en = credits?.crew?.find(c => c.job === 'Director')?.original_name || null;
const claude = getNodeData('Message a model');
let rawText = '';
if (typeof claude?.text === 'string') {
  rawText = claude.text;
} else if (typeof claude?.content === 'string') {
  rawText = claude.content;
} else if (Array.isArray(claude?.content) && claude.content[0]?.text) {
  rawText = claude.content[0].text;
} else if (typeof claude?.output === 'string') {
  rawText = claude.output;
}
const ai_summary = rawText.replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
const braveSearchData = getNodeData('Brave Search_movie');
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

const rawOverview = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || 
                    result?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                    null;

// ベースとなる日本語あらすじを定義（TMDb公式日本語 ＞ 上流ブログでAIが取得した日本語）
const tmdbJaOverview = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || null;
const sourceJaOverview = sourceData.overview || null;
const baseOverview = tmdbJaOverview || sourceJaOverview || null;

// TMDbの公式あらすじ、またはブログ側から流れてきた既存あらすじが日本語であるかを判定
const isOverviewJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3005-\u3006]/.test(rawOverview || '') || 
                           /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3005-\u3006]/.test(baseOverview || '');

// TMDb英語あらすじを抽出
const rawOverviewEn = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                      (!isOverviewJapanese ? rawOverview : null);

let finalOverview = null;
let finalOverviewEn = null;
let finalAiSummary = null;

if (rawOverview) {
  // パターンA・B: 公式あらすじが存在する場合
  if (isOverviewJapanese) {
    // パターンA: 日本語公式あらすじがある場合
    finalOverview = baseOverview || rawOverview;
    finalOverviewEn = null;
    finalAiSummary = null;
  } else {
    // パターンB: 英語の公式あらすじだけがある場合
    finalOverview = baseOverview; // overviewは日本語専用。英語は入れない
    finalOverviewEn = rawOverview; // ◀ ここに「英語の原文あらすじ」をセットして後ろのAI翻訳に渡す
    finalAiSummary = null;
  }
} else {
  // パターンC: 公式あらすじが無い（Tavily検索ルート）の場合
  finalOverview = baseOverview; // もともとブログ側で作られた日本語あらすじがあれば保持
  finalOverviewEn = null;
  finalAiSummary = null; // 後ろのTavily検索+AI生成で作成されるため、この時点ではnull
}

const tmdbJaTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title || null;
const finalTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title) || (isOverviewJapanese ? result?.title : null) || tmdbJaTitle || result?.title || result?.original_title || null;

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
    overview_en: escapeJsonString(finalOverviewEn),
    ai_summary: escapeJsonString(finalAiSummary),
    trailer_url,
    director_en: escapeJsonString(director_en),
    cast_en: escapeJsonString(cast_en),
  }
}];

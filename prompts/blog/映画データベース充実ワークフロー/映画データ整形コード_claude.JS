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

if (!result && resultsList.length > 0) {
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
const cast = Array.isArray(credits?.cast) ? credits.cast.map(c => c.name || c.original_name).join(', ') : null;
const director = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.name || credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
const cast_en = Array.isArray(credits?.cast) ? credits.cast.map(c => c.original_name).join(', ') : null;
const director_en = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
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

// ベースとなる日本語あらすじを定義（TMDb公式日本語 ＞ Supabaseの既存日本語 ＞ 上流ブログでAIが取得した日本語）
const tmdbJaOverview = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || null;

let supabaseJaOverview = null;
try {
  const sbData = $('Supabaseから既存データを取得').item?.json || {};
  const record = Array.isArray(sbData) ? sbData[0] : sbData;
  supabaseJaOverview = record?.overview || record?.overview_en || record?.ai_summary || null;
} catch(e){}

const sourceJaOverview = sourceData.overview || null;
const baseOverview = tmdbJaOverview || supabaseJaOverview || sourceJaOverview || null;

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

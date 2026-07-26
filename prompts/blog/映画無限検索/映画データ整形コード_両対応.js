// 実行されていないノードでも安全にデータを取得するヘルパー関数
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
const country = sourceData.target_country || sourceData.country || langToCountry[lang] || lang?.toUpperCase() || null;
let rawPosterPath = result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : (sourceData.poster_url || null);
if (rawPosterPath && (rawPosterPath.includes('v6v6v6') || rawPosterPath.includes('dummy') || rawPosterPath.includes('sample'))) {
  rawPosterPath = null;
}
const posterPath = rawPosterPath;
const wikidata_id = sourceData.wikidata_id || null;
const cast = Array.isArray(credits?.cast) ? credits.cast.map(c => c.name || c.original_name).join(', ') : null;
const director = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.name || credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
const cast_en = Array.isArray(credits?.cast) ? credits.cast.map(c => c.original_name).join(', ') : null;
const director_en = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;

// ==========================================
// AI翻訳テキストの取得（Claude & Ollama 両対応ロジック）
// ==========================================
const claudeDbNode = getNodeData('claude_movie_db');
const claudeNode = getNodeData('Claude');
const ollamaNode = getNodeData('Ollama');

let rawAiText = '';

// 1. Claude系ノードからテキストを自動抽出（claude_movie_db または Claude）
const targetClaude = (claudeDbNode?.content || claudeDbNode?.message || claudeDbNode?.text) ? claudeDbNode : (claudeNode?.content || claudeNode?.message || claudeNode?.text ? claudeNode : null);

if (targetClaude) {
  if (Array.isArray(targetClaude.content)) {
    const textContent = targetClaude.content.find(item => item?.type === 'text' || item?.text);
    if (textContent) {
      rawAiText = (textContent.text || '').trim();
    } else if (typeof targetClaude.content[0] === 'string') {
      rawAiText = targetClaude.content.join('\n').trim();
    }
  } else if (typeof targetClaude.content === 'string') {
    rawAiText = targetClaude.content.trim();
  } else if (typeof targetClaude.text === 'string') {
    rawAiText = targetClaude.text.trim();
  } else if (targetClaude.message && typeof targetClaude.message.content === 'string') {
    rawAiText = targetClaude.message.content.trim();
  }
}

// 2. Claudeから取得できない場合、Ollamaノードから取得
if (!rawAiText && ollamaNode) {
  if (typeof ollamaNode.content === 'string') {
    rawAiText = ollamaNode.content.trim();
  } else if (typeof ollamaNode.text === 'string') {
    rawAiText = ollamaNode.text.trim();
  }
}

let ai_title = null;
let ai_summary = null;
if (rawAiText) {
  const titleMatch = rawAiText.match(/\[TITLE:\s*(.+?)\]/i);
  if (titleMatch) {
    ai_title = titleMatch[1].trim();
    ai_summary = rawAiText.replace(/\[TITLE:\s*(.+?)\]/i, '').replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
  } else {
    ai_summary = rawAiText.replace(/[\x00-\x1F\x7F]/g, ' ').trim() || null;
  }
}

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
  
  // YouTubeの動画リンク（通常の動画、短縮URL、またはShorts）であること
  const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/shorts/');
  if (!isYouTube) return false;
  
  // YouTubeのエラー画面（ノイズ）を除外する
  const isNoise = videoTitle.toLowerCase().includes('not currently available') || videoTitle.toLowerCase().includes('利用できません') || videoTitle.toLowerCase().includes('device');
  if (isNoise) return false;
  
  // 映画の予告編に関連するキーワードが含まれているものを厳格に判定
  const hasKeyword = videoTitle.toLowerCase().includes('予告') || 
                    videoTitle.toLowerCase().includes('特報') || 
                    videoTitle.toLowerCase().includes('trailer') || 
                    videoTitle.toLowerCase().includes('teaser') || 
                    videoTitle.toLowerCase().includes('preview') || 
                    videoTitle.toLowerCase().includes('promo') || 
                    videoTitle.toLowerCase().includes('예고'); // 韓国語の「予告」
  if (!hasKeyword) return false;

  // 比較のためにスペースや記号を除去・小文字化するヘルパー関数
  const normalize = (str) => {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]]/g, '');
  };

  const normalizedVideo = normalize(videoTitle);

  // 映画のタイトル（日本語・英語・原題 of いずれか）が動画タイトルに含まれているかをチェック（スペースの有無や表記揺れを無視）
  const movieTitleKeywords = [
    sourceData.title,
    sourceData.origin_title,
    result?.title,
    result?.original_title,
    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title,
    result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title
  ].filter(Boolean).map(normalize);

  const containsMovieTitle = movieTitleKeywords.some(keyword => {
    if (keyword.length <= 1) return false;
    return normalizedVideo.includes(keyword);
  });

  return containsMovieTitle;
});

const trailer_url = youtubeVideo?.url || youtubeVideo?.profile?.url || null;

const rawOverview = result?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || 
                    result?.translations?.translations?.find(t => t.data?.overview)?.data?.overview || 
                    null;

// あらすじ（日本語）の取得：入力(sourceData.overview)を最優先、次いでTMDb(rawOverview)
const finalOverview = sourceData.overview || rawOverview || null;
const overviewEn = (rawOverview && rawOverview !== finalOverview) ? rawOverview : null;

const inputTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title);
const isInputTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(inputTitle || '');
const isTmdbTitleJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(result?.title || '');
const tmdbJaTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title || null;
const tmdbEnTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title || null;
const finalTitle = (isInputTitleJapanese ? inputTitle : null) || tmdbJaTitle || (isTmdbTitleJapanese ? result?.title : null) || tmdbEnTitle || (result?.original_language === 'en' ? result?.original_title : null) || inputTitle || result?.title || result?.original_title || null;

// TMDbのジャンルID ➔ 日本語変換マッピング
const genreMap = {
  28: "アクション", 12: "アドベンチャー", 16: "アニメ", 35: "コメディ", 80: "犯罪",
  99: "ドキュメンタリー", 18: "ドラマ", 10751: "ファミリー", 14: "ファンタジー", 36: "歴史",
  27: "ホラー", 10402: "音楽", 9648: "ミステリー", 10749: "ロマンス", 878: "SF",
  10770: "テレビ映画", 53: "スリラー", 10752: "戦争", 37: "西部劇"
};
const rawGenreIds = result?.genre_ids || (result?.genres ? result.genres.map(g => g.id) : []);
const genres = (Array.isArray(rawGenreIds) && rawGenreIds.length > 0 ? rawGenreIds.map(id => genreMap[id]).filter(Boolean).join(', ') : '') || sourceData.genres || sourceData.genre || null;

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
    genres: escapeJsonString(genres),
    wikidata_id,
    tmdb_id: result?.id || null,
    overview: escapeJsonString(finalOverview),
    overview_en: escapeJsonString(overviewEn),
    director: escapeJsonString(director || sourceData.director_name || null),
    cast: escapeJsonString(cast),
    director_en: escapeJsonString(director_en),
    cast_en: escapeJsonString(cast_en),
    trailer_url,
  }
}];

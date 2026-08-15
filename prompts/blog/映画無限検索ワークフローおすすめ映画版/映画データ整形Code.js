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

// 1. ポスターURLの確定
let rawPosterPath = sourceData.poster_url || (result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : null);
if (rawPosterPath && (rawPosterPath.includes('v6v6v6') || rawPosterPath.includes('dummy') || rawPosterPath.includes('sample'))) {
  rawPosterPath = sourceData.poster_url && !sourceData.poster_url.includes('v6v6v6') ? sourceData.poster_url : null;
}
const posterPath = rawPosterPath;

// 2. 🎯 本物の Wikidata ID（QID）の抽出（TMDb external_ids優先・ダミーID自動除外）
let wikidata_id = null;
const tmdbWikiId = result?.external_ids?.wikidata_id || tmdb?.external_ids?.wikidata_id;
if (tmdbWikiId && /^Q\d+$/.test(tmdbWikiId)) {
  wikidata_id = tmdbWikiId;
} else if (sourceData.wikidata_id && /^Q\d+$/.test(sourceData.wikidata_id) && !sourceData.wikidata_id.startsWith('Q_TMDB_')) {
  wikidata_id = sourceData.wikidata_id;
}

const tmdb_id = sourceData.tmdb_id || result?.id || null;

// 3. キャスト・監督の抽出（取得できたキャスト全員を保存）
const fetchedCast = Array.isArray(credits?.cast) ? credits.cast.map(c => c.name || c.original_name).join(', ') : null;
const fetchedDirector = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.name || credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;
const fetchedCastEn = Array.isArray(credits?.cast) ? credits.cast.map(c => c.original_name).join(', ') : null;
const fetchedDirectorEn = Array.isArray(credits?.crew) ? (credits.crew.find(c => c.job === 'Director')?.original_name || null) : null;

// 4. 🤖 AI（Claude / Gemini / Ollama / $input）による日本語あらすじの安全抽出
let aiOverview = null;
let aiNode = getNodeData('claude_movie_db') || getNodeData('claude_movie_d') || getNodeData('gemini_movie_db') || getNodeData('Google Gemini') || getNodeData('Gemini') || getNodeData('Claude') || getNodeData('Ollama');

// $input 自体に AI の出力（content.parts や text など）が含まれている場合は直接採用
const currentInput = $input.first()?.json || {};
if (currentInput.content?.parts || currentInput.candidates || (currentInput.text && !currentInput.original_title) || currentInput.message) {
  aiNode = currentInput;
}

let aiCastJa = null;
let aiDirectorJa = null;

if (aiNode) {
  let rawAiText = "";
  if (typeof aiNode === 'string') {
    rawAiText = aiNode;
  } else if (Array.isArray(aiNode.content?.parts)) {
    rawAiText = aiNode.content.parts.map(p => p.text || '').join('\n');
  } else if (aiNode.candidates?.[0]?.content?.parts) {
    rawAiText = aiNode.candidates[0].content.parts.map(p => p.text || '').join('\n');
  } else if (aiNode.text) {
    rawAiText = aiNode.text;
  } else if (aiNode.message?.content) {
    rawAiText = typeof aiNode.message.content === 'string' ? aiNode.message.content : JSON.stringify(aiNode.message.content);
  } else if (aiNode.content?.[0]?.text) {
    rawAiText = aiNode.content[0].text;
  }
  
  if (rawAiText) {
    const castMatch = rawAiText.match(/\[CAST_JA:\s*(.+?)\]/i);
    if (castMatch) aiCastJa = castMatch[1].trim();

    const dirMatch = rawAiText.match(/\[DIRECTOR_JA:\s*(.+?)\]/i);
    if (dirMatch) aiDirectorJa = dirMatch[1].trim();

    aiOverview = rawAiText
      .replace(/\[CAST_JA:\s*(.+?)\]/gi, '')
      .replace(/\[DIRECTOR_JA:\s*(.+?)\]/gi, '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/\[TITLE:\s*(.+?)\]/i, '')
      .trim();
  }
}

// 5. 予告編（YouTube）の探索
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
  
  const isNoise = videoTitle.toLowerCase().includes('not currently available') || videoTitle.toLowerCase().includes('利用できません');
  if (isNoise) return false;
  
  const hasKeyword = videoTitle.toLowerCase().includes('予告') || 
                    videoTitle.toLowerCase().includes('特報') || 
                    videoTitle.toLowerCase().includes('trailer') || 
                    videoTitle.toLowerCase().includes('teaser') || 
                    videoTitle.toLowerCase().includes('preview') || 
                    videoTitle.toLowerCase().includes('예고');
  if (!hasKeyword) return false;

  const normalize = (str) => (str || '').toLowerCase().replace(/[\s\-_!\?\/\(\)\[\]]/g, '');
  const normalizedVideo = normalize(videoTitle);
  const movieTitleKeywords = [
    sourceData.title, sourceData.origin_title, result?.title, result?.original_title
  ].filter(Boolean).map(normalize);

  return movieTitleKeywords.some(keyword => keyword.length > 1 && normalizedVideo.includes(keyword));
});

const trailer_url = sourceData.trailer_url || youtubeVideo?.url || youtubeVideo?.profile?.url || null;

// 6. あらすじの確定（TMDb日本語 ➡️ AI生成日本語 ➡️ 原文英語/韓国語）
const isJapaneseText = (str) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str || '');

const rawJaOverview = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview;
const tmdbJaOverview = isJapaneseText(rawJaOverview) ? rawJaOverview : (isJapaneseText(result?.overview) ? result?.overview : null);

const rawEnOverview = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || (!isJapaneseText(result?.overview) ? result?.overview : null);
const rawKoOverview = result?.translations?.translations?.find(t => t.iso_639_1 === 'ko')?.data?.overview;
const rawForeignOverview = rawEnOverview || rawKoOverview || sourceData.overview_en || null;

const finalOverview = tmdbJaOverview || aiOverview || sourceData.overview || rawForeignOverview || null;
const originalForeignOverview = (rawForeignOverview && rawForeignOverview !== finalOverview) ? rawForeignOverview : (sourceData.overview_en || null);

// 7. タイトルの確定
const inputTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title);
const isInputTitleJapanese = isJapaneseText(inputTitle);
const isTmdbTitleJapanese = isJapaneseText(result?.title);
const tmdbJaTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.title || null;
const tmdbEnTitle = result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.title || null;
const finalTitle = sourceData.title || (isInputTitleJapanese ? inputTitle : null) || tmdbJaTitle || (isTmdbTitleJapanese ? result?.title : null) || tmdbEnTitle || result?.title || result?.original_title || null;

// 8. ジャンルの日本語化
const genreMap = {
  28: "アクション", 12: "アドベンチャー", 16: "アニメ", 35: "コメディ", 80: "犯罪",
  99: "ドキュメンタリー", 18: "ドラマ", 10751: "ファミリー", 14: "ファンタジー", 36: "歴史",
  27: "ホラー", 10402: "音楽", 9648: "ミステリー", 10749: "ロマンス", 878: "SF",
  10770: "テレビ映画", 53: "スリラー", 10752: "戦争", 37: "西部劇"
};
const rawGenreIds = result?.genre_ids || (result?.genres ? result.genres.map(g => g.id) : []);
const genres = (Array.isArray(result?.genres) && result.genres.length > 0 && result.genres[0].name)
  ? result.genres.map(g => g.name).join(', ')
  : ((Array.isArray(rawGenreIds) && rawGenreIds.length > 0) ? rawGenreIds.map(id => genreMap[id]).filter(Boolean).join(', ') : (sourceData.genres || null));

// 9. 不要な空白を除去し、自然な改行を保持
const cleanStr = (str) => {
  if (typeof str !== 'string' || !str) return null;
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
};

return [{
  json: {
    title: cleanStr(finalTitle),
    origin_title: cleanStr(sourceData.origin_title || result?.original_title || null),
    year: sourceData.year || (result?.release_date ? parseInt(result.release_date.substring(0, 4)) : null) || null,
    country,
    genres: cleanStr(genres),
    wikidata_id,
    tmdb_id,
    overview: cleanStr(finalOverview),
    overview_en: cleanStr(originalForeignOverview),
    director: cleanStr(aiDirectorJa || sourceData.director || fetchedDirector || null),
    director_en: cleanStr(sourceData.director_en || fetchedDirectorEn || null),
    cast: cleanStr(aiCastJa || sourceData.cast || fetchedCast || null),
    cast_en: cleanStr(sourceData.cast_en || fetchedCastEn || null),
    poster_url: posterPath,
    trailer_url,
  }
}];

// 実行されていないノードでも安全にデータを取得するヘルパー関数
function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || $(name).last()?.json || {}; } catch(e) { return {}; }
}

const creditsNode = getNodeData('TMDb credits取得');
const tmdbNode = getNodeData('TMDb検索');
let sourceData = {};
try {
  sourceData = $('映画ごとにループ実行').item?.json || $('映画ごとにループ実行').first()?.json || {};
} catch (e) {
  sourceData = $input.item?.json || $input.first()?.json || {};
}

const tmdb = tmdbNode;
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

if (!sourceData?.title && !result?.title && !tmdbNode?.title) return [];

// 🎯【国コード（country-master-lookup連携 ＆ 2文字ISOコード優先抽出）】
const countryLookup = getNodeData('country-master-lookup') || getNodeData('国マスター') || getNodeData('国マスター検索') || {};
const lookupCountryCode = countryLookup.countryCode || countryLookup.code || null;

const sourceCountryCode = (sourceData.countryCode && sourceData.countryCode.length === 2) ? sourceData.countryCode.toUpperCase() :
                         (sourceData.target_country && sourceData.target_country.length === 2) ? sourceData.target_country.toUpperCase() :
                         (sourceData.country && sourceData.country.length === 2) ? sourceData.country.toUpperCase() : null;

// TMDb公式製作国（ISO 3166-1 2文字コード）
const tmdbProdCountry = (Array.isArray(result?.production_countries) && result.production_countries[0]?.iso_3166_1) || 
                        (Array.isArray(tmdbNode?.production_countries) && tmdbNode.production_countries[0]?.iso_3166_1) || null;
const tmdbOriginCountry = (Array.isArray(result?.origin_country) && result.origin_country[0]) || 
                          (Array.isArray(tmdbNode?.origin_country) && tmdbNode.origin_country[0]) || null;

// 国コードの決定（国のノード country-master-lookup ➔ 入力データ ➔ TMDb公式製作国）
const country = lookupCountryCode || 
                sourceCountryCode || 
                tmdbProdCountry || 
                tmdbOriginCountry || 
                null;


// 1. ポスターURLの確定
let rawPosterPath = sourceData.poster_url || (result?.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : (tmdbNode?.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbNode.poster_path}` : null));
if (!rawPosterPath && (result?.backdrop_path || tmdbNode?.backdrop_path)) {
  rawPosterPath = `https://image.tmdb.org/t/p/w500${result?.backdrop_path || tmdbNode?.backdrop_path}`;
}
const posterPath = rawPosterPath ? (!rawPosterPath.startsWith('http') ? `https://image.tmdb.org/t/p/w500${rawPosterPath}` : rawPosterPath) : null;

// 2. TMDb ID の確定
const tmdb_id = result?.id || tmdbNode?.id || sourceData.tmdb_id || sourceData.id || null;

// 3. Wikidata ID の確定（TMDb external_ids 優先）
const tmdbExternalWikidataId = result?.external_ids?.wikidata_id || tmdbNode?.external_ids?.wikidata_id || creditsNode?.external_ids?.wikidata_id || null;
const sourceWikidataId = sourceData.wikidata_id || sourceData.wikidataId || null;
const wikidata_id = tmdbExternalWikidataId || (/^Q\d+$/.test(sourceWikidataId || '') ? sourceWikidataId : null);

// 4. IMDb ID / URL の抽出
const imdb_id = result?.external_ids?.imdb_id || tmdbNode?.external_ids?.imdb_id || creditsNode?.external_ids?.imdb_id || result?.imdb_id || sourceData.imdb_id || null;
const imdb_url = imdb_id ? `https://www.imdb.com/title/${imdb_id}/` : (sourceData.imdb_url || null);

// 5. キャスト・監督の抽出
const castArray = Array.isArray(creditsNode?.cast) ? creditsNode.cast : (Array.isArray(creditsNode?.credits?.cast) ? creditsNode.credits.cast : (Array.isArray(tmdbNode?.credits?.cast) ? tmdbNode.credits.cast : []));
const crewArray = Array.isArray(creditsNode?.crew) ? creditsNode.crew : (Array.isArray(creditsNode?.credits?.crew) ? creditsNode.credits.crew : (Array.isArray(tmdbNode?.credits?.crew) ? tmdbNode.credits.crew : []));

const directorObj = crewArray.find(c => c.job === 'Director');
const fetchedDirector = directorObj?.name || directorObj?.original_name || null;
const fetchedDirectorEn = directorObj?.original_name || directorObj?.name || null;

const fetchedCast = castArray.length > 0 ? castArray.slice(0, 10).map(c => c.name || c.original_name).filter(Boolean).join(', ') : null;
const fetchedCastEn = castArray.length > 0 ? castArray.slice(0, 10).map(c => c.original_name || c.name).filter(Boolean).join(', ') : null;

// 6. 🤖 AI（Gemini / Claude / $input）による日本語あらすじの安全抽出
let aiOverview = null;
let aiCastJa = null;
let aiDirectorJa = null;
let aiTitleJa = null;

const aiData = getNodeData('gemini_movie_db_prompt') || getNodeData('claude_movie_db_prompt') || getNodeData('gemini_movie_db') || getNodeData('claude_movie_db') || {};
const currentInput = $input.first()?.json || {};

let rawAiText = aiData?.text || aiData?.response?.text || aiData?.message?.content?.[0]?.text;
if (!rawAiText && Array.isArray(aiData?.content?.parts)) {
  rawAiText = aiData.content.parts.map(p => p.text || '').join('\n');
}
if (!rawAiText && (currentInput.content?.parts || currentInput.candidates || currentInput.text)) {
  rawAiText = currentInput.text || (Array.isArray(currentInput.content?.parts) ? currentInput.content.parts.map(p => p.text || '').join('\n') : null);
}
if (typeof aiData === 'string') {
  rawAiText = aiData;
}

if (rawAiText) {
  const titleMatch = rawAiText.match(/\[TITLE_JA:\s*(.+?)\]/i) || rawAiText.match(/\[TITLE:\s*(.+?)\]/i);
  if (titleMatch) {
    const candidate = titleMatch[1].trim();
    if (candidate && candidate !== 'なし' && candidate !== 'null' && candidate !== 'undefined') {
      aiTitleJa = candidate;
    }
  }

  const dirMatch = rawAiText.match(/\[DIRECTOR_JA:\s*(.+?)\]/i);
  if (dirMatch) {
    const candidate = dirMatch[1].trim();
    if (candidate && candidate !== 'なし' && candidate !== 'null' && candidate !== 'undefined') {
      aiDirectorJa = candidate;
    }
  }

  const castMatch = rawAiText.match(/\[CAST_JA:\s*(.+?)\]/i);
  if (castMatch) {
    const candidate = castMatch[1].trim();
    if (candidate && candidate !== 'なし' && candidate !== 'null' && candidate !== 'undefined') {
      aiCastJa = candidate;
    }
  }

  aiOverview = rawAiText
    .replace(/\[TITLE_JA:\s*(.+?)\]/gi, '')
    .replace(/\[CAST_JA:\s*(.+?)\]/gi, '')
    .replace(/\[DIRECTOR_JA:\s*(.+?)\]/gi, '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/\[TITLE:\s*(.+?)\]/gi, '')
    .trim();
}

// 予告編（YouTube）の探索
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

// 7. あらすじの確定（TMDb日本語 ➡️ AI生成日本語 ➡️ 原文英語/韓国語）
const isJapaneseText = (str) => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str || '');

const translationsList = tmdbNode?.translations?.translations || result?.translations?.translations || creditsNode?.translations?.translations || [];

// 日本語公式あらすじ
const jaTrans = translationsList.find(t => t.iso_639_1 === 'ja' && t.data?.overview?.trim());
const tmdbJaOverview = jaTrans?.data?.overview?.trim() || (isJapaneseText(result?.overview) && result?.overview?.trim() ? result.overview.trim() : (isJapaneseText(tmdbNode?.overview) && tmdbNode?.overview?.trim() ? tmdbNode.overview.trim() : null));

// 英語公式あらすじ
const enTrans = translationsList.find(t => t.iso_639_1 === 'en' && t.data?.overview?.trim());
const rawEnOverview = enTrans?.data?.overview?.trim() || (!isJapaneseText(result?.overview) && result?.overview?.trim() ? result.overview.trim() : (!isJapaneseText(tmdbNode?.overview) && tmdbNode?.overview?.trim() ? tmdbNode.overview.trim() : null));

// 韓国語・原語公式あらすじ
const koTrans = translationsList.find(t => t.iso_639_1 === 'ko' && t.data?.overview?.trim());
const rawKoOverview = koTrans?.data?.overview?.trim() || null;

// その他の言語あらすじ
const otherTrans = translationsList.find(t => t.data?.overview?.trim() && !isJapaneseText(t.data.overview));

const rawForeignOverview = rawEnOverview || rawKoOverview || otherTrans?.data?.overview?.trim() || sourceData.overview_en || null;

const finalOverview = tmdbJaOverview || aiOverview || sourceData.overview || rawForeignOverview || null;
const originalForeignOverview = (rawForeignOverview && rawForeignOverview !== finalOverview) ? rawForeignOverview : (sourceData.overview_en || rawForeignOverview || null);

// 7. タイトルの確定（日本語表記を最優先・外国語はAI翻訳/音訳を採用）
const inputTitle = (/^\d+$/.test(sourceData.title || '') ? null : sourceData.title);
const isInputTitleJapanese = isJapaneseText(inputTitle);
const tmdbJaTitle = translationsList.find(t => t.iso_639_1 === 'ja')?.data?.title?.trim() || null;
const isTmdbTitleJapanese = isJapaneseText(result?.title || tmdbNode?.title);
const tmdbTitleIfJa = isTmdbTitleJapanese ? (result?.title || tmdbNode?.title) : null;
const tmdbEnTitle = translationsList.find(t => t.iso_639_1 === 'en')?.data?.title?.trim() || null;

// 優先順位：
// 1. TMDb公式日本語邦題
// 2. 入力タイトルが既に日本語の場合
// 3. AI（Gemini/Claude）が生成した日本語タイトル（未公開映画のカタカナ音訳・邦題）
// 4. TMDbタイトルが日本語の場合
// 5. 入力タイトル
// 6. TMDb英語タイトル
// 7. TMDb原題
const finalTitle = tmdbJaTitle 
  || (isInputTitleJapanese ? inputTitle : null) 
  || aiTitleJa 
  || tmdbTitleIfJa 
  || inputTitle 
  || tmdbEnTitle 
  || result?.title 
  || tmdbNode?.title 
  || result?.original_title 
  || tmdbNode?.original_title 
  || null;

// 原題（origin_title）の確定：元の外国語/原語タイトルを確実に保持
const finalOriginTitle = sourceData.origin_title 
  || result?.original_title 
  || tmdbNode?.original_title 
  || (!isInputTitleJapanese ? inputTitle : null) 
  || finalTitle;

// 8. ジャンルの日本語化
const genreMap = {
  28: "アクション", 12: "アドベンチャー", 16: "アニメ", 35: "コメディ", 80: "犯罪",
  99: "ドキュメンタリー", 18: "ドラマ", 10751: "ファミリー", 14: "ファンタジー", 36: "歴史",
  27: "ホラー", 10402: "音楽", 9648: "ミステリー", 10749: "ロマンス", 878: "SF",
  10770: "テレビ映画", 53: "スリラー", 10752: "戦争", 37: "西部劇"
};

const rawGenreIds = result?.genre_ids || (result?.genres ? result.genres.map(g => g.id) : []);
let rawGenres = (Array.isArray(result?.genres) && result.genres.length > 0 && result.genres[0].name)
  ? result.genres.map(g => (g.id && genreMap[g.id]) ? genreMap[g.id] : g.name).join(', ')
  : ((Array.isArray(rawGenreIds) && rawGenreIds.length > 0) ? rawGenreIds.map(id => genreMap[id]).filter(Boolean).join(', ') : (sourceData.genres || null));

// TMDbの誤訳「履歴」を「歴史」に自動修正
const genres = rawGenres ? rawGenres.replace(/履歴/g, '歴史') : null;

// 9. ハングルを自動でカタカナに変換する高精度トランスレータ (全11,172文字完全対応版)
const SURNAMES_MAP = {
  '김': 'キム', '이': 'イ', '박': 'パク', '최': 'チェ', '정': 'チョン', '강': 'カン', '조': 'チョ',
  '윤': 'ユン', '장': 'チャン', '임': 'イム', '한': 'ハン', '오': 'オ', '서': 'ソ', '신': 'シン',
  '권': 'クォン', '황': 'ファン', '안': 'アン', '송': 'ソン', '류': 'リュ', '홍': 'ホン', '고': 'コ',
  '문': 'ムン', '양': 'ヤン', '손': 'ソン', '배': 'ペ', '백': 'ペク', '허': 'ホ', '유': 'ユ',
  '남': 'ナム', '심': 'シム', '노': 'ノ', '하': 'ハ', '곽': 'クァク', '성': 'ソン', '차': 'チャ',
  '주': 'チュ', '우': 'ウ', '구': 'ク', '민': 'ミン', '진': 'チン', '지': 'チ', '엄': 'オム',
  '채': 'チェ', '원': 'ウォン', '천': 'チョン', '방': 'パン', '공': 'コン', '현': 'ヒョン',
  '함': 'ハム', '변': 'ピョン', '염': 'ヨム', '여': 'ヨ', '추': 'チュ', '도': 'ト', '소': 'ソ',
  '석': 'ソク', '선': 'ソン', '설': 'ソル', 'マ': 'マ', '길': 'キル', '연': 'ヨン', '위': 'ウィ',
  '표': 'ピョ', '명': 'ミョン', '기': 'キ', '반': 'パン', '왕': 'ワン', '금': 'クム', '옥': 'オク',
  '육': 'ユク', '인': 'イン', '맹': 'メン', '제': 'チェ', '모': 'モ', '탁': 'タク', '국': 'クク'
};

const JUNG_VOWELS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const JONG_KATA = ['', 'ク', 'ク', 'クス', 'ン', 'ンジ', 'ンハ', 'ト', 'ル', 'ルク', 'ルム', 'ルプ', 'ルス', 'ルト', 'ルプ', 'ルハ', 'ム', 'プ', 'プス', 'ス', 'ス', 'ン', 'ト', 'チ', 'ク', 'ト', 'プ', 'ハ'];

const SYLLABLE_COMBOS = {
  'a': 'ア', 'ae': 'エ', 'ya': 'ヤ', 'yae': 'イェ', 'eo': 'オ', 'e': 'エ', 'yeo': 'ヨ', 'ye': 'イェ',
  'o': 'オ', 'wa': 'ワ', 'wae': 'ウェ', 'oe': 'ウェ', 'yo': 'ヨ', 'u': 'ウ', 'wo': 'ウォ', 'we': 'ウェ',
  'wi': 'ウィ', 'yu': 'ユ', 'eu': 'ウ', 'ui': 'ウィ', 'i': 'イ',

  'ka': 'カ', 'kae': 'ケ', 'kya': 'キャ', 'kyae': 'キェ', 'keo': 'コ', 'ke': 'ケ', 'kyeo': 'キョ', 'kye': 'キェ',
  'ko': 'コ', 'kwa': 'クァ', 'kwae': 'クェ', 'koe': 'クェ', 'kyo': 'キョ', 'ku': 'ク', 'kwo': 'クォ', 'kwe': 'クェ',
  'kwi': 'クィ', 'kyu': 'キュ', 'keu': 'ク', 'kui': 'クィ', 'ki': 'キ',

  'na': 'ナ', 'nae': 'ネ', 'nya': 'ニャ', 'nyae': 'ニェ', 'neo': 'ノ', 'ne': 'ネ', 'nyeo': 'ニョ', 'nye': 'ニェ',
  'no': 'ノ', 'nwa': 'ヌァ', 'nwae': 'ヌェ', 'noe': 'ヌェ', 'nyo': 'ニョ', 'nu': 'ヌ', 'nwo': 'ヌォ', 'nwe': 'ヌェ',
  'nwi': 'ヌィ', 'nyu': 'ニュ', 'neu': 'ヌ', 'nui': 'ヌィ', 'ni': 'ニ',

  'ta': 'タ', 'tae': 'テ', 'tya': 'チャ', 'tyae': 'チェ', 'teo': 'ト', 'te': 'テ', 'tyeo': 'チョ', 'tye': 'チェ',
  'to': 'ト', 'twa': 'トァ', 'twae': 'トェ', 'toe': 'トェ', 'tyo': 'チョ', 'tu': 'トゥ', 'two': 'トゥォ', 'twe': 'トゥェ',
  'twi': 'トゥィ', 'tyu': 'テュ', 'teu': 'トゥ', 'tui': 'トゥィ', 'ti': 'ティ',

  'ra': 'ラ', 'rae': 'レ', 'rya': 'リャ', 'ryae': 'リェ', 'reo': 'ロ', 're': 'レ', 'ryeo': 'リョ', 'rye': 'リェ',
  'ro': 'ロ', 'rwa': 'ルァ', 'rwae': 'ルェ', 'roe': 'ルェ', 'ryo': 'リョ', 'ru': 'ル', 'rwo': 'ルォ', 'rwe': 'ルェ',
  'rwi': 'ルィ', 'ryu': 'リュ', 'reu': 'ル', 'rui': 'ルィ', 'ri': 'リ',

  'ma': 'マ', 'mae': 'メ', 'mya': 'ミャ', 'myae': 'ミェ', 'meo': 'モ', 'me': 'メ', 'myeo': 'ミョ', 'mye': 'ミェ',
  'mo': 'モ', 'mwa': 'ムァ', 'mwae': 'ムェ', 'moe': 'ムェ', 'myo': 'ミョ', 'mu': 'ム', 'mwo': 'ムォ', 'mwe': 'ムェ',
  'mwi': 'ムィ', 'myu': 'ミュ', 'meu': 'ム', 'mui': 'ムィ', 'mi': 'ミ',

  'pa': 'パ', 'pae': 'ペ', 'pya': 'ピャ', 'pyae': 'ピェ', 'peo': 'ポ', 'pe': 'ペ', 'pyeo': 'ピョ', 'pye': 'ピェ',
  'po': 'ポ', 'pwa': 'プァ', 'pwae': 'プェ', 'poe': 'プェ', 'pyo': 'ピョ', 'pu': 'プ', 'pwo': 'プォ', 'pwe': 'プェ',
  'pwi': 'プィ', 'pyu': 'ピュ', 'peu': 'プ', 'pui': 'プィ', 'pi': 'ピ',

  'sa': 'サ', 'sae': 'セ', 'sya': 'シャ', 'syae': 'シェ', 'seo': 'ソ', 'se': 'セ', 'syeo': 'ショ', 'sye': 'シェ',
  'so': 'ソ', 'swa': 'スァ', 'swae': 'スェ', 'soe': 'スェ', 'syo': 'ショ', 'su': 'ス', 'swo': 'スォ', 'swe': 'スェ',
  'swi': 'スィ', 'syu': 'シュ', 'seu': 'ス', 'sui': 'スィ', 'si': 'シ',

  'ja': 'チャ', 'jae': 'チェ', 'jya': 'チャ', 'jyae': 'チェ', 'jeo': 'チョ', 'je': 'チェ', 'jyeo': 'チョ', 'jye': 'チェ',
  'jo': 'チョ', 'jwa': 'チョァ', 'jwae': 'チェ', 'joe': 'チェ', 'jyo': 'チョ', 'ju': 'チュ', 'jwo': 'チョォ', 'jwe': 'チェ',
  'jwi': 'チュィ', 'jyu': 'チュ', 'jeu': 'チュ', 'jui': 'チュィ', 'ji': 'チ',

  'cha': 'チャ', 'chae': 'チェ', 'chya': 'チャ', 'chyae': 'チェ', 'cheo': 'チョ', 'che': 'チェ', 'chyeo': 'チョ', 'chye': 'チェ',
  'cho': 'チョ', 'chwa': 'チャ', 'chwae': 'チェ', 'choe': 'チェ', 'chyo': 'チョ', 'chu': 'チュ', 'chwo': 'チョ', 'chwe': 'チェ',
  'chwi': 'チュィ', 'chyu': 'チュ', 'cheu': 'チュ', 'chui': 'チュィ', 'chi': 'チ',

  'ha': 'ハ', 'hae': 'ヘ', 'hya': 'ヒャ', 'hyae': 'ヒェ', 'heo': 'ホ', 'he': 'ヘ', 'hyeo': 'ヒョ', 'hye': 'ヒェ',
  'ho': 'ホ', 'hwa': 'ファ', 'hwae': 'フェ', 'hoe': 'フェ', 'hyo': 'ヒョ', 'hu': 'フ', 'hwo': 'フォ', 'hwe': 'フェ',
  'hwi': 'フィ', 'hyu': 'ヒュ', 'heu': 'フ', 'hui': 'フィ', 'hi': 'ヒ'
};

function hangulToKatakanaChar(char) {
  const code = char.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return char;

  const choIdx = Math.floor(code / 588);
  const jungIdx = Math.floor((code % 588) / 28);
  const jongIdx = code % 28;

  const choKey = ['k', 'k', 'n', 't', 't', 'r', 'm', 'p', 'p', 's', 's', '', 'j', 'j', 'ch', 'k', 't', 'p', 'h'][choIdx];
  const jungKey = JUNG_VOWELS[jungIdx];
  const jongKata = JONG_KATA[jongIdx] || '';

  const comboKey = choKey + jungKey;
  const baseKata = SYLLABLE_COMBOS[comboKey] || char;

  return baseKata + jongKata;
}

const SPECIAL_NAMES = {
  '지니': 'ジニ',
  'ジ・ニ': 'ジニ',
  'アイ・ユー': 'アイユー',
  '아이유': 'アイユー',
  '수지': 'スジ',
  '보아': 'BoA',
  '싸이': 'PSY',
  '원ビン': 'ウォンビン',
  '현빈': 'ヒョンビン',
  '비': 'ピ',
  '태양': 'テヤン',
  '지드래곤': 'G-DRAGON',
  '윤아': 'ユナ',
  '서현': 'ソヒョン',
  '유리': 'ユリ',
  '수영': 'スヨン',
  '효연': 'ヒョヨン',
  '써니': 'サニー',
  '티파니': 'ティファニー',
  '태연': 'テヨン',
  '공유': 'コン・ユ'
};

const toKatakanaIfHangul = (text) => {
  if (!text || typeof text !== 'string') return text;
  let converted = text.split(/([,/、\n\s|]+)/).map(segment => {
    if (/^[,/、\n\s|]+$/.test(segment)) return segment;
    const trimmed = segment.trim();
    if (SPECIAL_NAMES[trimmed]) return SPECIAL_NAMES[trimmed];
    if (!/[\uac00-\ud7af]/.test(trimmed)) return segment;

    const chars = Array.from(trimmed);
    if (chars.length >= 2 && SURNAMES_MAP[chars[0]]) {
      const surname = SURNAMES_MAP[chars[0]];
      const givenChars = chars.slice(1);
      const given = givenChars.map(c => /[\uac00-\ud7af]/.test(c) ? hangulToKatakanaChar(c) : c).join('');
      return `${surname}・${given}`;
    }
    return chars.map(c => /[\uac00-\ud7af]/.test(c) ? hangulToKatakanaChar(c) : c).join('');
  }).join('').replace(/,\s*/g, ', ');

  converted = converted
    .replace(/(^|[,/、\n\s|])ジョ・/g, '$1チョ・')
    .replace(/(^|[,/、\n\s|])ジュ・/g, '$1チュ・')
    .replace(/(^|[,/、\n\s|])ジャ・/g, '$1チャ・')
    .replace(/(^|[,/、\n\s|])ジ・ニ(?=[,/、\n\s|]|$)/g, '$1ジニ');

  return converted;
};

// 不要な空白を除去し、自然な改行を保持
const cleanStr = (str) => {
  if (typeof str !== 'string' || !str) return null;
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
};

const cleanPerson = (val) => {
  const cleaned = cleanStr(val);
  if (!cleaned || cleaned === 'なし' || cleaned === 'null' || cleaned === 'undefined') return null;
  return cleaned;
};

const finalDirector = toKatakanaIfHangul(aiDirectorJa || sourceData.director || fetchedDirector || null)?.replace(/_/g, '・');
const finalCast = toKatakanaIfHangul(aiCastJa || sourceData.cast || fetchedCast || null)?.replace(/_/g, '・');

return [{
  json: {
    title: cleanStr(finalTitle),
    origin_title: cleanStr(finalOriginTitle),
    year: sourceData.year || (result?.release_date ? parseInt(result.release_date.substring(0, 4)) : null) || null,
    country,
    genres: cleanStr(genres),
    wikidata_id,
    tmdb_id,
    director: cleanPerson(finalDirector),
    director_en: cleanPerson(sourceData.director_en || fetchedDirectorEn || null),
    cast: cleanPerson(finalCast),
    cast_en: cleanPerson(sourceData.cast_en || fetchedCastEn || null),
    overview: cleanStr(finalOverview),
    overview_en: cleanStr(originalForeignOverview),
    poster_url: posterPath,
    trailer_url,
    imdb_id,
    imdb_url
  }
}];

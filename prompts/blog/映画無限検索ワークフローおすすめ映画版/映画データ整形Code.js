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

// 2. 🎯 本物の Wikidata ID（QID）& IMDb ID の抽出
let wikidata_id = null;
const tmdbWikiId = result?.external_ids?.wikidata_id || tmdb?.external_ids?.wikidata_id;
if (tmdbWikiId && /^Q\d+$/.test(tmdbWikiId)) {
  wikidata_id = tmdbWikiId;
} else if (sourceData.wikidata_id && /^Q\d+$/.test(sourceData.wikidata_id) && !sourceData.wikidata_id.startsWith('Q_TMDB_')) {
  wikidata_id = sourceData.wikidata_id;
}

const tmdbImdbId = result?.external_ids?.imdb_id || tmdb?.external_ids?.imdb_id;
let imdb_id = (tmdbImdbId && /^tt\d+$/.test(tmdbImdbId)) ? tmdbImdbId : (sourceData.imdb_id || null);
const imdb_url = imdb_id ? `https://www.imdb.com/title/${imdb_id}/` : (sourceData.imdb_url || null);

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
con// 9. ハングルを自動でカタカナに変換する高精度トランスレータ (全11,172文字完全対応版)
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

const toKatakanaIfHangul = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.split(/([,/、\n\s|]+)/).map(segment => {
    if (/^[,/、\n\s|]+$/.test(segment)) return segment;
    const trimmed = segment.trim();
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
}; '유': 'ユ', '야': 'ヤ', '여': 'ヨ', '예': 'イェ',
  '경': 'ギョン', '정': 'チョン', '성': 'ソン', '영': 'ヨン', '명': 'ミョン', '병': 'ビョン', '형': 'ヒョン', '종': 'ジョン', '용': 'ヨン', '동': 'ドン', '봉': 'ボン', '송': 'ソン', '홍': 'ホン',
  '강': 'カン', '상': 'サン', '장': 'チャン', '방': 'パン', '광': 'クァン', '창': 'チャン', '황': 'ファン', '양': 'ヤン', '당': 'ダン', '망': 'マン', '항': 'ハン',
  '진': 'ジン', '민': 'ミン', '신': 'シン', '인': 'イン', '빈': 'ビン', '린': 'リン', '은': 'ウン', '윤': 'ユン', '준': 'ジュン', '순': 'スン', '훈': 'フン', '문': 'ムン',
  '원': 'ウォン', '권': 'クォン', '선': 'ソン', '연': 'ヨン', '현': 'ヒョン', '건': 'ゴン', '전': 'チョン', '천': 'チョン', '변': 'ピョン', '련': 'リョン',
  '석': 'ソク', '혁': 'ヒョク', '익': 'イク', '식': 'シク', '직': 'ジク', '복': 'ボク', '득': 'ドゥク', '록': 'ロク', '옥': 'オク', '덕': 'ドク', '백': 'ペク', '택': 'テク',
  '열': 'ヨル', '철': 'チョル', '일': 'イル', '필': 'ピル', '길': 'キル', '달': 'ダル', '팔': 'パル', '환': 'ファン', '관': 'クァン', '완': 'ウォン', '솔': 'ソル', '한': 'ハン',
  '중': 'ジュン', '담': 'ダム', '희': 'ヒ', '의': 'ウィ', '의성': 'ウィソン', '유진': 'ユジン'
};

const toKatakanaIfHangul = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.split(/([,/、\n]+)/).map(segment => {
    if (/^[,/、\n]+$/.test(segment)) return segment;
    const trimmed = segment.trim();
    if (!/[\uac00-\ud7af]/.test(trimmed)) return trimmed;

    const chars = Array.from(trimmed);
    if (chars.length >= 2 && SURNAMES_MAP[chars[0]]) {
      const surname = SURNAMES_MAP[chars[0]];
      const givenChars = chars.slice(1);
      const given = givenChars.map(c => SYLLABLES_MAP[c] || c).join('');
      return `${surname}・${given}`;
    }
    return chars.map(c => SYLLABLES_MAP[c] || c).join('');
  }).join('').replace(/,\s*/g, ', ');
};

// 不要な空白を除去し、自然な改行を保持
const cleanStr = (str) => {
  if (typeof str !== 'string' || !str) return null;
  return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
};

const finalDirector = toKatakanaIfHangul(aiDirectorJa || sourceData.director || fetchedDirector || null);
const finalCast = toKatakanaIfHangul(aiCastJa || sourceData.cast || fetchedCast || null);

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
    director: cleanStr(finalDirector),
    director_en: cleanStr(sourceData.director_en || fetchedDirectorEn || null),
    cast: cleanStr(finalCast),
    cast_en: cleanStr(sourceData.cast_en || fetchedCastEn || null),
    poster_url: posterPath,
    trailer_url,
    imdb_id,
    imdb_url
  }
}];

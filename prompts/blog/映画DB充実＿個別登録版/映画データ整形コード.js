/**
 * 【n8n用】映画データ整形コード（Supabase既存データ最優先保護・Wikidata QID強固自動取得版）
 * 
 * 役割: Supabaseに保存されている完成済み既存データ（カタカナキャスト・日本語監督名・あらすじ等）を最優先で保護し、
 *       TMDB external_ids から Wikidata QID (Q16930989 等) を自動取得します。
 */

function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || $(nodeName).item?.json || {};
  } catch (e) {
    return {};
  }
}

const credits = getNodeData('TMDb credits取得');
const t1 = getNodeData('TMDb検索');
const t2 = getNodeData('TMDb検索_タイトル');
const wikiNode = getNodeData('Wikidata検索') || getNodeData('Wikidata') || {};
const existingDb = getNodeData('Supabaseから既存データを取得');

const resultsList = [
  ...(t1?.results || t1?.movie_results || t1?.tv_results || (t1?.id ? [t1] : [])),
  ...(t2?.results || t2?.movie_results || t2?.tv_results || (t2?.id ? [t2] : []))
];

let sourceData = {};
function getSourceNodeData() {
  const isValid = (d) => d && (d.title || d.country || d.target_country || d.overview || d.query || d.id || d.tmdb_id || d.wikidata_id || d.qid);
  
  let d = $input.first()?.json || $input.item?.json;
  if (isValid(d)) return d;

  try {
    d = $('入力統一・分割コード').first()?.json || $('入力統一・分割コード').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  try {
    d = $('On form submission1').first()?.json || $('On form submission1').item?.json;
    if (isValid(d)) return d;
  } catch (e) {}
  
  return $input.first()?.json || $input.item?.json || {};
}
sourceData = getSourceNodeData();

const correctMovieId = credits?.id;

// 対象国と言語にマッチする映画・ドラマを検索結果（resultsList）から探す
let result = null;
if (correctMovieId && resultsList.length > 0) {
  result = resultsList.find(m => m.id === correctMovieId);
}
if (!result && resultsList.length > 0) {
  result = resultsList[0];
}

// 日本語判定関数
const isJapanese = (str) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(str || '');

// 数字のみの文字列（"282631"等のID）をタイトル候補から除外する関数
const isCleanTitle = (t) => t && !/^\d+$/.test(String(t).trim());

// 🎯【タイトル決定】（数字IDは排除し、本物の映画タイトルを最優先選択）
const movieTitle = 
  (isCleanTitle(existingDb.title) ? existingDb.title : null) ||
  (isCleanTitle(sourceData.title) ? sourceData.title : null) ||
  (isCleanTitle(sourceData.name) ? sourceData.name : null) ||
  (isCleanTitle(result?.title) ? result.title : null) ||
  (isCleanTitle(result?.name) ? result.name : null) ||
  (isCleanTitle(credits.title) ? credits.title : null) ||
  (isCleanTitle(credits.name) ? credits.name : null) ||
  (isCleanTitle(t1.title) ? t1.title : null) ||
  (isCleanTitle(t1.name) ? t1.name : null) ||
  (isCleanTitle(t2.title) ? t2.title : null) ||
  (isCleanTitle(t2.name) ? t2.name : null) ||
  (isCleanTitle(sourceData.query) ? sourceData.query : null) ||
  '';

if (!movieTitle && !credits.id && !existingDb.id) return [];

const langToCountry = {
  'ko': 'KR', 'ja': 'JP', 'en': 'US', 'fr': 'FR', 'de': 'DE',
  'zh': 'CN', 'ar': 'SA', 'fa': 'IR', 'hi': 'IN', 'th': 'TH',
  'vi': 'VN', 'id': 'ID', 'tr': 'TR', 'ru': 'RU', 'es': 'ES',
  'pt': 'BR', 'it': 'IT', 'nl': 'NL', 'pl': 'PL', 'da': 'DK',
  'sv': 'SE', 'nb': 'NO', 'fi': 'FI',
};
const nameToCountryCode = {
  'ブータン': 'BT', '韓国': 'KR', '大韓民国': 'KR', 'アメリカ': 'US',
  'アメリカ合衆国': 'US', '日本': 'JP', 'フランス': 'FR', 'ドイツ': 'DE',
  '中国': 'CN', '中華人民共和国': 'CN', 'インド': 'IN', 'イギリス': 'GB',
  'グレートブリテン': 'GB', 'イタリア': 'IT', 'カナダ': 'CA', 'オーストラリア': 'AU',
  'スペイン': 'ES', 'ロシア': 'RU', 'ロシア連邦': 'RU', '台湾': 'TW',
  'タイ': 'TH', 'ベトナム': 'VN', 'インドネシア': 'ID', 'トルコ': 'TR',
  'ブラジル': 'BR', 'メキシコ': 'MX', 'ニュージーランド': 'NZ',
};

const lang = result?.original_language || credits.original_language;

let rawCountry = sourceData.target_country || sourceData.country || existingDb.country || '';
if (nameToCountryCode[rawCountry]) {
  rawCountry = nameToCountryCode[rawCountry];
}

const tmdbOriginCountry = (Array.isArray(result?.origin_country) && result.origin_country[0]) || (Array.isArray(credits?.origin_country) && credits.origin_country[0]) || (typeof result?.origin_country === 'string' ? result.origin_country : null);

const finalCountry = 
  existingDb.country ||
  rawCountry || 
  tmdbOriginCountry || 
  (lang ? langToCountry[lang] : null) || 
  '';

// 🎯【監督/制作陣の安全マージ & 重複除去】
let directorName = '';
let directorEnName = '';

if (Array.isArray(credits.crew) && credits.crew.length > 0) {
  const directors = credits.crew.filter(c => c.job === 'Director');
  const execProducers = credits.crew.filter(c => c.job === 'Executive Producer');
  const dirList = directors.length > 0 ? directors : (execProducers.length > 0 ? execProducers : []);
  
  if (dirList.length > 0) {
    directorName = Array.from(new Set(dirList.map(c => c.name).filter(Boolean))).join(', ');
    directorEnName = Array.from(new Set(dirList.map(c => c.original_name || c.name).filter(Boolean))).join(', ');
  }
}
if (!directorName && Array.isArray(credits.created_by) && credits.created_by.length > 0) {
  directorName = Array.from(new Set(credits.created_by.map(c => c.name).filter(Boolean))).join(', ');
  directorEnName = Array.from(new Set(credits.created_by.map(c => c.original_name || c.name).filter(Boolean))).join(', ');
}

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
  '석': 'ソク', '선': 'ソン', '설': 'ソル', '마': 'マ', '길': 'キル', '연': 'ヨン', '위': 'ウィ',
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
  '원빈': 'ウォンビン',
  '현빈': 'ヒョンビン',
  '비': 'ピ',
  '태양': 'テヤン',
  '지드래ゴン': 'G-DRAGON',
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

  // 韓国人名における英語表記ゆれ（ジョ・➔チョ・、ジュ・➔チュ・、ジ・ニ➔ジニ等）の自動クレンジング
  converted = converted
    .replace(/(^|[,/、\n\s|])ジョ・/g, '$1チョ・')
    .replace(/(^|[,/、\n\s|])ジュ・/g, '$1チュ・')
    .replace(/(^|[,/、\n\s|])ジャ・/g, '$1チャ・')
    .replace(/(^|[,/、\n\s|])ジ・ニ(?=[,/、\n\s|]|$)/g, '$1ジニ');

  return converted;
};

const rawDirector = (existingDb.director && isJapanese(existingDb.director)) ? existingDb.director : (directorName || existingDb.director || '');
const finalDirector = toKatakanaIfHangul(rawDirector);
const finalDirectorEn = existingDb.director_en || directorEnName || '';

// 🎯【キャスト一覧の安全マージ & 重複除去】
const tmdbCastNames = (Array.isArray(credits.cast) && credits.cast.length > 0)
  ? Array.from(new Set(credits.cast.map(c => c.name).filter(Boolean))).join(', ')
  : '';

const tmdbCastEnNames = (Array.isArray(credits.cast) && credits.cast.length > 0)
  ? Array.from(new Set(credits.cast.map(c => c.original_name || c.name).filter(Boolean))).join(', ')
  : '';

const rawCast = (existingDb.cast && isJapanese(existingDb.cast)) ? existingDb.cast : (tmdbCastNames || existingDb.cast || '');
const finalCast = toKatakanaIfHangul(rawCast);
const finalCastEn = existingDb.cast_en || tmdbCastEnNames || '';

// 🎯【原題の安全マージ】(既存DB ➔ TMDb)
const tmdbOrigTitle = result?.original_title || result?.original_name || credits.original_title || credits.original_name || '';
const finalOriginTitle = existingDb.origin_title || tmdbOrigTitle || movieTitle;

// 🎯【あらすじ (overview / overview_en) の安全継承 & 英語・原語あらすじの自動抽出】
const rawJaOverview = credits?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview || result?.translations?.translations?.find(t => t.iso_639_1 === 'ja')?.data?.overview;
const tmdbJaOverview = isJapanese(rawJaOverview) ? rawJaOverview : (isJapanese(credits?.overview) ? credits.overview : (isJapanese(result?.overview) ? result.overview : null));

const rawEnOverview = credits?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || result?.translations?.translations?.find(t => t.iso_639_1 === 'en')?.data?.overview || (!isJapanese(credits?.overview) ? credits?.overview : (!isJapanese(result?.overview) ? result?.overview : null));
const rawKoOverview = credits?.translations?.translations?.find(t => t.iso_639_1 === 'ko')?.data?.overview || result?.translations?.translations?.find(t => t.iso_639_1 === 'ko')?.data?.overview;
const rawForeignOverview = rawEnOverview || rawKoOverview || sourceData.overview_en || credits.overview_en || null;

const finalOverview = (existingDb.overview && isJapanese(existingDb.overview)) ? existingDb.overview : (tmdbJaOverview || sourceData.overview || null);
const finalOverviewEn = existingDb.overview_en || rawForeignOverview || '';

// 🎯【ポスターURL (poster_url) の自動構築】
const rawPoster = credits.poster_path || result?.poster_path || existingDb.poster_url || existingDb.poster_path || '';
const finalPosterUrl = rawPoster ? (rawPoster.startsWith('http') ? rawPoster : `https://image.tmdb.org/t/p/w500${rawPoster}`) : '';

// 🎯【Wikidata ID (QID) の強固な自動抽出】
// APIから新しく取れたQIDを最優先保護（Supabaseの古いnullデータによる上書き消滅を100%ブロック）
const freshQid = 
  credits.external_ids?.wikidata_id || 
  credits.wikidata_id || 
  result?.external_ids?.wikidata_id || 
  t1?.external_ids?.wikidata_id || 
  t2?.external_ids?.wikidata_id || 
  wikiNode.qid || 
  wikiNode.wikidata_id || 
  wikiNode.id || 
  null;

let fetchedWikidataId = freshQid || existingDb.wikidata_id || sourceData.wikidata_id || sourceData.qid || null;

// 🎬【YouTube 予告編の安全継承（日本国内再生可能な動画のみ採用）】
let finalTrailerUrl = '';
let finalTrailerTitle = '';

const tmdbVideos = credits.videos?.results || credits.videos || result?.videos?.results || [];
if (Array.isArray(tmdbVideos) && tmdbVideos.length > 0) {
  // 日本語の公式予告編のみ抽出（海外動画はジオブロックされるため除外）
  const jpTrailer = tmdbVideos.find(v => v.site === 'YouTube' && (v.iso_639_1 === 'ja' || v.iso_3166_1 === 'JP') && (v.type === 'Trailer' || v.type === 'Teaser'));
  if (jpTrailer && jpTrailer.key) {
    finalTrailerUrl = `https://www.youtube.com/watch?v=${jpTrailer.key}`;
    finalTrailerTitle = jpTrailer.name || `${movieTitle} 公式予告編`;
  }
}

if (existingDb.trailer_url && existingDb.trailer_url.includes('watch?v=')) {
  finalTrailerUrl = existingDb.trailer_url;
  finalTrailerTitle = existingDb.trailer_title || `${movieTitle} 予告編`;
} else if (!finalTrailerUrl) {
  // 海外ジオブロック動画を回避し、日本検索リンクをフォールバックに設定
  const searchQuery = encodeURIComponent(`${movieTitle} 予告編`);
  finalTrailerUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
  finalTrailerTitle = `${movieTitle} 予告編 (YouTubeで検索)`;
}

// 🎯【ジャンル (genres) の抽出・継承】
const genreIdMap = {
  28: 'アクション', 12: 'アドベンチャー', 16: 'アニメ', 35: 'コメディ', 80: '犯罪',
  99: 'ドキュメンタリー', 18: 'ドラマ', 10751: 'ファミリー', 14: 'ファンタジー', 36: '歴史',
  27: 'ホラー', 10402: '音楽', 9648: 'ミステリー', 10749: 'ロマンス', 878: 'SF',
  10770: 'テレビ映画', 53: 'スリラー', 10752: '戦争', 37: '西部劇',
  10759: 'アクション', 10762: 'キッズ', 10765: 'SF', 10768: '戦争'
};

let finalGenres = '';
const tmdbGenreObjs = credits.genres || result?.genres;
if (Array.isArray(tmdbGenreObjs) && tmdbGenreObjs.length > 0) {
  finalGenres = tmdbGenreObjs.map(g => g.name).join(', ');
} else if (Array.isArray(result?.genre_ids) && result.genre_ids.length > 0) {
  finalGenres = result.genre_ids.map(id => genreIdMap[id]).filter(Boolean).join(', ');
}
finalGenres = existingDb.genres || finalGenres || sourceData.genres || '';

const isExisting = existingDb && (existingDb.id || existingDb.created_at);
let updateReason = isExisting ? 'データ補完・更新' : '新規登録';

const releaseDateStr = result?.release_date || result?.first_air_date || credits.release_date || credits.first_air_date || sourceData.year || existingDb.year || '';

// 🎯【IMDb ID / URL の自動抽出】
const imdbId = credits.external_ids?.imdb_id || result?.external_ids?.imdb_id || t1?.external_ids?.imdb_id || t2?.external_ids?.imdb_id || existingDb.imdb_id || null;
const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : (existingDb.imdb_url || null);

return [{
  json: {
    idx: existingDb.idx || sourceData.idx || null,
    created_at: existingDb.created_at || sourceData.created_at || null,
    country: finalCountry,
    year: String(releaseDateStr).substring(0, 4),
    genres: finalGenres,

    wikidata_id: fetchedWikidataId,
    tmdb_id: credits.id || result?.id || sourceData.tmdb_id || sourceData.id || existingDb.tmdb_id,

    title: movieTitle,
    origin_title: finalOriginTitle,

    director: finalDirector,
    director_en: finalDirectorEn,
    cast: finalCast,
    cast_en: finalCastEn,

    overview: finalOverview,
    overview_en: finalOverviewEn,

    poster_path: rawPoster,
    poster_url: finalPosterUrl,
    backdrop_path: credits.backdrop_path || result?.backdrop_path || existingDb.backdrop_path || '',
    trailer_url: finalTrailerUrl,
    trailer_title: finalTrailerTitle,

    imdb_id: imdbId,
    imdb_url: imdbUrl,

    raw_response: isExisting ? { status: updateReason, id: existingDb.id } : { status: updateReason }
  }
}];

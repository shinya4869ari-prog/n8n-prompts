// Refined complete Hangul to Katakana mathematical converter

const CHO_KATA = ['カ', 'ッカ', 'ナ', 'タ', 'ッタ', 'ラ', 'マ', 'パ', 'ッパ', 'サ', 'ッサ', '', 'チャ', 'ッチャ', 'チャ', 'カ', 'タ', 'パ', 'ハ'];
const JUNG_VOWELS = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const JONG_KATA = ['', 'ク', 'ク', 'クス', 'ン', 'ンジ', 'ンハ', 'ト', 'ル', 'ルク', 'ルム', 'ルプ', 'ルス', 'ルト', 'ルプ', 'ルハ', 'ム', 'プ', 'プス', 'ス', 'ス', 'ン', 'ト', 'チ', 'ク', 'ト', 'プ', 'ハ'];

const SYLLABLE_COMBOS = {
  // 母音単独（初声なし: ㅇ）
  'a': 'ア', 'ae': 'エ', 'ya': 'ヤ', 'yae': 'イェ', 'eo': 'オ', 'e': 'エ', 'yeo': 'ヨ', 'ye': 'イェ',
  'o': 'オ', 'wa': 'ワ', 'wae': 'ウェ', 'oe': 'ウェ', 'yo': 'ヨ', 'u': 'ウ', 'wo': 'ウォ', 'we': 'ウェ',
  'wi': 'ウィ', 'yu': 'ユ', 'eu': 'ウ', 'ui': 'ウィ', 'i': 'イ',

  // ㄱ (k/g)
  'ka': 'カ', 'kae': 'ケ', 'kya': 'キャ', 'kyae': 'キェ', 'keo': 'コ', 'ke': 'ケ', 'kyeo': 'キョ', 'kye': 'キェ',
  'ko': 'コ', 'kwa': 'クァ', 'kwae': 'クェ', 'koe': 'クェ', 'kyo': 'キョ', 'ku': 'ク', 'kwo': 'クォ', 'kwe': 'クェ',
  'kwi': 'クィ', 'kyu': 'キュ', 'keu': 'ク', 'kui': 'クィ', 'ki': 'キ',

  // ㄴ (n)
  'na': 'ナ', 'nae': 'ネ', 'nya': 'ニャ', 'nyae': 'ニェ', 'neo': 'ノ', 'ne': 'ネ', 'nyeo': 'ニョ', 'nye': 'ニェ',
  'no': 'ノ', 'nwa': 'ヌァ', 'nwae': 'ヌェ', 'noe': 'ヌェ', 'nyo': 'ニョ', 'nu': 'ヌ', 'nwo': 'ヌォ', 'nwe': 'ヌェ',
  'nwi': 'ヌィ', 'nyu': 'ニュ', 'neu': 'ヌ', 'nui': 'ヌィ', 'ni': 'ニ',

  // ㄷ (t/d)
  'ta': 'タ', 'tae': 'テ', 'tya': 'チャ', 'tyae': 'チェ', 'teo': 'ト', 'te': 'テ', 'tyeo': 'チョ', 'tye': 'チェ',
  'to': 'ト', 'twa': 'トァ', 'twae': 'トェ', 'toe': 'トェ', 'tyo': 'チョ', 'tu': 'トゥ', 'two': 'トゥォ', 'twe': 'トゥェ',
  'twi': 'トゥィ', 'tyu': 'テュ', 'teu': 'トゥ', 'tui': 'トゥィ', 'ti': 'ティ',

  // ㄹ (r/l)
  'ra': 'ラ', 'rae': 'レ', 'rya': 'リャ', 'ryae': 'リェ', 'reo': 'ロ', 're': 'レ', 'ryeo': 'リョ', 'rye': 'リェ',
  'ro': 'ロ', 'rwa': 'ルァ', 'rwae': 'ルェ', 'roe': 'ルェ', 'ryo': 'リョ', 'ru': 'ル', 'rwo': 'ルォ', 'rwe': 'ルェ',
  'rwi': 'ルィ', 'ryu': 'リュ', 'reu': 'ル', 'rui': 'ルィ', 'ri': 'リ',

  // ㅁ (m)
  'ma': 'マ', 'mae': 'メ', 'mya': 'ミャ', 'myae': 'ミェ', 'meo': 'モ', 'me': 'メ', 'myeo': 'ミョ', 'mye': 'ミェ',
  'mo': 'モ', 'mwa': 'ムァ', 'mwae': 'ムェ', 'moe': 'ムェ', 'myo': 'ミョ', 'mu': 'ム', 'mwo': 'ムォ', 'mwe': 'ムェ',
  'mwi': 'ムィ', 'myu': 'ミュ', 'meu': 'ム', 'mui': 'ムィ', 'mi': 'ミ',

  // ㅂ (p/b)
  'pa': 'パ', 'pae': 'ペ', 'pya': 'ピャ', 'pyae': 'ピェ', 'peo': 'ポ', 'pe': 'ペ', 'pyeo': 'ピョ', 'pye': 'ピェ',
  'po': 'ポ', 'pwa': 'プァ', 'pwae': 'プェ', 'poe': 'プェ', 'pyo': 'ピョ', 'pu': 'プ', 'pwo': 'プォ', 'pwe': 'プェ',
  'pwi': 'プィ', 'pyu': 'ピュ', 'peu': 'プ', 'pui': 'プィ', 'pi': 'ピ',

  // ㅅ (s)
  'sa': 'サ', 'sae': 'セ', 'sya': 'シャ', 'syae': 'シェ', 'seo': 'ソ', 'se': 'セ', 'syeo': 'ショ', 'sye': 'シェ',
  'so': 'ソ', 'swa': 'スァ', 'swae': 'スェ', 'soe': 'スェ', 'syo': 'ショ', 'su': 'ス', 'swo': 'スォ', 'swe': 'スェ',
  'swi': 'スィ', 'syu': 'シュ', 'seu': 'ス', 'sui': 'スィ', 'si': 'シ',

  // ㅈ (j/ch)
  'ja': 'チャ', 'jae': 'チェ', 'jya': 'チャ', 'jyae': 'チェ', 'jeo': 'チョ', 'je': 'チェ', 'jyeo': 'チョ', 'jye': 'チェ',
  'jo': 'チョ', 'jwa': 'チョァ', 'jwae': 'チェ', 'joe': 'チェ', 'jyo': 'チョ', 'ju': 'チュ', 'jwo': 'チョォ', 'jwe': 'チェ',
  'jwi': 'チュィ', 'jyu': 'チュ', 'jeu': 'チュ', 'jui': 'チュィ', 'ji': 'チ',

  // ㅊ (ch)
  'cha': 'チャ', 'chae': 'チェ', 'chya': 'チャ', 'chyae': 'チェ', 'cheo': 'チョ', 'che': 'チェ', 'chyeo': 'チョ', 'chye': 'チェ',
  'cho': 'チョ', 'chwa': 'チャ', 'chwae': 'チェ', 'choe': 'チェ', 'chyo': 'チョ', 'chu': 'チュ', 'chwo': 'チョ', 'chwe': 'チェ',
  'chwi': 'チュィ', 'chyu': 'チュ', 'cheu': 'チュ', 'chui': 'チュィ', 'chi': 'チ',

  // ㅋ (k)
  'ka': 'カ', 'kae': 'ケ', 'kya': 'キャ', 'kyae': 'キェ', 'keo': 'コ', 'ke': 'ケ', 'kyeo': 'キョ', 'kye': 'キェ',
  'ko': 'コ', 'kwa': 'クァ', 'kwae': 'クェ', 'koe': 'クェ', 'kyo': 'キョ', 'ku': 'ク', 'kwo': 'クォ', 'kwe': 'クェ',
  'kwi': 'クィ', 'kyu': 'キュ', 'keu': 'ク', 'kui': 'クィ', 'ki': 'キ',

  // ㅌ (t)
  'ta': 'タ', 'tae': 'テ', 'tya': 'チャ', 'tyae': 'チェ', 'teo': 'ト', 'te': 'テ', 'tyeo': 'チョ', 'tye': 'チェ',
  'to': 'ト', 'twa': 'トァ', 'twae': 'トェ', 'toe': 'トェ', 'tyo': 'チョ', 'tu': 'トゥ', 'two': 'トゥォ', 'twe': 'トゥェ',
  'twi': 'トゥィ', 'tyu': 'テュ', 'teu': 'トゥ', 'tui': 'トゥィ', 'ti': 'ティ',

  // ㅍ (p)
  'pa': 'パ', 'pae': 'ペ', 'pya': 'ピャ', 'pyae': 'ピェ', 'peo': 'ポ', 'pe': 'ペ', 'pyeo': 'ピョ', 'pye': 'ピェ',
  'po': 'ポ', 'pwa': 'プァ', 'pwae': 'プェ', 'poe': 'プェ', 'pyo': 'ピョ', 'pu': 'プ', 'pwo': 'プォ', 'pwe': 'プェ',
  'pwi': 'プィ', 'pyu': 'ピュ', 'peu': 'プ', 'pui': 'プィ', 'pi': 'ピ',

  // ㅎ (h)
  'ha': 'ハ', 'hae': 'ヘ', 'hya': 'ヒャ', 'hyae': 'ヒェ', 'heo': 'ホ', 'he': 'ヘ', 'hyeo': 'ヒョ', 'hye': 'ヒェ',
  'ho': 'ホ', 'hwa': 'ファ', 'hwae': 'フェ', 'hoe': 'フェ', 'hyo': 'ヒョ', 'hu': 'フ', 'hwo': 'フォ', 'hwe': 'フェ',
  'hwi': 'フィ', 'hyu': 'ヒュ', 'heu': 'フ', 'hui': 'フィ', 'hi': 'ヒ'
};

const SURNAME_MAP = {
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

function toKatakanaIfHangul(text) {
  if (!text || typeof text !== 'string') return text;
  return text.split(/([,/、\n\s|]+)/).map(segment => {
    if (/^[,/、\n\s|]+$/.test(segment)) return segment;
    const trimmed = segment.trim();
    if (!/[\uac00-\ud7af]/.test(trimmed)) return segment;

    const chars = Array.from(trimmed);
    if (chars.length >= 2 && SURNAME_MAP[chars[0]]) {
      const surname = SURNAME_MAP[chars[0]];
      const given = chars.slice(1).map(c => /[\uac00-\ud7af]/.test(c) ? hangulToKatakanaChar(c) : c).join('');
      return `${surname}・${given}`;
    }
    return chars.map(c => /[\uac00-\ud7af]/.test(c) ? hangulToKatakanaChar(c) : c).join('');
  }).join('');
}

// テスト確認
const sampleList = [
  '이현걸', '김차웅', '배기범', '김진만', '하이람', '황규찬', '조한결', '임태풍',
  '이용녀', '김형묵', '권도균', '남대협', '류지안', '이진결', '우충현', 'ジ・니'
];

sampleList.forEach(s => {
  console.log(`${s} ➡️ ${toKatakanaIfHangul(s)}`);
});

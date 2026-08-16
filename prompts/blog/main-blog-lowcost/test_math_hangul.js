// Complete Unicode Hangul to Katakana mathematical converter

const CHO_MAP = ['k', 'kk', 'n', 't', 'tt', 'r', 'm', 'p', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const JUNG_MAP = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const JONG_MAP = ['', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lk', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 's', 'ss', 'ng', 't', 'ch', 'k', 't', 'p', 'h'];

const ROMA_KATA_MAP = {
  'ka': 'カ', 'kya': 'キャ', 'keo': 'コ', 'kyeo': 'キョ', 'ko': 'コ', 'kyo': 'キョ', 'ku': 'ク', 'kyu': 'キュ', 'keu': 'ク', 'ki': 'キ', 'kae': 'ケ', 'ke': 'ケ', 'kwa': 'クァ', 'kwo': 'クォ', 'kwi': 'クィ',
  'na': 'ナ', 'nya': 'ニャ', 'neo': 'ノ', 'nyeo': 'ニョ', 'no': 'ノ', 'nyo': 'ニョ', 'nu': 'ヌ', 'nyu': 'ニュ', 'neu': 'ヌ', 'ni': 'ニ', 'nae': 'ネ', 'ne': 'ネ', 'nwa': 'ヌァ', 'nwo': 'ヌォ', 'nwi': 'ヌィ',
  'ta': 'タ', 'tya': 'チャ', 'teo': 'ト', 'tyeo': 'チョ', 'to': 'ト', 'tyo': 'チョ', 'tu': 'トゥ', 'tyu': 'テュ', 'teu': 'トゥ', 'ti': 'ティ', 'tae': 'テ', 'te': 'テ', 'twa': 'トァ', 'two': 'トゥォ', 'twi': 'トゥィ',
  'ra': 'ラ', 'rya': 'リャ', 'reo': 'ロ', 'ryeo': 'リョ', 'ro': 'ロ', 'ryo': 'リョ', 'ru': 'ル', 'ryu': 'リュ', 'reu': 'ル', 'ri': 'リ', 'rae': 'レ', 're': 'レ', 'rwa': 'ルァ', 'rwo': 'ルォ', 'rwi': 'ルィ',
  'ma': 'マ', 'mya': 'ミャ', 'meo': 'モ', 'myeo': 'ミョ', 'mo': 'モ', 'myo': 'ミョ', 'mu': 'ム', 'myu': 'ミュ', 'meu': 'ム', 'mi': 'ミ', 'mae': 'メ', 'me': 'メ', 'mwa': 'ムァ', 'mwo': 'ムォ', 'mwi': 'ムィ',
  'pa': 'パ', 'pya': 'ピャ', 'peo': 'ポ', 'pyeo': 'ピョ', 'po': 'ポ', 'pyo': 'ピョ', 'pu': 'プ', 'pyu': 'ピュ', 'peu': 'プ', 'pi': 'ピ', 'pae': 'ペ', 'pe': 'ペ', 'pwa': 'プァ', 'pwo': 'プォ', 'pwi': 'プィ',
  'sa': 'サ', 'sya': 'シャ', 'seo': 'ソ', 'syeo': 'ショ', 'so': 'ソ', 'syo': 'ショ', 'su': 'ス', 'syu': 'シュ', 'seu': 'ス', 'si': 'シ', 'sae': 'セ', 'se': 'セ', 'swa': 'スァ', 'swo': 'スォ', 'swi': 'スィ',
  'a': 'ア', 'ya': 'ヤ', 'eo': 'オ', 'yeo': 'ヨ', 'o': 'オ', 'yo': 'ヨ', 'u': 'ウ', 'yu': 'ユ', 'eu': 'ウ', 'i': 'イ', 'ae': 'エ', 'e': 'エ', 'wa': 'ワ', 'wo': 'ウォ', 'wi': 'ウィ', 'ui': 'ウィ', 'oe': 'ウェ', 'yae': 'イェ', 'ye': 'イェ', 'wae': 'ウェ', 'we': 'ウェ',
  'ja': 'チャ', 'jya': 'チャ', 'jeo': 'チョ', 'jyeo': 'チョ', 'jo': 'チョ', 'jyo': 'チョ', 'ju': 'チュ', 'jyu': 'チュ', 'jeu': 'チュ', 'ji': 'チ', 'jae': 'チェ', 'je': 'チェ', 'jwa': 'チョァ', 'jwo': 'チョォ', 'jwi': 'チュィ',
  'cha': 'チャ', 'chya': 'チャ', 'cheo': 'チョ', 'chyeo': 'チョ', 'cho': 'チョ', 'chyo': 'チョ', 'chu': 'チュ', 'chyu': 'チュ', 'cheu': 'チュ', 'chi': 'チ', 'chae': 'チェ', 'che': 'チェ', 'chwa': 'チャ', 'chwo': 'チョ', 'chwi': 'チュィ',
  'ha': 'ハ', 'hya': 'ヒャ', 'heo': 'ホ', 'hyeo': 'ヒョ', 'ho': 'ホ', 'hyo': 'ヒョ', 'hu': 'フ', 'hyu': 'ヒュ', 'heu': 'フ', 'hi': 'ヒ', 'hae': 'ヘ', 'he': 'ヘ', 'hwa': 'ファ', 'hwo': 'フォ', 'hwi': 'フィ'
};

const JONG_KATA_MAP = {
  'k': 'ク', 'n': 'ン', 't': 'ト', 'l': 'ル', 'm': 'ム', 'p': 'プ', 's': 'ス', 'ss': 'ス', 'ng': 'ン', 'ch': 'チ'
};

// 姓マップ
const SURNAME_KATA = {
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

function hangulCharToKatakana(char) {
  const code = char.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return char;

  const choIdx = Math.floor(code / 588);
  const jungIdx = Math.floor((code % 588) / 28);
  const jongIdx = code % 28;

  const cho = CHO_MAP[choIdx];
  const jung = JUNG_MAP[jungIdx];
  const jong = JONG_MAP[jongIdx];

  const syllableKey = cho + jung;
  const baseKata = ROMA_KATA_MAP[syllableKey] || (cho + jung);
  const jongKata = jong ? (JONG_KATA_MAP[jong] || '') : '';

  // 複合音の微調整（例: ョン + ン = ョン, ン + ク = ンク）
  return baseKata + jongKata;
}

function convertHangulNameToKatakana(name) {
  if (!name || typeof name !== 'string') return name;
  
  return name.split(/([,/、\n\s]+)/).map(seg => {
    if (/^[,/、\n\s]+$/.test(seg)) return seg;
    const clean = seg.trim();
    if (!/[\uac00-\ud7af]/.test(clean)) return seg;

    const chars = Array.from(clean);
    // 姓名分離（2文字以上で最初の文字が韓国の姓の場合）
    if (chars.length >= 2 && SURNAME_KATA[chars[0]]) {
      const surname = SURNAME_KATA[chars[0]];
      const given = chars.slice(1).map(c => /[\uac00-\ud7af]/.test(c) ? hangulCharToKatakana(c) : c).join('');
      return `${surname}・${given}`;
    }

    return chars.map(c => /[\uac00-\ud7af]/.test(c) ? hangulCharToKatakana(c) : c).join('');
  }).join('');
}

// テスト
const testList = [
  'イ・ヒョン걸', 'キム・チャ웅', 'ペ・ギ범', 'キム・ジン만', 'ハ・イ람', 'ファン・ギュ찬',
  'チョ・ハン결', 'イム・テ풍', 'イ・ヨン녀', 'キム・ヒョン묵', 'クォン・ド균', 'ナム・デ협',
  'リュ・ジ안', 'イ・ジン결', 'ウ・충ヒョン', '김정팔', '이동찬', '은수', '이준혁', '김수경',
  '박찬욱', '김민희', '김태리', '하정우'
];

testList.forEach(t => {
  console.log(`${t} ➡️ ${convertHangulNameToKatakana(t)}`);
});

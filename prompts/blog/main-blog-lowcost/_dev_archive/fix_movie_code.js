const fs = require('fs');

const filePath = 'c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/映画無限検索ワークフローおすすめ映画版/映画データ整形Code.js';
let content = fs.readFileSync(filePath, 'utf8');

const targetBefore = `const genreMap = {
  28: "アクション", 12: "アドベンチャー", 16: "アニメ", 35: "コメディ", 80: "犯罪",
  99: "ドキュメンタリー", 18: "ドラマ", 10751: "ファミリー", 14: "ファンタジー", 36: "歴史",
  27: "ホラー", 10402: "音楽", 9648: "ミステリー", 10749: "ロマンス", 878: "SF",
  10770: "テレビ映画", 53: "スリラー", 10752: "戦争", 37: "西部劇"
};`;

const targetAfter = `// 不要な空白を除去し、自然な改行を保持
const cleanStr = (str) => {
  if (typeof str !== 'string' || !str) return null;
  return str.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n').trim();
};

const finalDirector = toKatakanaIfHangul(aiDirectorJa || sourceData.director || fetchedDirector || null);
const finalCast = toKatakanaIfHangul(aiCastJa || sourceData.cast || fetchedCast || null);`;

const middleClean = `
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

const toKatakanaIfHangul = (text) => {
  if (!text || typeof text !== 'string') return text;
  return text.split(/([,/、\\n\\s|]+)/).map(segment => {
    if (/^[,/、\\n\\s|]+$/.test(segment)) return segment;
    const trimmed = segment.trim();
    if (!/[\\uac00-\\ud7af]/.test(trimmed)) return segment;

    const chars = Array.from(trimmed);
    if (chars.length >= 2 && SURNAMES_MAP[chars[0]]) {
      const surname = SURNAMES_MAP[chars[0]];
      const givenChars = chars.slice(1);
      const given = givenChars.map(c => /[\\uac00-\\ud7af]/.test(c) ? hangulToKatakanaChar(c) : c).join('');
      return \`\${surname}・\${given}\`;
    }
    return chars.map(c => /[\\uac00-\\ud7af]/.test(c) ? hangulToKatakanaChar(c) : c).join('');
  }).join('').replace(/,\\s*/g, ', ');
};
`;

const p1 = content.indexOf(targetBefore);
const p2 = content.indexOf(targetAfter);

if (p1 !== -1 && p2 !== -1) {
  const newContent = content.substring(0, p1 + targetBefore.length) + '\n' + middleClean + '\n' + content.substring(p2);
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log('Successfully fixed 映画データ整形Code.js!');
} else {
  console.error('Target not found!', { p1, p2 });
}

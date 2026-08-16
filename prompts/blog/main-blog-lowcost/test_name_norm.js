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

function normalizeKoreanName(name) {
  if (!name || typeof name !== 'string') return name;
  let clean = name.trim();

  // 1. 特殊芸名・単語の完全一致
  if (SPECIAL_NAMES[clean]) return SPECIAL_NAMES[clean];

  // 2. 韓国人名で語頭の「ジョ・」「ジュ・」「ジャ・」などを標準の「チョ・」「チュ・」「チャ・」に統一
  clean = clean
    .replace(/^ジョ・/g, 'チョ・')
    .replace(/,\s*ジョ・/g, ', チョ・')
    .replace(/^ジュ・/g, 'チュ・')
    .replace(/,\s*ジュ・/g, ', チュ・')
    .replace(/^ジャ・/g, 'チャ・')
    .replace(/,\s*ジャ・/g, ', チャ・');

  // 3. 特殊な中黒の誤分割（「ジ・ニ」➔「ジニ」等）の修正
  for (const [k, v] of Object.entries(SPECIAL_NAMES)) {
    clean = clean.split(/([,/、\n\s|]+)/).map(seg => (seg.trim() === k ? v : seg)).join('');
  }

  return clean;
}

console.log("Test 1:", normalizeKoreanName("ジョ・ビョンギュ, ユ・インス, ジ・ニ, ソ・イングク"));
console.log("Test 2:", normalizeKoreanName("ジョ・インソン, ジュ・ジフン, ジ・ニ, アイ・ユー"));

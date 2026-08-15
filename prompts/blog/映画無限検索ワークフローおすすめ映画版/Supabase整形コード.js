/**
 * 【n8n用】キャスト・監督 Supabase整形コード（QID・画像・SNS完全保持版）
 * 
 * 役割: TMDb credits および Wikidata から
 *       性別 (male / female)、QID、画像、SNSリンクを抽出し、
 *       Supabase "Persons" テーブルへ保存する JSON を生成します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputItems = $input.all();
let origPersons = [];
try { origPersons = $('キャスト・監督抽出').all(); } catch(e) {}
if (!origPersons.length) {
  try { origPersons = $('キャスト監督抽出コード').all(); } catch(e) {}
}

const creditsNode = getNodeData('TMDb credits取得');
const shapedNode = getNodeData('映画データ整形Code') || getNodeData('映画データ整形コード') || {};
const movieCountry = String(shapedNode.country || 'KR').toUpperCase();

// TMDB のレスポンス構造に柔軟対応
const castList = Array.isArray(creditsNode?.cast) ? creditsNode.cast : (Array.isArray(creditsNode?.credits?.cast) ? creditsNode.credits.cast : []);
const crewList = Array.isArray(creditsNode?.crew) ? creditsNode.crew : (Array.isArray(creditsNode?.credits?.crew) ? creditsNode.credits.crew : []);
const createdByList = Array.isArray(creditsNode?.created_by) ? creditsNode.created_by : (Array.isArray(creditsNode?.credits?.created_by) ? creditsNode.credits.created_by : []);

const persons = [];
const seenNames = new Set();

const SURNAMES_MAP = {
  '김': 'キム', '이': 'イ', '박': 'パク', '최': 'チェ', '정': 'チョン', '강': 'カン', '조': 'チョ',
  '윤': 'ユン', '장': 'チャン', '임': 'イム', '한': 'ハン', '오': 'オ', '서': 'ソ', '신': 'シン',
  '권': 'クォン', '황': 'ファン', '안': 'アン', '송': 'ソン', '류': 'リュ', '홍': 'ホン', '고': 'コ',
  '문': 'ムン', '양': 'ヤン', '손': 'ソン', '배': 'ペ', '백': 'ペク', '허': 'ホ', '유': 'ユ',
  '남': 'ナム', '심': 'シム', 'ノ': 'ノ', '노': 'ノ', '하': 'ハ', '곽': 'クァク', '성': 'ソン', '차': 'チャ',
  '주': 'チュ', '우': 'ウ', '구': 'ク', '민': 'ミン', '진': 'チン', '지': 'チ', '엄': 'オム',
  '채': 'チェ', '원': 'ウォン', '천': 'チョン', '방': 'パン', '공': 'コン', '현': 'ヒョン',
  '함': 'ハム', '변': 'ピョン', '염': 'ヨム', '여': 'ヨ', '추': 'チュ', '도': 'ト', '소': 'ソ',
  '석': 'ソク', '선': 'ソン', '설': 'ソル', '마': 'マ', '길': 'キル', '연': 'ヨン', '위': 'ウィ',
  '표': 'ピョ', '명': 'ミョン', '기': 'キ', '반': 'パン', '왕': 'ワン', '금': 'クム', '옥': 'オク',
  '육': 'ユク', '인': 'イン', '맹': 'メン', '제': 'チェ', '모': 'モ', '탁': 'タク', '국': 'クク'
};

const SYLLABLES_MAP = {
  '가': 'カ', '나': 'ナ', '다': 'ダ', '라': 'ラ', '마': 'マ', '바': 'バ', '사': 'サ', '아': 'ア', '자': 'ジャ', '차': 'チャ', '카': 'カ', '타': 'タ', '파': 'パ', '하': 'ハ',
  '개': 'ゲ', '내': 'ネ', '대': 'デ', '래': 'レ', '매': 'メ', '배': 'ペ', '새': 'セ', '애': 'エ', '재': 'ジェ', '채': 'チェ', '캐': 'ケ', '태': 'テ', '패': 'ペ', '해': 'ヘ',
  '거': 'ゴ', '너': 'ノ', '더': 'ド', '러': 'ロ', '머': 'モ', '버': 'ボ', '서': 'ソ', '어': 'オ', '저': 'チョ', '처': 'チョ', '커': 'コ', '터': 'ト', '퍼': 'ポ', '허': 'ホ',
  '게': 'ゲ', '네': 'ネ', '데': 'デ', 'レ': 'レ', '메': 'メ', '베': 'ベ', '세': 'セ', '에': 'エ', '제': 'ジェ', '체': 'チェ', 'ケ': 'ケ', '테': 'テ', '페': 'ペ', '헤': 'ヘ',
  '고': 'ゴ', '노': 'ノ', '도': 'ド', '로': 'ロ', '모': 'モ', '보': 'ボ', '소': 'ソ', '오': 'オ', '조': 'チョ', '초': 'チョ', '코': 'コ', '토': 'ト', '포': 'ポ', '호': 'ホ',
  '구': 'グ', '누': 'ヌ', '두': 'ドゥ', '루': 'ル', '무': 'ム', '부': 'ブ', '수': 'ス', '우': 'ウ', '주': 'チュ', '추': 'チュ', '쿠': 'ク', '투': 'トゥ', '푸': 'プ', '후': 'フ',
  '그': 'ク', '느': 'ヌ', '드': 'ドゥ', '르': 'ル', '므': 'ム', 'ブ': 'ブ', 'ス': 'ス', '으': 'ウ', '즈': 'ズ', '츠': 'チ', '크': 'ク', '트': 'ト', '프': 'プ', '흐': 'フ',
  '기': 'ギ', '니': 'ニ', '디': 'ディ', '리': 'リ', '미': 'ミ', '비': 'ビ', '시': 'シ', '이': 'イ', '지': 'ジ', '치': 'チ', '키': 'キ', '티': 'ティ', '피': 'ピ', '히': 'ヒ',
  '교': 'ギョ', '규': 'ギュ', '효': 'ヒョ', '표': 'ピョ', '묘': 'ミョ', '료': 'リョ', '쇼': 'ショ', '조': 'チョ', '요': 'ヨ', '유': 'ユ', '야': 'ヤ', '여': 'ヨ', '예': 'イェ',
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

const splitNames = (str) => {
  if (!str) return [];
  return String(str).split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);
};

const inferPersonCountry = (name, nameEn, defaultCountry) => {
  if (!name) return defaultCountry || 'KR';
  const n = String(name).trim();
  const ne = String(nameEn || '').trim();

  const isKoreanName = /^(キム|パク|チョン|ソン|イ|チェ|カン|ハン|イ・|キム・|パク・|チョン・|ソン・|チェ・|カン・|ハン・|ユン|ユン・)/.test(n) || /[\uac00-\ud7af]/.test(ne);
  if (isKoreanName) return 'KR';

  const isJapaneseName = /^[ぁ-んァ-ヶー一-龠\s・]+$/.test(n) && !isKoreanName && !/^[A-Za-z\s]+$/.test(n);
  if (isJapaneseName && (defaultCountry === 'JP' || !defaultCountry)) return 'JP';

  return (defaultCountry && defaultCountry !== 'EE' && defaultCountry !== 'KY' && defaultCountry !== 'BT') ? defaultCountry : 'KR';
};

const jaDirectors = splitNames(shapedNode.director);
const enDirectors = splitNames(shapedNode.director_en);
const jaCast = splitNames(shapedNode.cast);
const enCast = splitNames(shapedNode.cast_en);

const enNameMap = {};
jaDirectors.forEach((name, idx) => { if (name) enNameMap[name] = enDirectors[idx] || null; });
jaCast.forEach((name, idx) => { if (name) enNameMap[name] = enCast[idx] || null; });

inputItems.forEach((item, idx) => {
  let rawData = item.json?.data || item.json;
  if (typeof rawData === 'string') {
    try { rawData = JSON.parse(rawData); } catch(e) {}
  }
  
  const orig = origPersons[idx]?.json || {};
  const bindings = rawData?.results?.bindings || [];
  const bindingObj = bindings[0] || {};
  
  // 📸 画像URLの抽出
  let wikiImage = bindingObj.image?.value || null;
  if (wikiImage) {
    wikiImage = wikiImage.replace('http://', 'https://');
  }

  function extractActorQid(searchList) {
    if (!Array.isArray(searchList) || !searchList.length) return null;
    const regex = /actor|actress|director|film|artist|singer|배우|영화|감독|演劇|映画|俳優|女優|監督/i;
    
    // 1. Description チェック
    const descMatch = searchList.find(s => {
      const desc = s.description || s.display?.description?.value || '';
      return regex.test(desc);
    });
    if (descMatch) return descMatch.id;

    // 2. Label / Title チェック (例: "이강욱 (배우)")
    const labelMatch = searchList.find(s => {
      const lbl = s.label || s.title || s.display?.label?.value || '';
      return regex.test(lbl);
    });
    if (labelMatch) return labelMatch.id;

    // 3. 単一候補で曖昧さ回避ページでない場合
    if (searchList.length === 1 && !/disambiguation|동음이의/i.test(searchList[0].description || searchList[0].display?.description?.value || '')) {
      return searchList[0].id;
    }

    return searchList[0]?.id || null;
  }

  // 🎯 QID のダイレクト抽出 (SPARQL 結果 > Wikidata人物検索 > 入力データ)
  let qid = bindingObj.person?.value ? bindingObj.person.value.split('/').pop() : null;
  
  if (!qid) {
    let searchResults = [];
    try { searchResults = $('Wikidata人物検索').all()[idx]?.json?.search || []; } catch(e) {}
    if (!searchResults.length && Array.isArray(item.json?.search)) {
      searchResults = item.json.search;
    }
    if (!searchResults.length && Array.isArray(rawData?.search)) {
      searchResults = rawData.search;
    }
    qid = extractActorQid(searchResults);
  }

  // 🌐 SNS / 公式サイト ID の全自動抽出
  let xId = bindingObj.twitter?.value || null;
  if (xId) xId = xId.split('/').pop().replace('@', '');

  let instaId = bindingObj.instagram?.value || null;
  if (instaId) instaId = instaId.split('/').pop().replace('@', '');

  let ytId = bindingObj.youtube?.value || null;
  if (ytId) ytId = ytId.split('/').pop();

  let officialSite = bindingObj.website?.value || null;

  // 🎯 正確な日本語名（カタカナ）と原語名（ハングル）の取得
  const jaName = jaDirectors[idx] || jaCast[idx - jaDirectors.length] || orig.name || '';
  const searchName = jaName || orig.name || orig.search_key || item.json?.name || '';
  if (!searchName || seenNames.has(searchName)) return;
  seenNames.add(searchName);

  const isDirector = (orig.occupation === '監督') || jaDirectors.includes(searchName);
  let personObj = null;

  if (isDirector) {
    const targetEnName = enDirectors[idx] || orig.name_en || enNameMap[searchName] || '';
    if (crewList.length > 0) {
      personObj = crewList.find(c => 
        (c.job === 'Director' || c.job === 'Executive Producer') &&
        (targetEnName && (c.name?.toLowerCase() === targetEnName.toLowerCase() || c.original_name?.toLowerCase() === targetEnName.toLowerCase()))
      ) || crewList.find(c => c.job === 'Director');
    }
    if (!personObj && createdByList.length > 0) {
      personObj = createdByList.find(c => 
        targetEnName && (c.name?.toLowerCase() === targetEnName.toLowerCase() || c.original_name?.toLowerCase() === targetEnName.toLowerCase())
      ) || createdByList[0];
    }
  } else {
    const castIndex = jaCast.indexOf(searchName);
    const targetEnName = (castIndex >= 0 ? enCast[castIndex] : '') || orig.name_en || enNameMap[searchName] || '';
    
    if (castList.length > 0) {
      personObj = castList.find(c => 
        (targetEnName && (c.name?.toLowerCase() === targetEnName.toLowerCase() || c.original_name?.toLowerCase() === targetEnName.toLowerCase())) ||
        (c.name && (c.name === searchName || c.name.includes(searchName))) ||
        (c.original_name && (c.original_name === searchName || c.original_name.includes(searchName)))
      );

      if (!personObj && castIndex >= 0 && castIndex < castList.length) {
        personObj = castList[castIndex];
      }
    }
  }

  const rawNameJa = jaName || orig.name || searchName;
  const nameJa = toKatakanaIfHangul(rawNameJa);
  const nameEn = (isDirector ? enDirectors[idx] : enCast[jaCast.indexOf(searchName)]) || orig.name_en || enNameMap[searchName] || personObj?.original_name || personObj?.name || null;
  const tmdbImg = personObj?.profile_path ? `https://image.tmdb.org/t/p/w500${personObj.profile_path}` : null;
  const finalProfileUrl = tmdbImg || wikiImage;

  // 🎯 性別 (gender) の解決
  let genderVal = null;
  if (personObj?.gender === 1) genderVal = 'female';
  else if (personObj?.gender === 2) genderVal = 'male';

  if (!genderVal) {
    const wikiGender = bindingObj?.genderLabel?.value || bindingObj?.gender?.value || '';
    if (/female|女性|Q6581072/i.test(wikiGender)) genderVal = 'female';
    else if (/male|男性|Q6581097/i.test(wikiGender)) genderVal = 'male';
  }

  persons.push({
    name: nameJa || searchName,
    name_en: nameEn,
    occupation: isDirector ? '監督' : '俳優',
    profile_url: finalProfileUrl,
    gender: genderVal,
    country: inferPersonCountry(nameJa || searchName, nameEn, movieCountry),
    wikidata_id: qid,
    tmdb_id: personObj?.id ? Number(personObj.id) : null,
    x_id: xId,
    instagram_id: instaId,
    youtube_id: ytId,
    official_site: officialSite
  });
});

return persons.map(p => ({ json: p }));

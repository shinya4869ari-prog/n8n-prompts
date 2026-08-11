/**
 * 【n8n用】キャスト・監督 Supabase整形コード
 * 
 * 役割: 「Wikidata人名検索」ノードから出力された本当の Wikidata QID (Q212990, Q7385485等) と、
 *       映画のクレジット情報（各自の顔写真・原語名・性別・国籍）をそれぞれ正しく個別ドッキングさせ、
 *       Supabase の "Persons" テーブルへ一括保存 (UPSERT) できる完全な人物JSONを出力します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputItems = $input.all();
const credits = getNodeData('TMDb credits取得');
const shaped = getNodeData('補完結果整形コード') || getNodeData('補完ブリッジ整形コード') || getNodeData('映画データ整形コード_claude') || {};

const movieCountry = String(shaped.country || '').toUpperCase();
const targetCountries = ['JP', 'KR', 'US', 'GB'];

const persons = [];
const seenNames = new Set();

const splitNames = (str) => {
  if (!str) return [];
  return String(str).split(/[,\/、]+/).map(s => s.trim()).filter(Boolean);
};

const inferPersonCountry = (name, nameEn, defaultCountry) => {
  if (!name) return defaultCountry || null;
  const n = String(name).trim();
  const ne = String(nameEn || '').trim();

  const isKoreanName = /^(キム|パク|チョン|ソン|イ|チェ|カン|ハン|イ・|キム・|パク・|チョン・|ソン・|チェ・|カン・|ハン・|ユン|ユン・)/.test(n) || /[\uac00-\ud7af]/.test(ne);
  if (isKoreanName) return 'KR';

  const isJapaneseName = /^[ぁ-んァ-ヶー一-龠\s・]+$/.test(n) && !isKoreanName && !/^[A-Za-z\s]+$/.test(n);
  if (isJapaneseName && (defaultCountry === 'JP' || !defaultCountry)) return 'JP';

  return (defaultCountry && defaultCountry !== 'EE' && defaultCountry !== 'KY' && defaultCountry !== 'BT') ? defaultCountry : null;
};

const jaDirectors = splitNames(shaped.director);
const enDirectors = splitNames(shaped.director_en);
const jaCast = splitNames(shaped.cast);
const enCast = splitNames(shaped.cast_en);

// 人名から対応する英語/原語名を引くマッピング辞書
const enNameMap = {};
jaDirectors.forEach((name, idx) => { if (name) enNameMap[name] = enDirectors[idx] || null; });
jaCast.forEach((name, idx) => { if (name) enNameMap[name] = enCast[idx] || null; });

inputItems.forEach((item) => {
  const j = item.json || {};
  const searchName = j.searchinfo?.search || j.name || '';
  const searchResults = j.search || [];

  if (!searchName || seenNames.has(searchName)) return;
  seenNames.add(searchName);

  // Wikidata QID の自動抽出
  let qid = null;
  if (searchResults.length > 0) {
    const matched = searchResults.find(s => s.description && /actor|director|film|artist|映画|俳優|監督/i.test(s.description)) || searchResults[0];
    qid = matched?.id || null;
  }

  // 監督かキャストかを正確に判定
  const isDirector = jaDirectors.includes(searchName);
  
  let personObj = null;
  if (isDirector) {
    personObj = Array.isArray(credits?.crew) ? credits.crew.find(c => c.job === 'Director') : null;
  } else {
    // キャストの場合、インデックスや名前でTMDbの対応キャストを特定
    const castIndex = jaCast.indexOf(searchName);
    const targetEnName = enNameMap[searchName] || '';
    
    if (Array.isArray(credits?.cast)) {
      personObj = credits.cast.find(c => 
        (targetEnName && (c.name?.toLowerCase() === targetEnName.toLowerCase() || c.original_name?.toLowerCase() === targetEnName.toLowerCase())) ||
        (c.name && c.name.includes(searchName))
      );

      // 名前で直に引っかからなかった場合、順番(インデックス)でマッピング
      if (!personObj && castIndex >= 0 && castIndex < credits.cast.length) {
        personObj = credits.cast[castIndex];
      }
    }
  }

  const nameEn = enNameMap[searchName] || personObj?.original_name || personObj?.name || null;
  const profilePath = personObj?.profile_path ? `https://image.tmdb.org/t/p/h630${personObj.profile_path}` : null;
  const genderVal = personObj?.gender === 1 ? 'female' : (personObj?.gender === 2 ? 'male' : null);

  persons.push({
    name: searchName,
    name_en: nameEn,
    occupation: isDirector ? '監督' : '俳優',
    profile_url: profilePath, // 🎯 それぞれの俳優個人の高画質写真URL
    gender: genderVal,
    country: inferPersonCountry(searchName, nameEn, movieCountry),
    wikidata_id: qid // 🎯 それぞれの俳優個人の Wikidata QID
  });
});

return persons.map(p => ({ json: p }));

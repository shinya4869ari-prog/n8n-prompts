/**
 * 【n8n用】キャスト・監督 Supabase整形コード (Wikimedia Commons 写真 & Wikidata QID 完全対応版)
 * 
 * 役割: 「Wikidata人名検索」でヒットした QID (Q212990, Q7385485等) と、
 *       「Wikidata画像取得」から得られた Wikimedia Commons 直リンク最高品質写真 (https://commons.wikimedia.org/wiki/Special:FilePath/...)
 *       を完全ドッキングさせ、Supabase へ保存する最終人物 JSON を完成させます！
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputItems = $input.all();
const wikiPersonItems = $( 'Wikidata人名検索' ).all();
const credits = getNodeData('TMDb credits取得');
const shaped = getNodeData('補完結果整形コード') || getNodeData('補完ブリッジ整形コード') || getNodeData('映画データ整形コード_claude') || {};

const movieCountry = String(shaped.country || '').toUpperCase();

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

const enNameMap = {};
jaDirectors.forEach((name, idx) => { if (name) enNameMap[name] = enDirectors[idx] || null; });
jaCast.forEach((name, idx) => { if (name) enNameMap[name] = enCast[idx] || null; });

inputItems.forEach((item, idx) => {
  // Wikidata画像取得 ノードからの画像URL抽出
  let rawData = item.json?.data || item.json;
  if (typeof rawData === 'string') {
    try { rawData = JSON.parse(rawData); } catch(e) {}
  }
  
  const bindings = rawData?.results?.bindings || [];
  let wikiImage = bindings[0]?.image?.value || null;
  if (wikiImage) {
    wikiImage = wikiImage.replace('http://', 'https://');
  }

  // Wikidata人名検索 ノードからの QID 安全抽出 (Q212990, Q7385485等)
  const personItem = wikiPersonItems[idx]?.json || {};
  const searchName = personItem.searchinfo?.search || jaDirectors[idx] || jaCast[idx - jaDirectors.length] || '';
  
  if (!searchName || seenNames.has(searchName)) return;
  seenNames.add(searchName);

  let qid = null;
  const searchResults = personItem.search || [];
  if (searchResults.length > 0) {
    const matched = searchResults.find(s => s.description && /actor|director|film|artist|映画|俳優|監督/i.test(s.description)) || searchResults[0];
    qid = matched?.id || null;
  }

  const isDirector = jaDirectors.includes(searchName);
  let personObj = null;

  if (isDirector) {
    personObj = Array.isArray(credits?.crew) ? credits.crew.find(c => c.job === 'Director') : null;
  } else {
    const castIndex = jaCast.indexOf(searchName);
    const targetEnName = enNameMap[searchName] || '';
    
    if (Array.isArray(credits?.cast)) {
      personObj = credits.cast.find(c => 
        (targetEnName && (c.name?.toLowerCase() === targetEnName.toLowerCase() || c.original_name?.toLowerCase() === targetEnName.toLowerCase())) ||
        (c.name && c.name.includes(searchName))
      );

      if (!personObj && castIndex >= 0 && castIndex < credits.cast.length) {
        personObj = credits.cast[castIndex];
      }
    }
  }

  const nameEn = enNameMap[searchName] || personObj?.original_name || personObj?.name || null;
  const tmdbImg = personObj?.profile_path ? `https://image.tmdb.org/t/p/h630${personObj.profile_path}` : null;
  
  // 📸 🎯 音楽データと全く同じ Wikimedia Commons 直リンク最高画質写真を最優先採用！
  const finalProfileUrl = wikiImage || tmdbImg;
  const genderVal = personObj?.gender === 1 ? 'female' : (personObj?.gender === 2 ? 'male' : null);

  persons.push({
    name: searchName,
    name_en: nameEn,
    occupation: isDirector ? '監督' : '俳優',
    profile_url: finalProfileUrl, // 🎯 音楽データと同じ https://commons.wikimedia.org/... の直リンク最高品質画像！
    gender: genderVal,
    country: inferPersonCountry(searchName, nameEn, movieCountry),
    wikidata_id: qid // 🎯【完全結合】Q212990, Q7385485等の本当のWikidata ID
  });
});

return persons.map(p => ({ json: p }));

/**
 * 【n8n用】キャスト・監督 Supabase整形コード (Wikimedia Commons 完全合体対応版)
 * 
 * 役割: 「Wikidata画像取得」ノードから届いた Wikimedia Commons の直リンク最高画質写真 URL
 *       (https://commons.wikimedia.org/wiki/Special:FilePath/...) を最優先で読み込み、
 *       Supabase へ保存する完全な人物 JSON を完成させます！
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputItems = $input.all();
const wikiPersonNode = getNodeData('Wikidata人名検索') || {};
const wikiPersonItems = $input.all();
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

  // Wikidata人名検索の元の名前・QIDを抽出
  const searchName = jaDirectors[idx] || jaCast[idx - jaDirectors.length] || '';
  if (!searchName || seenNames.has(searchName)) return;
  seenNames.add(searchName);

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
  
  // 📸 🎯 【音楽と完全同一】Wikimedia Commons 直リンク最高画質写真を最優先採用！
  const finalProfileUrl = wikiImage || tmdbImg;
  const genderVal = personObj?.gender === 1 ? 'female' : (personObj?.gender === 2 ? 'male' : null);

  persons.push({
    name: searchName,
    name_en: nameEn,
    occupation: isDirector ? '監督' : '俳優',
    profile_url: finalProfileUrl, // 🎯 クリックで一瞬で画像が開ける最高画質URL！
    gender: genderVal,
    country: inferPersonCountry(searchName, nameEn, movieCountry),
    wikidata_id: null
  });
});

return persons.map(p => ({ json: p }));

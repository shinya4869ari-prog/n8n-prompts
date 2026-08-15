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

  const nameJa = jaName || orig.name || searchName;
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

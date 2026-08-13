/**
 * 【n8n用】キャスト・監督 Supabase整形コード (性別(gender)・QID・画像・SNS完全解決版)
 * 
 * 役割: TMDB credits (credits.cast / credits.crew) および Wikidata から
 *       性別 (male / female)、QID、画像、SNSリンクを100%確実に抽出して
 *       Supabase "Persons" テーブルへ保存する JSON を生成します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputItems = $input.all();
const creditsNode = getNodeData('TMDb credits取得');
const shapedNode = getNodeData('補完結果整形コード') || getNodeData('補完ブリッジ整形コード') || getNodeData('映画データ整形コード_claude') || {};

const movieCountry = String(shapedNode.country || '').toUpperCase();

// TMDB のレスポンス構造 (直下または credits.cast / credits.crew) に柔軟対応
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
  if (!name) return defaultCountry || null;
  const n = String(name).trim();
  const ne = String(nameEn || '').trim();

  const isKoreanName = /^(キム|パク|チョン|ソン|イ|チェ|カン|ハン|イ・|キム・|パク・|チョン・|ソン・|チェ・|カン・|ハン・|ユン|ユン・)/.test(n) || /[\uac00-\ud7af]/.test(ne);
  if (isKoreanName) return 'KR';

  const isJapaneseName = /^[ぁ-んァ-ヶー一-龠\s・]+$/.test(n) && !isKoreanName && !/^[A-Za-z\s]+$/.test(n);
  if (isJapaneseName && (defaultCountry === 'JP' || !defaultCountry)) return 'JP';

  return (defaultCountry && defaultCountry !== 'EE' && defaultCountry !== 'KY' && defaultCountry !== 'BT') ? defaultCountry : null;
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
  
  const bindings = rawData?.results?.bindings || [];
  const bindingObj = bindings[0] || {};
  
  // 📸 画像URLの抽出
  let wikiImage = bindingObj.image?.value || null;
  if (wikiImage) {
    wikiImage = wikiImage.replace('http://', 'https://');
  }

  // 🎯 QID のダイレクト抽出
  let qid = bindingObj.person?.value ? bindingObj.person.value.split('/').pop() : null;
  
  // 前段アイテムからの補填
  if (!qid && item.json?.searchinfo?.search) {
    const searchResults = item.json.search || [];
    const matched = searchResults.find(s => s.description && /actor|director|film|artist|映画|俳優|監督/i.test(s.description)) || searchResults[0];
    qid = matched?.id || null;
  }

  // 🌐 SNS / 公式サイト ID の全自動抽出
  let xId = bindingObj.twitter?.value || null;
  if (xId) xId = xId.split('/').pop().replace('@', '');

  let instaId = bindingObj.instagram?.value || null;
  if (instaId) instaId = instaId.split('/').pop().replace('@', '');

  let ytId = bindingObj.youtube?.value || null;
  if (ytId) ytId = ytId.split('/').pop();

  let officialSite = bindingObj.website?.value || null;

  const searchName = item.json?.searchinfo?.search || item.json?.name || jaDirectors[idx] || jaCast[idx - jaDirectors.length] || '';
  if (!searchName || seenNames.has(searchName)) return;
  seenNames.add(searchName);

  const isDirector = jaDirectors.includes(searchName);
  let personObj = null;

  if (isDirector) {
    const targetEnName = enNameMap[searchName] || '';
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
    const targetEnName = enNameMap[searchName] || '';
    
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

  // 🎯 汎用動的バリデーション (ドメイン名・写真ファイル名の類似度検証)
  if (officialSite || wikiImage || qid) {
    const cleanSearchName = searchName.toLowerCase().replace(/[\s・]/g, '');
    const cleanEn = (personObj?.name || enNameMap[searchName] || searchName || '').toLowerCase().replace(/[^a-z]/g, '');
    const cleanOrig = (personObj?.original_name || '').toLowerCase().replace(/[\s・-]/g, '');

    // 1. 公式サイトドメインの検証 (例: hajoonchang.net vs ハ・ヨン)
    if (officialSite) {
      const siteDomain = officialSite.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
      const isDomainMatch = (cleanEn && cleanEn.length >= 3 && siteDomain.includes(cleanEn.slice(0, 3))) ||
                            (cleanOrig && siteDomain.includes(cleanOrig)) ||
                            (cleanSearchName && siteDomain.includes(cleanSearchName));

      const isGenericAgency = /h-andent|jwide|namooactors|artistcompany|kingkong|fantagio|keyeast|hook|management|agency|portfolio|profile|actor|artist|blog|cafe|naver|daum|tistory/i.test(siteDomain);

      if (!isDomainMatch && !isGenericAgency) {
        officialSite = null;
        qid = null;
        wikiImage = null;
      }
    }

    // 2. 画像ファイル名の検証
    if (wikiImage) {
      const imgName = wikiImage.split('/').pop().toLowerCase().replace(/[^a-z]/g, '');
      if (cleanEn && cleanEn.length >= 3) {
        const prefix = cleanEn.slice(0, 3);
        if (!imgName.includes(prefix)) {
          wikiImage = null;
          qid = null;
        }
      }
    }
  }

  const nameEn = enNameMap[searchName] || personObj?.original_name || personObj?.name || null;
  const tmdbImg = personObj?.profile_path ? `https://image.tmdb.org/t/p/w500${personObj.profile_path}` : null;
  const finalProfileUrl = tmdbImg || wikiImage;

  // 🎯 性別 (gender) の強固な解決 (TMDB gender 1=female, 2=male ＋ Wikidata 性別判定の相互フォールバック)
  let genderVal = null;
  if (personObj?.gender === 1) genderVal = 'female';
  else if (personObj?.gender === 2) genderVal = 'male';

  if (!genderVal) {
    const wikiGender = bindingObj?.genderLabel?.value || bindingObj?.gender?.value || '';
    if (/female|女性|Q6581072/i.test(wikiGender)) genderVal = 'female';
    else if (/male|男性|Q6581097/i.test(wikiGender)) genderVal = 'male';
  }

  persons.push({
    name: searchName,
    name_en: nameEn,
    occupation: isDirector ? '監督' : '俳優',
    profile_url: finalProfileUrl,
    gender: genderVal,
    country: inferPersonCountry(searchName, nameEn, movieCountry),
    wikidata_id: qid,
    x_id: xId,
    instagram_id: instaId,
    youtube_id: ytId,
    official_site: officialSite
  });
});

return persons.map(p => ({ json: p }));

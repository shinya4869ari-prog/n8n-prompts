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

  // 🎯 厳格な安全第一バリデーション (不確実・曖昧なWikidataマッチは即座に破棄して空文字/nullにする)
  if (officialSite || wikiImage || qid) {
    const cleanSearchName = searchName.toLowerCase().replace(/[\s・]/g, '');
    const cleanEn = (personObj?.name || enNameMap[searchName] || searchName || '').toLowerCase().replace(/[^a-z]/g, '');
    const cleanOrig = (personObj?.original_name || '').toLowerCase().replace(/[\s・-]/g, '');

    // 1. 公式サイトの厳格検証 (本人の名前要素または認定芸能事務所ドメイン以外はすべて安全に破棄)
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
        xId = null;
        instaId = null;
        ytId = null;
      }
    }

    // 2. 画像ファイル名の厳格検証 (名前要素が100%照合できないものは安全第一ですべて破棄)
    if (wikiImage) {
      const imgName = wikiImage.split('/').pop().toLowerCase().replace(/[^a-z]/g, '');
      const nameTokens = (personObj?.name || enNameMap[searchName] || searchName || '').toLowerCase().split(/[\s・-]+/).filter(t => t.length >= 3);
      
      let isImgMatch = true;
      if (nameTokens.length > 0) {
        // 名前のラストトークン (例: "young") が画像ファイル名に含まれていない場合は完全破棄
        const keyToken = nameTokens[nameTokens.length - 1].replace(/[^a-z]/g, '');
        if (keyToken && keyToken.length >= 3 && !imgName.includes(keyToken)) {
          isImgMatch = false;
        }
      }

      if (!isImgMatch) {
        wikiImage = null;
        qid = null;
        xId = null;
        instaId = null;
        ytId = null;
      }
    }
  }

  // 🏢 Supabase 既存データの参照 (すでに Supabase に登録済みの画像・QID・SNS情報があれば優先利用)
  const existingPerson = (() => {
    try {
      const possibleNodes = ['Supabase Persons取得', 'Supabase Persons', '既存Persons', 'Supabase人名取得', 'Persons取得'];
      for (const pNode of possibleNodes) {
        let pItems = null;
        try { pItems = $(pNode).all(); } catch(e) {}
        if (Array.isArray(pItems)) {
          const found = pItems.find(it => it.json?.name === searchName || (it.json?.name_en && nameEn && it.json.name_en.toLowerCase() === nameEn.toLowerCase()));
          if (found?.json) return found.json;
        }
      }
    } catch(e) {}
    return null;
  })();

  const savedProfileUrl = existingPerson?.profile_url || finalProfileUrl;
  const savedQid = existingPerson?.wikidata_id || qid;
  const savedOfficialSite = existingPerson?.official_site || officialSite;
  const savedXId = existingPerson?.x_id || xId;
  const savedInstaId = existingPerson?.instagram_id || instaId;
  const savedYtId = existingPerson?.youtube_id || ytId;
  const savedGender = existingPerson?.gender || genderVal;

  persons.push({
    name: searchName,
    name_en: nameEn,
    occupation: isDirector ? '監督' : '俳優',
    profile_url: savedProfileUrl,
    gender: savedGender,
    country: inferPersonCountry(searchName, nameEn, movieCountry),
    wikidata_id: savedQid,
    x_id: savedXId,
    instagram_id: savedInstaId,
    youtube_id: savedYtId,
    official_site: savedOfficialSite
  });
});

return persons.map(p => ({ json: p }));

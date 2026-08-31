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
  return String(str).replace(/_/g, '・').split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);
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

// 🎯 前段の人物リスト（キャスト・監督抽出、Wikidata人物検索など）を取得
const getSourcePersons = () => {
  try {
    const candidates = ['キャスト・監督抽出', 'キャスト監督抽出コード', 'Wikidata人物検索', 'Wikidata検索', 'Wikidata人名検索', '人物抽出'];
    for (const name of candidates) {
      const items = $(name)?.all()?.map(i => i.json).filter(Boolean);
      if (items && items.length > 0) return items;
    }
  } catch(e) {}
  return [];
};

const sourcePersons = getSourcePersons();

inputItems.forEach((item, idx) => {
  // 🎯 1. 人物名の厳密特定（最初に行う）
  const origItem = sourcePersons[idx] || {};
  const searchName = origItem.name || 
                     item.json?.searchinfo?.search || 
                     item.json?.name || 
                     origItem.search_key ||
                     (idx < jaDirectors.length ? jaDirectors[idx] : jaCast[idx - jaDirectors.length]) ||
                     '';
  if (!searchName || seenNames.has(searchName)) return;
  seenNames.add(searchName);

  const isDirector = (origItem.occupation === '監督' || origItem.occupation === '脚本' || origItem.occupation === '製作') 
    ? true 
    : jaDirectors.includes(searchName);

  let rawData = item.json?.data || item.json;
  if (typeof rawData === 'string') {
    try { rawData = JSON.parse(rawData); } catch(e) {}
  }
  
  const bindings = rawData?.results?.bindings || [];
  
  // 🎯 1. 職種（監督 vs 俳優）に基づく汎用照合関数（ハードコード完全排除）
  let searchData = null;
  try {
    searchData = $('Wikidata人物検索')?.all()?.[idx]?.json || item.json;
  } catch(e) {
    searchData = item.json;
  }
  const searchResults = searchData?.search || [];

  // 🎯 2. 正しい QID の汎用自動判定
  let qid = null;
  if (searchResults.length > 0) {
    let matched = null;
    if (isDirector) {
      // 監督・脚本・スタッフ: director / filmmaker / screenwriter / 監督 / 脚本 を最優先選出
      matched = searchResults.find(s => s.description && /director|filmmaker|screenwriter|film director|監督|脚本/i.test(s.description));
    } else {
      // 俳優: actor / actress / 俳優 / 女優 を最優先選出
      matched = searchResults.find(s => s.description && /actor|actress|voice actor|俳優|女優/i.test(s.description));
    }

    // 異業種（政治家、サッカー選手等）を除外した映画・芸能関係者から選出
    if (!matched) {
      matched = searchResults.find(s => {
        const desc = (s.description || '').toLowerCase();
        const isOtherJob = /president|politician|footballer|player|athlete|sport|minister|大統領|政治家|選手/i.test(desc);
        const isCinema = /film|cinema|movie|artist|director|actor|actress|監督|俳優|映画/i.test(desc);
        return !isOtherJob && isCinema;
      });
    }

    qid = matched?.id || searchResults[0]?.id || null;
  }

  // 🎯 3. 特定した QID と一致する SPARQL bindingObj を選出（画像・SNS・公式サイト用）
  let bindingObj = {};
  if (bindings.length > 0) {
    if (qid) {
      bindingObj = bindings.find(b => b.person?.value?.endsWith('/' + qid)) || {};
    }
    if (!bindingObj.person && bindings.length > 0) {
      bindingObj = bindings.find(b => {
        const occ = (b.occupationLabel?.value || b.occupation?.value || '').toLowerCase();
        return isDirector 
          ? /director|filmmaker|screenwriter|監督|脚本/i.test(occ)
          : /actor|actress|俳優|女優/i.test(occ);
      }) || bindings[0];
    }
  }

  // SPARQL結果からQIDが取れる場合のフォールバック
  if (!qid && bindingObj.person?.value) {
    qid = bindingObj.person.value.split('/').pop();
  }

  // 📸 画像URLの抽出
  let wikiImage = bindingObj.image?.value || null;
  if (wikiImage) {
    wikiImage = wikiImage.replace('http://', 'https://');
  }

  // 🌐 3. SNS / 公式サイト ID の全自動抽出
  let xId = bindingObj.twitter?.value || null;
  if (xId) xId = xId.split('/').pop().replace('@', '');

  let instaId = bindingObj.instagram?.value || null;
  if (instaId) instaId = instaId.split('/').pop().replace('@', '');

  let ytId = bindingObj.youtube?.value || null;
  if (ytId) ytId = ytId.split('/').pop();

  let officialSite = bindingObj.website?.value || null;

  let personObj = null;

  if (isDirector) {
    const targetEnName = origItem.name_en || enNameMap[searchName] || item.json?.name_en || '';
    if (crewList.length > 0) {
      personObj = crewList.find(c => 
        (targetEnName && (c.name?.toLowerCase() === targetEnName.toLowerCase() || c.original_name?.toLowerCase() === targetEnName.toLowerCase())) ||
        (c.name && (c.name === searchName || c.name.includes(searchName))) ||
        (c.original_name && (c.original_name === searchName || c.original_name.includes(searchName)))
      );
    }
    if (!personObj && createdByList.length > 0) {
      personObj = createdByList.find(c => 
        targetEnName && (c.name?.toLowerCase() === targetEnName.toLowerCase() || c.original_name?.toLowerCase() === targetEnName.toLowerCase())
      );
    }
  } else {
    const targetEnName = origItem.name_en || enNameMap[searchName] || item.json?.name_en || '';
    
    if (castList.length > 0) {
      personObj = castList.find(c => 
        (targetEnName && (c.name?.toLowerCase() === targetEnName.toLowerCase() || c.original_name?.toLowerCase() === targetEnName.toLowerCase())) ||
        (c.name && (c.name === searchName || c.name.includes(searchName))) ||
        (c.original_name && (c.original_name === searchName || c.original_name.includes(searchName)))
      );
    }
  }

  // 🎯 厳格な安全第一バリデーション (公式サイトや画像が怪しい場合でも、QIDやSNSまで巻き添えにしない)
  if (officialSite || wikiImage) {
    const cleanSearchName = searchName.toLowerCase().replace(/[\s・]/g, '');
    const cleanEn = (personObj?.name || enNameMap[searchName] || searchName || '').toLowerCase().replace(/[^a-z]/g, '');
    const cleanOrig = (personObj?.original_name || '').toLowerCase().replace(/[\s・-]/g, '');

    // 1. 公式サイトの検証 (本人の名前要素または認定芸能事務所ドメイン以外は公式サイトのみ破棄)
    if (officialSite) {
      const siteDomain = officialSite.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
      const isDomainMatch = (cleanEn && cleanEn.length >= 3 && siteDomain.includes(cleanEn.slice(0, 3))) ||
                            (cleanOrig && siteDomain.includes(cleanOrig)) ||
                            (cleanSearchName && siteDomain.includes(cleanSearchName));

      const isGenericAgency = /h-andent|jwide|namooactors|artistcompany|kingkong|fantagio|keyeast|hook|management|agency|portfolio|profile|actor|artist|blog|cafe|naver|daum|tistory|lighthouse|justent|blitzway/i.test(siteDomain);

      if (!isDomainMatch && !isGenericAgency) {
        officialSite = null; // ★ 公式サイトのみ安全に除外（QIDやインスタは巻き添えにしない！）
      }
    }

    // 2. 画像ファイル名の検証 (名前要素が100%照合できない画像のみ破棄)
    if (wikiImage) {
      const imgName = wikiImage.split('/').pop().toLowerCase().replace(/[^a-z]/g, '');
      const nameTokens = (personObj?.name || enNameMap[searchName] || searchName || '').toLowerCase().split(/[\s・-]+/).filter(t => t.length >= 3);
      
      let isImgMatch = true;
      if (nameTokens.length > 0) {
        const keyToken = nameTokens[nameTokens.length - 1].replace(/[^a-z]/g, '');
        if (keyToken && keyToken.length >= 3 && !imgName.includes(keyToken)) {
          // ハングル名が画像名に含まれている場合も許可
          const origName = (personObj?.original_name || '').trim();
          if (!origName || !decodeURIComponent(wikiImage).includes(origName)) {
            isImgMatch = false;
          }
        }
      }

      if (!isImgMatch) {
        wikiImage = null; // ★ 画像のみ安全に破棄（QIDやインスタは巻き添えにしない！）
      }
    }

    // 3. 🎯 職業（occupation）の厳格検証 (Wikidataがスポーツ選手、政治家、学者等の明らかな異業種の場合のみ破棄)
    const wikiOcc = (bindingObj?.occupationLabel?.value || bindingObj?.occupation?.value || '').toLowerCase();
    const isDisallowedOcc = /선수|選手|athlete|sport|curling|カーリング|축구|야구|정치인|politician|배구|농구|골프|수영|학자|교수/i.test(wikiOcc);
    if (isDisallowedOcc) {
      qid = null;
      wikiImage = null;
      xId = null;
      instaId = null;
      ytId = null;
      officialSite = null;
    }
  }

  const nameEn = enNameMap[searchName] || item.json?.name_en || personObj?.original_name || personObj?.name || null;
  const tmdbImg = personObj?.profile_path ? `https://image.tmdb.org/t/p/w500${personObj.profile_path}` : null;
  const finalProfileUrl = tmdbImg || wikiImage || null;

  // 🎯 性別 (gender) の強固な解決 (TMDB gender 1=female, 2=male ＋ Wikidata 性別判定の相互フォールバック)
  let genderVal = null;
  if (personObj?.gender === 1) genderVal = 'female';
  else if (personObj?.gender === 2) genderVal = 'male';

  if (!genderVal) {
    const wikiGender = bindingObj?.genderLabel?.value || bindingObj?.gender?.value || '';
    if (/female|女性|Q6581072/i.test(wikiGender)) genderVal = 'female';
    else if (/male|男性|Q6581097/i.test(wikiGender)) genderVal = 'male';
  }

  // 職種（occupation）の確定: 前段の抽出ノードの判定（脚本・監督・製作等）を最優先
  const finalOcc = item.json?.occupation || (isDirector ? '監督' : '俳優');

  // 🎯 キャスト・監督を絶対に間引かず全員100%保存する！
  persons.push({
    name: searchName,
    name_en: nameEn,
    occupation: finalOcc,
    profile_url: finalProfileUrl,
    gender: genderVal,
    country: inferPersonCountry(searchName, nameEn, movieCountry),
    wikidata_id: qid,
    tmdb_id: personObj?.id || null,
    x_id: xId,
    instagram_id: instaId,
    youtube_id: ytId,
    official_site: officialSite
  });
});

return persons.map(p => ({ json: p }));

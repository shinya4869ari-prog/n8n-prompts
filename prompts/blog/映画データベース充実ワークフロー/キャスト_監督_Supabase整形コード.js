/**
 * 【n8n用】キャスト・監督 Supabase整形コード (SNS 4大リンク＆Wikimedia Commons フル対応版)
 * 
 * 役割: 直前の「Wikidata画像取得」ノードから届いた
 *       1. QID (Q212990等)
 *       2. Wikimedia Commons 直リンク最高画質写真 (https://commons.wikimedia.org/wiki/Special:FilePath/...)
 *       3. X (Twitter) アカウント ID
 *       4. Instagram アカウント ID
 *       5. YouTube チャンネル ID
 *       6. 公式ウェブサイト URL
 *       をすべて全自動で完全抽出・結合し、Supabase "Persons" テーブルへ一括保存する人物 JSON を作成します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputItems = $input.all();
const creditsNode = getNodeData('TMDb credits取得');
const shapedNode = getNodeData('補完結果整形コード') || getNodeData('補完ブリッジ整形コード') || getNodeData('映画データ整形コード_claude') || {};

const movieCountry = String(shapedNode.country || '').toUpperCase();

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

  // 🎯 QID のダイレクト抽出 (http://www.wikidata.org/entity/Q212990 ➔ Q212990)
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
    personObj = Array.isArray(creditsNode?.crew) ? creditsNode.crew.find(c => c.job === 'Director') : null;
  } else {
    const castIndex = jaCast.indexOf(searchName);
    const targetEnName = enNameMap[searchName] || '';
    
    if (Array.isArray(creditsNode?.cast)) {
      personObj = creditsNode.cast.find(c => 
        (targetEnName && (c.name?.toLowerCase() === targetEnName.toLowerCase() || c.original_name?.toLowerCase() === targetEnName.toLowerCase())) ||
        (c.name && c.name.includes(searchName))
      );

      if (!personObj && castIndex >= 0 && castIndex < creditsNode.cast.length) {
        personObj = creditsNode.cast[castIndex];
      }
    }
  }

  const nameEn = enNameMap[searchName] || personObj?.original_name || personObj?.name || null;
  const tmdbImg = personObj?.profile_path ? `https://image.tmdb.org/t/p/h630${personObj.profile_path}` : null;
  
  const finalProfileUrl = wikiImage || tmdbImg;
  const genderVal = personObj?.gender === 1 ? 'female' : (personObj?.gender === 2 ? 'male' : null);

  persons.push({
    name: searchName,
    name_en: nameEn,
    occupation: isDirector ? '監督' : '俳優',
    profile_url: finalProfileUrl,
    gender: genderVal,
    country: inferPersonCountry(searchName, nameEn, movieCountry),
    wikidata_id: qid,
    x_id: xId,               // 🎯 X (Twitter) アカウント名 (例: @seungbum)
    instagram_id: instaId,   // 🎯 Instagram アカウント名
    youtube_id: ytId,        // 🎯 YouTube チャンネル ID
    official_site: officialSite // 🎯 公式ウェブサイト URL
  });
});

return persons.map(p => ({ json: p }));

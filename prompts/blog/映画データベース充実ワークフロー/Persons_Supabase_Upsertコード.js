/**
 * 【n8n用】Persons（人物・キャスト・監督）Supabase Upsert用整形コード
 * 
 * 役割: Wikidata人名検索 (HTTP Request) のレスポンスから抽出された本当の Wikidata QID (Q212990等)
 *       および映画クレジット情報（顔写真・原語名・性別・国籍）を完全合体させ、
 *       Supabase の "Persons" テーブルへ保存できる形式で出力します。
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

// 手前の Code ノード（キャスト・監督抽出）からキャスト・監督の元データを安全取得
const sourcePersonsNode = getNodeData('キャスト・監督抽出') || {};
const sourcePersonsList = $input.all().map(it => it.json);

// Wikidata人名検索から流れてきた各アイテムを安全処理
inputItems.forEach((item, idx) => {
  const j = item.json || {};
  const searchName = j.searchinfo?.search || '';
  const searchResults = j.search || [];

  // Wikidata QID の自動抽出（検索結果の一番上のID）
  let qid = null;
  if (searchResults.length > 0) {
    // 俳優・監督の記述を優先、無ければ一番上のIDを採用
    const matched = searchResults.find(s => s.description && /actor|director|film|artist|映画|俳優|監督/i.test(s.description)) || searchResults[0];
    qid = matched?.id || null;
  }

  // クレジット情報からのメタデータ復元
  const crewObj = Array.isArray(credits?.crew) ? credits.crew.find(c => c.job === 'Director') : null;
  const castObj = Array.isArray(credits?.cast) 
    ? credits.cast.find(c => (c.name && c.name.toLowerCase() === searchName.toLowerCase()) || (c.original_name && c.original_name.toLowerCase() === searchName.toLowerCase()))
    : null;

  const targetObj = crewObj || castObj || {};
  const isDirector = !!crewObj && (crewObj.name === searchName || searchName === shaped.director);
  const nameEn = targetObj.original_name || null;
  const profilePath = targetObj.profile_path ? `https://image.tmdb.org/t/p/h630${targetObj.profile_path}` : null;

  if (searchName && !seenNames.has(searchName)) {
    seenNames.add(searchName);
    persons.push({
      name: searchName,
      name_en: nameEn,
      occupation: isDirector ? '監督' : '俳優',
      profile_url: profilePath,
      gender: targetObj.gender === 1 ? 'female' : (targetObj.gender === 2 ? 'male' : null),
      country: inferPersonCountry(searchName, nameEn, movieCountry),
      wikidata_id: qid // 🎯【大成功】全自動で取れた Wikidata QID (Q212990, Q7385485等)
    });
  }
});

return persons.map(p => ({ json: p }));

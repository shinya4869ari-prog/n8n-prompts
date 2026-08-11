/**
 * 【n8n用】Persons（人物・キャスト・監督）Supabase Upsert用整形コード
 * 
 * 役割: 映画充実ワークフローから抽出された 監督(director, director_en) および
 *       キャスト(cast, cast_en) のデータから、動的に取得された Wikidata QID や TMDb 情報を結合し
 *       Supabaseの "Persons" テーブルへ一括登録/更新 (UPSERT) できるJSON配列を生成します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

// 入力データの安全取得
const inputData = $input.first()?.json || $input.item?.json || {};
const shaped = getNodeData('補完結果整形コード') || getNodeData('補完ブリッジ整形コード') || inputData;
const credits = getNodeData('TMDb credits取得');
const wikiPerson = getNodeData('Wikidata人物検索') || getNodeData('Wikidata検索');

const movieCountry = String(shaped.country || inputData.country || '').toUpperCase();
const targetCountries = ['JP', 'KR', 'US', 'GB']; // 俳優（キャスト）保存の対象主要国

const persons = [];
const seenNames = new Set();

// ヘルパー: カンマ区切りの分割とトリム
const splitNames = (str) => {
  if (!str) return [];
  return String(str).split(/[,\/、]+/).map(s => s.trim()).filter(Boolean);
};

// 人物の真の出身国を安全に自動推測するヘルパー
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

// 1. 監督データの追加（※監督は作品の国にかかわらず【常に登録】）
jaDirectors.forEach((name, idx) => {
  if (!name || seenNames.has(name)) return;
  seenNames.add(name);

  const crewObj = Array.isArray(credits?.crew) ? credits.crew.find(c => c.job === 'Director') : null;
  const profilePath = crewObj?.profile_path ? `https://image.tmdb.org/t/p/h630${crewObj.profile_path}` : null;
  const nameEn = enDirectors[idx] || crewObj?.original_name || null;

  // 動的QID抽出（Wikidata検索またはTMDb Person external_ids から完全自動取得）
  const fetchedQid = crewObj?.wikidata_id || crewObj?.external_ids?.wikidata_id || wikiPerson.qid || wikiPerson.wikidata_id || (shaped.director === name ? shaped.director_qid : null);

  persons.push({
    name: name,
    name_en: nameEn,
    occupation: '監督',
    profile_url: profilePath,
    gender: crewObj?.gender === 1 ? 'female' : (crewObj?.gender === 2 ? 'male' : null),
    country: inferPersonCountry(name, nameEn, movieCountry),
    wikidata_id: fetchedQid || null
  });
});

// 2. キャスト（出演者）データの追加（※主要国 JP, KR, US, GB の作品のみ登録）
const isTargetCastCountry = !movieCountry || targetCountries.includes(movieCountry);

if (isTargetCastCountry) {
  jaCast.forEach((name, idx) => {
    if (!name || seenNames.has(name)) return;
    seenNames.add(name);

    const nameEn = enCast[idx] || '';
    const castObj = Array.isArray(credits?.cast) 
      ? credits.cast.find(c => (c.name && c.name.toLowerCase() === nameEn.toLowerCase()) || (c.original_name && c.original_name.toLowerCase() === nameEn.toLowerCase()))
      : null;

    const profilePath = castObj?.profile_path ? `https://image.tmdb.org/t/p/h630${castObj.profile_path}` : null;

    // 動的QID抽出
    const castQid = castObj?.wikidata_id || castObj?.external_ids?.wikidata_id || (wikiPerson.cast_qids && wikiPerson.cast_qids[name]) || null;

    persons.push({
      name: name,
      name_en: nameEn || castObj?.original_name || null,
      occupation: '俳優',
      profile_url: profilePath,
      gender: castObj?.gender === 1 ? 'female' : (castObj?.gender === 2 ? 'male' : null),
      country: inferPersonCountry(name, nameEn, movieCountry),
      wikidata_id: castQid || null
    });
  });
}

return persons.map(p => ({ json: p }));

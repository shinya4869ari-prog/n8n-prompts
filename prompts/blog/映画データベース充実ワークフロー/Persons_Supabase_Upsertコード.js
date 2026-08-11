/**
 * 【n8n用】Persons（人物・キャスト・監督）Supabase Upsert用整形コード
 * 
 * 役割: 映画充実ワークフローから抽出された 監督(director, director_en) および
 *       キャスト(cast, cast_en) のカンマ区切りデータを分割し、
 *       Supabaseの "Persons" テーブルへ一括登録/更新 (UPSERT) できるJSON配列を生成します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

// 入力データの安全取得
const inputData = $input.first()?.json || $input.item?.json || {};
const shaped = getNodeData('補完結果整形コード') || getNodeData('補完ブリッジ整形コード') || inputData;
const credits = getNodeData('TMDb credits取得');

// 🎯 対象国のフィルタリング設定 (日本・韓国・主要欧米作品のみDBに保存し、DBの品質を高く保つ)
const targetCountries = ['JP', 'KR', 'US', 'GB']; // 必要に応じて 'JP', 'KR' だけにも調整可能
const movieCountry = String(shaped.country || inputData.country || '').toUpperCase();

// 指定した主要国以外のマイナー作品の場合は自前DBへの保存を安全にスキップ
if (movieCountry && !targetCountries.includes(movieCountry)) {
  return []; // 空配列を返して Supabase 登録をスキップ (アプリ側は従来通り Wikidata で動的表示されます)
}

const persons = [];
const seenNames = new Set();

// ヘルパー: カンマ区切りの分割とトリム
const splitNames = (str) => {
  if (!str) return [];
  return String(str).split(/[,\/、]+/).map(s => s.trim()).filter(Boolean);
};

const jaDirectors = splitNames(shaped.director);
const enDirectors = splitNames(shaped.director_en);
const jaCast = splitNames(shaped.cast);
const enCast = splitNames(shaped.cast_en);

// 1. 監督データの追加
jaDirectors.forEach((name, idx) => {
  if (!name || seenNames.has(name)) return;
  seenNames.add(name);

  const crewObj = Array.isArray(credits?.crew) ? credits.crew.find(c => c.job === 'Director') : null;
  const profilePath = crewObj?.profile_path ? `https://image.tmdb.org/t/p/h630${crewObj.profile_path}` : null;

  persons.push({
    name: name,
    name_en: enDirectors[idx] || crewObj?.original_name || null,
    occupation: '監督',
    profile_url: profilePath,
    gender: crewObj?.gender === 1 ? 'female' : (crewObj?.gender === 2 ? 'male' : null),
    country: movieCountry || null,
    wikidata_id: null
  });
});

// 2. キャスト（出演者）データの追加
jaCast.forEach((name, idx) => {
  if (!name || seenNames.has(name)) return;
  seenNames.add(name);

  const nameEn = enCast[idx] || '';
  const castObj = Array.isArray(credits?.cast) 
    ? credits.cast.find(c => (c.name && c.name.toLowerCase() === nameEn.toLowerCase()) || (c.original_name && c.original_name.toLowerCase() === nameEn.toLowerCase()))
    : null;

  const profilePath = castObj?.profile_path ? `https://image.tmdb.org/t/p/h630${castObj.profile_path}` : null;

  persons.push({
    name: name,
    name_en: nameEn || castObj?.original_name || null,
    occupation: '俳優',
    profile_url: profilePath,
    gender: castObj?.gender === 1 ? 'female' : (castObj?.gender === 2 ? 'male' : null),
    country: movieCountry || null,
    wikidata_id: null
  });
});

return persons.map(p => ({ json: p }));

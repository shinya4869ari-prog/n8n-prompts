/**
 * 【n8n用】Persons（人物・キャスト・監督）Supabase Upsert用整形コード
 * 
 * 役割: 映画充実ワークフローから抽出された 監督(director, director_en) および
 *       キャスト(cast, cast_en) のデータから、Wikidata Search API を使って動的に
 *       各人物の Wikidata QID を全自動検索・補完し、Supabase "Persons" へ一括保存します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputData = $input.first()?.json || $input.item?.json || {};
const shaped = getNodeData('補完結果整形コード') || getNodeData('補完ブリッジ整形コード') || getNodeData('映画データ整形コード_claude') || inputData;
const credits = getNodeData('TMDb credits取得');

const movieCountry = String(shaped.country || inputData.country || '').toUpperCase();
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

// Wikidata APIから人名のQIDを動的リアルタイム検索する非同期ヘルパー
async function fetchWikidataQid(name, nameEn) {
  if (!name && !nameEn) return null;
  const query = nameEn || name;
  const lang = /[\uac00-\ud7af]/.test(query) ? 'ko' : 'ja';
  
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=${lang}&format=json&origin=*`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.search && d.search.length > 0) {
      const item = d.search.find(s => s.description && /actor|director|film|artist|映画|俳優|監督/i.test(s.description)) || d.search[0];
      return item.id || null;
    }
  } catch(e) {}
  return null;
}

const jaDirectors = splitNames(shaped.director);
const enDirectors = splitNames(shaped.director_en);
const jaCast = splitNames(shaped.cast);
const enCast = splitNames(shaped.cast_en);

async function main() {
  // 1. 監督データの追加
  for (let idx = 0; idx < jaDirectors.length; idx++) {
    const name = jaDirectors[idx];
    if (!name || seenNames.has(name)) continue;
    seenNames.add(name);

    const crewObj = Array.isArray(credits?.crew) ? credits.crew.find(c => c.job === 'Director') : null;
    const profilePath = crewObj?.profile_path ? `https://image.tmdb.org/t/p/h630${crewObj.profile_path}` : null;
    const nameEn = enDirectors[idx] || crewObj?.original_name || null;

    // 動的QID全自動取得！
    const qid = await fetchWikidataQid(name, nameEn);

    persons.push({
      name: name,
      name_en: nameEn,
      occupation: '監督',
      profile_url: profilePath,
      gender: crewObj?.gender === 1 ? 'female' : (crewObj?.gender === 2 ? 'male' : null),
      country: inferPersonCountry(name, nameEn, movieCountry),
      wikidata_id: qid
    });
  }

  // 2. キャスト（出演者）データの追加
  const isTargetCastCountry = !movieCountry || targetCountries.includes(movieCountry);

  if (isTargetCastCountry) {
    for (let idx = 0; idx < jaCast.length; idx++) {
      const name = jaCast[idx];
      if (!name || seenNames.has(name)) continue;
      seenNames.add(name);

      const nameEn = enCast[idx] || '';
      const castObj = Array.isArray(credits?.cast) 
        ? credits.cast.find(c => (c.name && c.name.toLowerCase() === nameEn.toLowerCase()) || (c.original_name && c.original_name.toLowerCase() === nameEn.toLowerCase()))
        : null;

      const profilePath = castObj?.profile_path ? `https://image.tmdb.org/t/p/h630${castObj.profile_path}` : null;

      // 動的QID全自動取得！
      const qid = await fetchWikidataQid(name, nameEn);

      persons.push({
        name: name,
        name_en: nameEn || castObj?.original_name || null,
        occupation: '俳優',
        profile_url: profilePath,
        gender: castObj?.gender === 1 ? 'female' : (castObj?.gender === 2 ? 'male' : null),
        country: inferPersonCountry(name, nameEn, movieCountry),
        wikidata_id: qid
      });
    }
  }

  return persons.map(p => ({ json: p }));
}

// 🎯【重要】n8n非同期エンジンのため return await main() で待機させる！
return await main();

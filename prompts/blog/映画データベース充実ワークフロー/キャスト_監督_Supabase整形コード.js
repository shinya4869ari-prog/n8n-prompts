/**
 * 【n8n用】キャスト・監督 Supabase整形コード (Wikimedia Commons 完全対応版)
 * 
 * 役割: 「Wikidata人名検索」でヒットした QID (Q212990, Q7385485等) を元に、
 *       Wikidata から Wikimedia Commons の最高品質・直リンク画像 (https://commons.wikimedia.org/wiki/Special:FilePath/...)
 *       を全自動で一括引き出し、最優先で `profile_url` にセットします！
 *       Wikimedia に画像が無い人物のみ TMDb 画像でバックアップ補填します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputItems = $input.all();
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

// 全QIDから一括でWikimedia Commons最高画質直リンク画像を引くSPARQLヘルパー
async function fetchWikimediaImages(qids) {
  if (!qids || qids.length === 0) return {};
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql = `SELECT ?person ?image WHERE { VALUES ?person { ${values} } ?person wdt:P18 ?image . }`;
  
  try {
    const url = 'https://query.wikidata.org/sparql?query=' + encodeURIComponent(sparql) + '&format=json';
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (!r.ok) return {};
    const d = await r.json();
    const map = {};
    d.results?.bindings?.forEach(b => {
      const qid = b.person?.value?.split('/')?.pop();
      if (qid && b.image?.value) {
        // HTTPSの直リンクURLに統一変換
        map[qid] = b.image.value.replace('http://', 'https://');
      }
    });
    return map;
  } catch(e) {
    return {};
  }
}

const jaDirectors = splitNames(shaped.director);
const enDirectors = splitNames(shaped.director_en);
const jaCast = splitNames(shaped.cast);
const enCast = splitNames(shaped.cast_en);

const enNameMap = {};
jaDirectors.forEach((name, idx) => { if (name) enNameMap[name] = enDirectors[idx] || null; });
jaCast.forEach((name, idx) => { if (name) enNameMap[name] = enCast[idx] || null; });

async function main() {
  const intermediateList = [];
  const qidList = [];

  inputItems.forEach((item) => {
    const j = item.json || {};
    const searchName = j.searchinfo?.search || j.name || '';
    const searchResults = j.search || [];

    if (!searchName || seenNames.has(searchName)) return;
    seenNames.add(searchName);

    let qid = null;
    if (searchResults.length > 0) {
      const matched = searchResults.find(s => s.description && /actor|director|film|artist|映画|俳優|監督/i.test(s.description)) || searchResults[0];
      qid = matched?.id || null;
    }

    if (qid) qidList.push(qid);
    intermediateList.push({ searchName, qid, searchResults });
  });

  // 🎯【最高解像度】Wikidata SPARQLからWikimedia Commons画像を全自動一括取得！
  const wikiImageMap = await fetchWikimediaImages(qidList);

  intermediateList.forEach(({ searchName, qid }) => {
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
    
    // 📸 1. 音楽データと全く同じ Wikimedia Commons 直リンク画像を最優先！ 2. 無い場合は TMDb 画像
    const finalProfileUrl = (qid && wikiImageMap[qid]) ? wikiImageMap[qid] : tmdbImg;
    const genderVal = personObj?.gender === 1 ? 'female' : (personObj?.gender === 2 ? 'male' : null);

    persons.push({
      name: searchName,
      name_en: nameEn,
      occupation: isDirector ? '監督' : '俳優',
      profile_url: finalProfileUrl, // 🎯 音楽データと同じ https://commons.wikimedia.org/... の直リンク最高品質画像！
      gender: genderVal,
      country: inferPersonCountry(searchName, nameEn, movieCountry),
      wikidata_id: qid
    });
  });

  return persons.map(p => ({ json: p }));
}

return await main();

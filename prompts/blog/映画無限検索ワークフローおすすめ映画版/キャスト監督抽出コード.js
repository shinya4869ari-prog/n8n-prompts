/**
 * 【n8n用】キャスト監督抽出コード（全キャスト完全網羅版）
 * 
 * 役割: 映画データ (映画データ整形Code) および TMDb credits (TMDb credits取得) から
 *       監督(director) および キャスト(cast) の全員を漏れなく100%抽出し、
 *       検索キー (search_key) を作成して Wikidata 人名検索ノードへ渡します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputData = $input.first()?.json || $input.item?.json || {};
const shaped = getNodeData('映画データ整形Code') || getNodeData('映画データ整形コード') || inputData;
const creditsNode = getNodeData('TMDb credits取得');

const castList = Array.isArray(creditsNode?.cast) ? creditsNode.cast : (Array.isArray(creditsNode?.credits?.cast) ? creditsNode.credits.cast : []);
const crewList = Array.isArray(creditsNode?.crew) ? creditsNode.crew : (Array.isArray(creditsNode?.credits?.crew) ? creditsNode.credits.crew : []);

const splitNames = (str) => {
  if (!str) return [];
  return String(str).split(/[,/、\n]+/).map(s => s.trim()).filter(Boolean);
};

const persons = [];
const seenNames = new Set();

const jaDirectors = splitNames(shaped.director);
const enDirectors = splitNames(shaped.director_en);
const jaCast = splitNames(shaped.cast);
const enCast = splitNames(shaped.cast_en);

// 1. 監督の追加（shaped から）
jaDirectors.forEach((name, idx) => {
  if (!name || seenNames.has(name)) return;
  seenNames.add(name);

  const enName = enDirectors[idx] || '';
  const tmdbMatch = crewList.find(c => c.job === 'Director' && (
    (enName && (c.name?.toLowerCase() === enName.toLowerCase() || c.original_name?.toLowerCase() === enName.toLowerCase())) ||
    (c.name && c.name.includes(name))
  )) || crewList.find(c => c.job === 'Director') || crewList[idx];

  const searchKey = tmdbMatch?.original_name || tmdbMatch?.name || enName || name;
  persons.push({ name: name, name_en: enName, search_key: searchKey, occupation: '監督' });
});

// 2. キャストの追加（shaped から 26名）
jaCast.forEach((name, idx) => {
  if (!name || seenNames.has(name)) return;
  seenNames.add(name);

  const enName = enCast[idx] || '';
  const tmdbMatch = castList.find(c => 
    (enName && (c.name?.toLowerCase() === enName.toLowerCase() || c.original_name?.toLowerCase() === enName.toLowerCase())) ||
    (c.name && c.name.includes(name))
  ) || castList[idx];

  const searchKey = tmdbMatch?.original_name || tmdbMatch?.name || enName || name;
  persons.push({ name: name, name_en: enName, search_key: searchKey, occupation: '俳優' });
});

return persons.map(p => ({ json: p }));

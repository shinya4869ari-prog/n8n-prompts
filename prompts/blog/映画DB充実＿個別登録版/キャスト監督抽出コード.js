/**
 * 【n8n用】キャスト監督抽出コード（1つ目のCodeノード用）
 * 
 * 役割: 映画データ（`映画データ整形コード` 等）から 監督(director) および
 *       キャスト(cast) のカンマ区切り名を分割し、すべての人物リスト (制限なし) を出力します。
 *       この出力が、直後の「Wikidata人名検索」HTTP Request ノードへ渡されます。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const inputData = $input.first()?.json || $input.item?.json || {};
const shaped = getNodeData('補完結果整形コード') || getNodeData('補完ブリッジ整形コード') || getNodeData('映画データ整形コード') || inputData;

const splitNames = (str) => {
  if (!str) return [];
  return String(str).split(/[,\/、]+/).map(s => s.trim()).filter(Boolean);
};

const persons = [];
const seenNames = new Set();

const jaDirectors = splitNames(shaped.director);
const jaCast = splitNames(shaped.cast);

// 1. 監督名の分割・追加
jaDirectors.forEach(name => {
  if (!name || seenNames.has(name)) return;
  seenNames.add(name);
  persons.push({ name: name, occupation: '監督' });
});

// 2. キャスト名の分割・追加 (全員分)
jaCast.forEach(name => {
  if (!name || seenNames.has(name)) return;
  seenNames.add(name);
  persons.push({ name: name, occupation: '俳優' });
});

return persons.map(p => ({ json: p }));

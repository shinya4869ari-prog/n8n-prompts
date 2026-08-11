/**
 * 【n8n用】音楽アーティスト＆メンバー Persons Supabase Upsert用整形コード
 * 
 * 役割: 音楽データベース充実ワークフローから出力されたグループ（例: BLACKPINK）および
 *       構成メンバー（例: ジス、ジェニー、ロゼ、リサ）を Supabase の "Persons" テーブルへ一括自動保存します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const input = $input.first()?.json || $input.item?.json || {};
const musicData = getNodeData('iTunes_Wikidata_Music_Enhancer') || input;
const wikiRaw = getNodeData('Wikidataメンバー検索');

let wikiData = {};
try {
  if (wikiRaw.data) {
    wikiData = typeof wikiRaw.data === 'string' ? JSON.parse(wikiRaw.data) : wikiRaw.data;
  } else { wikiData = wikiRaw; }
} catch(e) { wikiData = {}; }

const persons = [];
const artistName = musicData.artist_name;
if (!artistName) return [];

const bindings = wikiData.results?.bindings || [];
const hasMembers = bindings.length > 0;
const isGroup = hasMembers || musicData.type === 'group';

const defaultCountry = (musicData.genre && musicData.genre.toLowerCase().includes('k-pop')) ? 'KR' : (musicData.country || 'KR');

// 🎯 ハードコードを完全に排除し、API（Wikidata）の検索結果から動的に QID を自動抽出！
let groupQid = null;
if (bindings.length > 0 && bindings[0].group?.value) {
  groupQid = bindings[0].group.value.split('/').pop();
}

// 1. アーティスト / グループ 本体の登録
persons.push({
  name: artistName,
  name_en: (defaultCountry === 'KR' && musicData.artist_name_en) ? musicData.artist_name_en : (musicData.artist_name_en || null),
  occupation: isGroup ? 'グループ' : '歌手',
  type: isGroup ? 'group' : 'individual',
  group_type: musicData.genre || '音楽グループ',
  profile_url: musicData.artwork_url || null,
  country: defaultCountry,
  wikidata_id: groupQid, // 🎯 APIから動的に取得された QID を自動格納！
  members: null
});

// 2. 構成メンバー（原語名・ハングル、動的 QID）
bindings.forEach(b => {
  const memName = b.memberLabel?.value;
  if (!memName || /^Q\d+$/.test(memName)) return;

  const origName = b.memberKoLabel?.value || b.memberEnLabel?.value || null;
  const rawGender = (b.genderLabel?.value || '').toLowerCase();
  const gender = (rawGender === 'female' || rawGender === '女性') ? 'female' : ((rawGender === 'male' || rawGender === '男性') ? 'male' : null);
  const memQid = b.member?.value ? b.member.value.split('/').pop() : null; // 🎯 動的に取得された各メンバーの QID

  persons.push({
    name: memName,
    name_en: origName,
    occupation: '歌手',
    type: 'individual',
    parent_group: artistName,
    profile_url: b.memberImage?.value ? b.memberImage.value.replace(/^http:\/\//i, 'https://') : null,
    gender: gender,
    country: defaultCountry,
    wikidata_id: memQid // 🎯 APIから動的に取得された QID
  });
});

return persons.map(p => ({ json: p }));

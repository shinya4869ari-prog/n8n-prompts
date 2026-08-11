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

// 国籍判定（K-Pop や 韓国系人名なら KR）
const defaultCountry = (musicData.genre && musicData.genre.toLowerCase().includes('k-pop')) ? 'KR' : (musicData.country || 'KR');

// 1. アーティスト / グループ 本体の登録
persons.push({
  name: artistName,
  name_en: musicData.artist_name_en || null,
  occupation: isGroup ? 'グループ' : '歌手',
  type: isGroup ? 'group' : 'individual',
  group_type: musicData.genre || '音楽グループ',
  profile_url: musicData.artwork_url || null,
  country: defaultCountry,
  members: null
});

// 2. Wikidata メンバーの個別登録
bindings.forEach(b => {
  const memName = b.memberLabel?.value;
  if (!memName || /^Q\d+$/.test(memName)) return;

  // 原語名（ハングル koLabel を最優先、無ければ 英語 enLabel）
  const origName = b.memberKoLabel?.value || b.memberEnLabel?.value || null;

  // 性別判定（"女性" / "female" ➔ female）
  const rawGender = (b.genderLabel?.value || '').toLowerCase();
  const gender = (rawGender === 'female' || rawGender === '女性') ? 'female' : ((rawGender === 'male' || rawGender === '男性') ? 'male' : null);

  persons.push({
    name: memName,
    name_en: origName,  // 🎯 韓国系ならハングル(지수), 欧米系なら英語(Jisoo)
    occupation: '歌手',
    type: 'individual',
    parent_group: artistName, // 🎯 親グループ（BLACKPINK等）を自動紐づけ！
    profile_url: b.memberImage?.value ? b.memberImage.value.replace(/^http:\/\//i, 'https://') : null,
    gender: gender,
    country: defaultCountry
  });
});

return persons.map(p => ({ json: p }));

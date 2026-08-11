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

// 🎯 グループ本体の Wikidata QID 抽出 (例: Q25056960)
let groupQid = null;
if (bindings.length > 0 && bindings[0].group?.value) {
  groupQid = bindings[0].group.value.split('/').pop();
} else if (artistName === 'BLACKPINK' || artistName === 'ブラックピンク') {
  groupQid = 'Q25056960';
} else if (artistName === 'BTS' || artistName === '防弾少年団') {
  groupQid = 'Q13580403';
}

// 映画DB統一ルール: 韓国系はハングル（블랙핑크 等）を格納
const getKoreanOrOrigName = (jaName, enName) => {
  if (jaName === 'BLACKPINK' || jaName === 'ブラックピンク') return '블랙핑크';
  if (jaName === 'BTS' || jaName === '防弾少年団') return '방탄소년단';
  if (jaName === 'TWICE') return '트와이스';
  if (jaName === 'NewJeans') return '뉴진스';
  return enName || null;
};

// 1. グループ本体（原語名にハングル "블랙핑크", QID抽出）
persons.push({
  name: artistName,
  name_en: defaultCountry === 'KR' ? getKoreanOrOrigName(artistName, musicData.artist_name_en) : (musicData.artist_name_en || null),
  occupation: isGroup ? 'グループ' : '歌手',
  type: isGroup ? 'group' : 'individual',
  group_type: musicData.genre || '音楽グループ',
  profile_url: musicData.artwork_url || null,
  country: defaultCountry,
  wikidata_id: groupQid, // 🎯 グループ本体の QID (BLACKPINK = Q25056960)
  members: null
});

// 2. 構成メンバー（原語名にハングル "지수", "제니", "로제", "리사", 各QID抽出）
bindings.forEach(b => {
  const memName = b.memberLabel?.value;
  if (!memName || /^Q\d+$/.test(memName)) return;

  const origName = b.memberKoLabel?.value || b.memberEnLabel?.value || null;
  const rawGender = (b.genderLabel?.value || '').toLowerCase();
  const gender = (rawGender === 'female' || rawGender === '女性') ? 'female' : ((rawGender === 'male' || rawGender === '男性') ? 'male' : null);
  const memQid = b.member?.value ? b.member.value.split('/').pop() : null;

  persons.push({
    name: memName,
    name_en: origName,
    occupation: '歌手',
    type: 'individual',
    parent_group: artistName,
    profile_url: b.memberImage?.value ? b.memberImage.value.replace(/^http:\/\//i, 'https://') : null,
    gender: gender,
    country: defaultCountry,
    wikidata_id: memQid // 🎯 メンバー個人の QID (Q27655361等)
  });
});

return persons.map(p => ({ json: p }));

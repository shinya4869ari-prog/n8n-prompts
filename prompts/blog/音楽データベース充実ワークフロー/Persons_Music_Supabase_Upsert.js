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

// 🎯 映画DBと完全に統一: 韓国系のグループ・アーティストはハングル表記（例: "블랙핑크"）を原語名として格納
const getKoreanOrOrigName = (jaName, enName, koName) => {
  if (koName) return koName;
  if (jaName === 'BLACKPINK' || jaName === 'ブラックピンク') return '블랙핑크';
  if (jaName === 'BTS' || jaName === '防弾少年団') return '방탄소년단';
  if (jaName === 'TWICE') return '트와이스';
  if (jaName === 'NewJeans') return '뉴진스';
  return enName || null;
};

// 1. アーティスト / グループ 本体の登録
persons.push({
  name: artistName,
  name_en: defaultCountry === 'KR' ? getKoreanOrOrigName(artistName, musicData.artist_name_en, null) : (musicData.artist_name_en || null),
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

  // 映画DB統一基準: ハングル(koLabel)を最優先！
  const origName = b.memberKoLabel?.value || b.memberEnLabel?.value || null;

  // 性別判定（"女性" / "female" ➔ female）
  const rawGender = (b.genderLabel?.value || '').toLowerCase();
  const gender = (rawGender === 'female' || rawGender === '女性') ? 'female' : ((rawGender === 'male' || rawGender === '男性') ? 'male' : null);

  persons.push({
    name: memName,
    name_en: origName,  // 🎯 映画DBと統一: ハングル(지수, 제니, 로제, 리사)を格納！
    occupation: '歌手',
    type: 'individual',
    parent_group: artistName,
    profile_url: b.memberImage?.value ? b.memberImage.value.replace(/^http:\/\//i, 'https://') : null,
    gender: gender,
    country: defaultCountry
  });
});

return persons.map(p => ({ json: p }));

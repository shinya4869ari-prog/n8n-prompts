/**
 * 【n8n用】音楽アーティスト＆メンバー Persons Supabase Upsert用整形コード (SNS 4大リンク対応版)
 * 
 * 役割: 音楽データベース充実ワークフローから出力されたグループ（例: BLACKPINK）および
 *       構成メンバー（例: ジス、ジェニー、ロゼ、リサ）の情報に加え、
 *       X (Twitter), Instagram, YouTube, 公式ウェブサイトの 4大リンクを自動抽出・結合して
 *       Supabase の "Persons" テーブルへ一括自動保存します。
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

// 🎯 API（Wikidata）の検索結果から動的に QID や SNS リンクを自動抽出！
let groupQid = null;
let groupTwitter = null;
let groupInsta = null;
let groupYt = null;
let groupWeb = null;

if (bindings.length > 0) {
  const b = bindings[0];
  if (b.group?.value) groupQid = b.group.value.split('/').pop();
  if (b.groupTwitter?.value) groupTwitter = b.groupTwitter.value.split('/').pop().replace('@', '');
  if (b.groupInstagram?.value) groupInsta = b.groupInstagram.value.split('/').pop().replace('@', '');
  if (b.groupYoutube?.value) groupYt = b.groupYoutube.value.split('/').pop();
  if (b.groupWebsite?.value) groupWeb = b.groupWebsite.value;
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
  wikidata_id: groupQid,
  x_id: groupTwitter,               // 🎯 X (Twitter) アカウント
  instagram_id: groupInsta,          // 🎯 Instagram アカウント
  youtube_id: groupYt,               // 🎯 YouTube チャンネル
  official_site: groupWeb,           // 🎯 公式ウェブサイト
  members: null
});

// 2. 構成メンバー（原語名・ハングル、動的 QID、SNS 4大リンク）
bindings.forEach(b => {
  const memName = b.memberLabel?.value;
  if (!memName || /^Q\d+$/.test(memName)) return;

  const origName = b.memberKoLabel?.value || b.memberEnLabel?.value || null;
  const rawGender = (b.genderLabel?.value || '').toLowerCase();
  const gender = (rawGender === 'female' || rawGender === '女性') ? 'female' : ((rawGender === 'male' || rawGender === '男性') ? 'male' : null);
  const memQid = b.member?.value ? b.member.value.split('/').pop() : null;

  let memTwitter = b.memberTwitter?.value ? b.memberTwitter.value.split('/').pop().replace('@', '') : null;
  let memInsta = b.memberInstagram?.value ? b.memberInstagram.value.split('/').pop().replace('@', '') : null;
  let memYt = b.memberYoutube?.value ? b.memberYoutube.value.split('/').pop() : null;
  let memWeb = b.memberWebsite?.value || null;

  persons.push({
    name: memName,
    name_en: origName,
    occupation: '歌手',
    type: 'individual',
    parent_group: artistName,
    profile_url: b.memberImage?.value ? b.memberImage.value.replace(/^http:\/\//i, 'https://') : null,
    gender: gender,
    country: defaultCountry,
    wikidata_id: memQid,
    x_id: memTwitter,             // 🎯 各メンバーの X (Twitter)
    instagram_id: memInsta,        // 🎯 各メンバーの Instagram
    youtube_id: memYt,             // 🎯 各メンバーの YouTube
    official_site: memWeb          // 🎯 各メンバーの 公式ウェブサイト
  });
});

return persons.map(p => ({ json: p }));

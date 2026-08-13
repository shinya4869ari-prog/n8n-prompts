/**
 * 【n8n用】音楽アーティスト＆メンバー Persons Supabase Upsert用整形コード (重複排除＆安全ガード版)
 * 
 * 役割: 音楽データベース充実ワークフローから出力されたグループおよび
 *       構成メンバーの情報から重複を完全に排除し、SNS 4大リンクと共に
 *       Supabase の "Persons" テーブルへ一括保存する完全な人物 JSON を作成します。
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
const seenNames = new Set();
const artistName = musicData.artist_name;
if (!artistName) return [];

const bindings = wikiData.results?.bindings || [];
const hasMembers = bindings.length > 0;

// 🎯 コラボ歌手（例: Mad Clown & Kim Na Young）などの場合、誤って前回のグループQIDが混ざらないよう判定
const isRealGroup = hasMembers || (musicData.type === 'group' && !artistName.includes('&') && !artistName.includes('with'));

const defaultCountry = (musicData.genre && musicData.genre.toLowerCase().includes('k-pop')) ? 'KR' : (musicData.country || 'KR');

// 🎯 QID や SNS リンクを自動抽出
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
seenNames.add(artistName);
persons.push({
  name: artistName,
  name_en: (defaultCountry === 'KR' && musicData.artist_name_en) ? musicData.artist_name_en : (musicData.artist_name_en || null),
  occupation: isRealGroup ? 'グループ' : '歌手',
  type: isRealGroup ? 'group' : 'individual',
  group_type: musicData.genre || '音楽グループ',
  profile_url: musicData.artwork_url || null,
  country: defaultCountry,
  wikidata_id: isRealGroup ? groupQid : null,
  x_id: isRealGroup ? groupTwitter : null,
  instagram_id: isRealGroup ? groupInsta : null,
  youtube_id: isRealGroup ? groupYt : null,
  official_site: isRealGroup ? groupWeb : null,
  members: null
});

// 2. 構成メンバー（重複排除＆安全合体）
if (isRealGroup) {
  bindings.forEach(b => {
    const memName = b.memberLabel?.value;
    if (!memName || /^Q\d+$/.test(memName) || seenNames.has(memName)) return;
    seenNames.add(memName);

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
      x_id: memTwitter,
      instagram_id: memInsta,
      youtube_id: memYt,
      official_site: memWeb
    });
  });
}

return persons.map(p => ({ json: p }));

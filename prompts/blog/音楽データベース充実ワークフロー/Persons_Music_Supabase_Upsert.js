/**
 * 【n8n用】音楽 Person データ Supabase Upsert整形コード
 * 
 * 役割: ソロ歌手・グループ・メンバー問わず、Wikidata P18 (画像) から
 *       "https://commons.wikimedia.org/wiki/Special:FilePath/..." のプロフィール画像を自動生成し、
 *       SNS 4大リンクと共に Supabase へ完全保存します。
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
const artistName = musicData.artist_name || input['アーティスト名 / グループ名'] || input.q;
if (!artistName) return [];

const bindings = wikiData.results?.bindings || [];
const hasMembers = bindings.length > 0;
const isRealGroup = hasMembers || (musicData.type === 'group' && !artistName.includes('&') && !artistName.includes('with'));

const defaultCountry = (musicData.genre && musicData.genre.toLowerCase().includes('k-pop')) ? 'KR' : (musicData.country || 'KR');

// Wikidata から QID, SNS, 画像を自動抽出
let groupQid = input['Wikidata ID (QID)'] || null;
let groupTwitter = null;
let groupInsta = null;
let groupYt = null;
let groupWeb = null;
let groupImage = null;

if (bindings.length > 0) {
  const b = bindings[0];
  if (b.group?.value) groupQid = b.group.value.split('/').pop();
  if (b.groupTwitter?.value) groupTwitter = b.groupTwitter.value.split('/').pop().replace('@', '');
  if (b.groupInstagram?.value) groupInsta = b.groupInstagram.value.split('/').pop().replace('@', '');
  if (b.groupYoutube?.value) groupYt = b.groupYoutube.value.split('/').pop();
  if (b.groupWebsite?.value) groupWeb = b.groupWebsite.value;
  
  // 🎯 Wikidata の写真 URL を Special:FilePath に整形
  if (b.image?.value || b.memberImage?.value) {
    const rawImg = b.image?.value || b.memberImage?.value;
    const fileName = decodeURIComponent(rawImg.split('/Special:FilePath/').pop().split('/').pop());
    groupImage = `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}`;
  }
}

// プロフィール画像の決定（Wikidata 写真 > iTunes ジャケット写真）
const finalProfileUrl = groupImage || musicData.artwork_url || null;

// 1. アーティスト / グループ 本体の登録
seenNames.add(artistName);
persons.push({
  name: artistName,
  name_en: (defaultCountry === 'KR' && musicData.artist_name_en) ? musicData.artist_name_en : (musicData.artist_name_en || null),
  occupation: isRealGroup ? 'グループ' : '歌手',
  type: isRealGroup ? 'group' : 'individual',
  group_type: musicData.genre || '音楽',
  profile_url: finalProfileUrl,
  country: defaultCountry,
  wikidata_id: groupQid,
  x_id: groupTwitter,
  instagram_id: groupInsta,
  youtube_id: groupYt,
  official_site: groupWeb,
  members: null
});

// 2. 構成メンバー（グループ時のみ）
if (isRealGroup) {
  bindings.forEach(b => {
    const memName = b.memberLabel?.value;
    if (!memName || /^Q\d+$/.test(memName) || seenNames.has(memName)) return;
    seenNames.add(memName);

    const origName = b.memberKoLabel?.value || b.memberEnLabel?.value || null;
    const rawGender = (b.genderLabel?.value || '').toLowerCase();
    const gender = (rawGender === 'female' || rawGender === '女性') ? 'female' : ((rawGender === 'male' || rawGender === '男性') ? 'male' : null);
    const memQid = b.member?.value ? b.member.value.split('/').pop() : null;

    let memImage = null;
    if (b.memberImage?.value) {
      const fileName = decodeURIComponent(b.memberImage.value.split('/Special:FilePath/').pop().split('/').pop());
      memImage = `https://commons.wikimedia.org/wiki/Special:FilePath/${fileName}`;
    }

    persons.push({
      name: memName,
      name_en: origName,
      occupation: '歌手',
      type: 'individual',
      parent_group: artistName,
      profile_url: memImage,
      gender: gender,
      country: defaultCountry,
      wikidata_id: memQid,
      x_id: b.memberTwitter?.value ? b.memberTwitter.value.split('/').pop().replace('@', '') : null,
      instagram_id: b.memberInstagram?.value ? b.memberInstagram.value.split('/').pop().replace('@', '') : null,
      youtube_id: b.memberYoutube?.value ? b.memberYoutube.value.split('/').pop() : null,
      official_site: b.memberWebsite?.value || null
    });
  });
}

return persons.map(p => ({ json: p }));

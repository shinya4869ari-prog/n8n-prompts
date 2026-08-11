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
  } else {
    wikiData = wikiRaw;
  }
} catch(e) {
  wikiData = {};
}

const persons = [];
const artistName = musicData.artist_name;
if (!artistName) return [];

// 1. アーティスト / グループ 本体の登録
persons.push({
  name: artistName,
  name_en: musicData.artist_name_en || null,
  occupation: musicData.type === 'group' ? 'グループ' : '歌手',
  type: musicData.type || 'group',
  group_type: musicData.genre || '音楽アーティスト',
  profile_url: musicData.artwork_url || null,
  country: musicData.country || null,
  members: null
});

// 2. Wikidata や 入力データからのメンバー自動分割保存
if (wikiData && Array.isArray(wikiData.results?.bindings)) {
  wikiData.results.bindings.forEach(b => {
    const memName = b.memberLabel?.value;
    if (!memName || /^Q\d+$/.test(memName)) return;

    persons.push({
      name: memName,
      name_en: b.memberEnLabel?.value || null,
      occupation: '歌手',
      type: 'individual',
      parent_group: artistName, // 🎯 BLACKPINK 等の親グループ名を自動紐づけ！
      profile_url: b.memberImage?.value ? b.memberImage.value.replace(/^http:\/\//i, 'https://') : null,
      gender: b.genderLabel?.value === 'female' ? 'female' : (b.genderLabel?.value === 'male' ? 'male' : null),
      country: musicData.country || null
    });
  });
}

return persons.map(p => ({ json: p }));

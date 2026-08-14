/**
 * 【n8n用】人物データベース (Persons) Supabase Upsert用整形コード (韓国ハングル完全保証版)
 * 
 * 役割: 「大韓民国」を含む韓国人データの場合、Wikidataの personKoLabel または
 *       入力のハングルを最優先で name_en にセットし、確実にハングルで保存します。
 */

function cleanSnsHandle(handleOrUrl) {
  if (!handleOrUrl || typeof handleOrUrl !== 'string') return null;
  let str = handleOrUrl.trim();
  if (!str) return null;
  if (str.includes('/')) {
    str = str.split('?')[0].replace(/\/$/, '').split('/').pop();
  }
  str = str.replace(/^@/, '');
  return str.length > 0 ? str : null;
}

function cleanImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let clean = url.trim();
  if (clean.startsWith('http://')) {
    clean = clean.replace(/^http:\/\//i, 'https://');
  }
  if (clean.includes('Special:FilePath/')) {
    const fileName = clean.split('Special:FilePath/').pop();
    clean = `https://commons.wikimedia.org/wiki/Special:Redirect/file/${fileName}`;
  }
  return clean;
}

function inferCountryCode(countryStr) {
  if (!countryStr) return 'KR';
  const str = countryStr.toLowerCase();
  // 「大韓民国」「韓国」「Korea」「KR」を確実に KR と判定
  if (str.includes('韓') || str.includes('korea') || str === 'kr') return 'KR';
  if (str.includes('日本') || str.includes('japan') || str === 'jp') return 'JP';
  if (str.includes('アメリカ') || str.includes('usa') || str === 'us') return 'US';
  if (str.includes('イギリス') || str.includes('uk') || str === 'gb') return 'GB';
  if (str.includes('中国') || str.includes('china') || str === 'cn') return 'CN';
  if (str.includes('フランス') || str.includes('france') || str === 'fr') return 'FR';
  return countryStr;
}

// 1. 全アイテムの配列を取得
const allInputs = $input.all();
let allWiki = [];
try { allWiki = $('Wikidata人物情報取得').all(); } catch(e) {}
let allGemini = [];
try { allGemini = $('Gemini人物クレンジング').all(); } catch(e) {}

const results = [];

// 2. 届いた全アイテム（全員分）を確実にループ処理
for (let i = 0; i < allInputs.length; i++) {
  const input = allInputs[i].json || {};
  const wikiRaw = allWiki[i]?.json || {};
  const geminiRaw = allGemini[i]?.json || input;

  // Gemini 生成文 (bio) の抽出
  let bioText = null;
  if (geminiRaw.content?.parts?.[0]?.text) {
    bioText = geminiRaw.content.parts[0].text.trim();
  } else if (typeof geminiRaw === 'string') {
    bioText = geminiRaw.trim();
  } else if (geminiRaw.text || geminiRaw.output) {
    bioText = (geminiRaw.text || geminiRaw.output).trim();
  }

  // Wikidata 文字列の安全な JSON パース
  let wikiData = wikiRaw;
  try {
    if (typeof wikiRaw.data === 'string') {
      wikiData = JSON.parse(wikiRaw.data);
    } else if (wikiRaw.data) {
      wikiData = wikiRaw.data;
    }
  } catch(e) {
    wikiData = wikiRaw;
  }

  const bindings = wikiData.results?.bindings || [];
  const wikiFirst = bindings.length > 0 ? bindings[0] : {};

  // QID
  let qid = input.wikidata_id || null;
  if (!qid && wikiFirst.person?.value) {
    qid = wikiFirst.person.value.split('/').pop();
  }

  // 名前（日本語）
  const name = input.name || wikiFirst.personJaLabel?.value || wikiFirst.personLabel?.value || null;
  if (!name) continue;

  // 国籍（大韓民国 -> KR に変換）
  const country = inferCountryCode(wikiFirst.countryLabel?.value || input.country);

  // 🎯 韓国人の場合: ハングル表記 (personKoLabel) を最優先セット
  let nameEn = null;
  if (country === 'KR') {
    nameEn = wikiFirst.personKoLabel?.value || (input.name_en && /[\uac00-\ud7af]/.test(input.name_en) ? input.name_en : null) || wikiFirst.personEnLabel?.value || input.name_en || null;
  } else {
    nameEn = wikiFirst.personEnLabel?.value || input.name_en || null;
  }

  // 職業
  const occupation = input.occupation || wikiFirst.occupationLabel?.value || '俳優';

  // 性別
  let gender = (input.gender || wikiFirst.genderLabel?.value || '').toLowerCase();
  if (gender.includes('female') || gender.includes('女性')) gender = 'female';
  else if (gender.includes('male') || gender.includes('男性')) gender = 'male';
  else gender = null;

  // 画像URL
  const profileUrl = cleanImageUrl(wikiFirst.image?.value || input.profile_url);

  // SNS リンク
  const xId = cleanSnsHandle(wikiFirst.twitter?.value || input.x_id);
  const instaId = cleanSnsHandle(wikiFirst.instagram?.value || input.instagram_id);
  const ytId = cleanSnsHandle(wikiFirst.youtube?.value || input.youtube_id);
  const officialSite = wikiFirst.website?.value || input.official_site || null;

  // Supabase "Persons" テーブル完全互換レコード
  const personRecord = {
    id: input.id || undefined,
    name: name,
    name_en: nameEn,
    occupation: occupation,
    profile_url: profileUrl,
    gender: gender,
    country: country,
    wikidata_id: qid,
    type: input.type || 'individual',
    group_type: input.group_type || null,
    parent_group: input.parent_group || null,
    members: input.members || null,
    x_id: xId,
    instagram_id: instaId,
    youtube_id: ytId,
    official_site: officialSite,
    bio: bioText || input.bio || null
  };

  if (personRecord.id === undefined) delete personRecord.id;

  results.push({ json: personRecord });
}

return results;

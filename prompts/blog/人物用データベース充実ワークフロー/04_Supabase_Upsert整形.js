// 1. 各ノードからデータを取得（番号付き・なし、body階層の完全吸収）
function findNode(names) {
  for (const n of names) {
    try {
      const d = $(n).first()?.json;
      if (d && Object.keys(d).length > 0) return d;
    } catch(e) {}
  }
  return {};
}

const rawWebhook = findNode(['Webhook受信トリガー', '01_Webhook受信トリガー', 'Webhook']);
const webhookData = rawWebhook.body || rawWebhook;

const wikiRaw = findNode(['02_Wikidata詳細取得', 'Wikidata詳細取得', 'HTTP Request']);

let geminiOutput = $input.first()?.json || {};
if (!geminiOutput || (!geminiOutput.output && !geminiOutput.text && !geminiOutput.response)) {
  geminiOutput = findNode(['03_Gemini人物クレンジング', 'Gemini人物クレンジング', 'Google Gemini', 'Basic LLM Chain']);
}

// 2. Wikidata レスポンスのパース
let wikiBindings = {};
try {
  let parsed = typeof wikiRaw.data === 'string' ? JSON.parse(wikiRaw.data) : (wikiRaw.data || wikiRaw);
  wikiBindings = parsed.results?.bindings?.[0] || {};
} catch (e) {
  wikiBindings = {};
}

// 3. ヘルパー関数: SNSアカウント/URLクレンジング
function cleanSocialId(val) {
  if (!val) return null;
  val = String(val).trim();
  if (val.includes('/')) {
    val = val.split('?')[0].replace(/\/$/, '').split('/').pop();
  }
  return val.replace(/^@/, '') || null;
}

// 4. bioの抽出
let bioText = geminiOutput.output || geminiOutput.text || geminiOutput.response || '';
if (typeof bioText === 'object') {
  bioText = JSON.stringify(bioText);
}
bioText = bioText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

// 5. 性別の正規化
let gender = null;
const rawGender = String(wikiBindings.genderLabel?.value || webhookData.gender || '').toLowerCase();
if (rawGender.includes('男') || rawGender === 'male') {
  gender = 'male';
} else if (rawGender.includes('女') || rawGender === 'female') {
  gender = 'female';
}

// 6. 写真URL（『iD教えて』の高画質ポスターを最優先、なければWikidata）
let photoUrl = webhookData.profile_url || webhookData.profile_path || null;
if (!photoUrl && wikiBindings.image?.value) {
  photoUrl = wikiBindings.image.value;
}

// 7. 国コードの徹底正規化（ISO 2文字コード: KR, JP, US 等）
function normalizeIsoCountry(val) {
  if (!val) return 'KR';
  const s = String(val).trim().toLowerCase();
  if (s.includes('大韓') || s.includes('韓国') || s.includes('korea') || s.includes('대한민국') || s.includes('한국') || s === 'kr') {
    return 'KR';
  }
  if (s.includes('日本') || s.includes('japan') || s === 'jp') {
    return 'JP';
  }
  if (s.includes('アメリカ') || s.includes('米国') || s.includes('usa') || s.includes('united states') || s === 'us') {
    return 'US';
  }
  if (s.includes('中国') || s.includes('china') || s === 'cn') {
    return 'CN';
  }
  if (s.includes('イギリス') || s.includes('英国') || s.includes('uk') || s.includes('britain') || s === 'gb') {
    return 'GB';
  }
  if (/^[a-z]{2}$/i.test(s)) {
    return s.toUpperCase();
  }
  return 'KR';
}

const rawCountry = webhookData.country || wikiBindings.countryLabel?.value || 'KR';
const country = normalizeIsoCountry(rawCountry);

// 8. Supabase Persons レコード作成
const record = {
  name: webhookData.name || wikiBindings.personJaLabel?.value || wikiBindings.personLabel?.value || '',
  name_en: webhookData.original_name || wikiBindings.personKoLabel?.value || wikiBindings.personEnLabel?.value || null,
  occupation: webhookData.occupation || wikiBindings.occupationLabel?.value || wikiBindings.positionLabel?.value || null,
  country: country,
  gender: gender,
  profile_url: photoUrl,
  wikidata_id: webhookData.wikidata_id || (wikiBindings.person?.value ? wikiBindings.person.value.split('/').pop() : null),
  tmdb_id: webhookData.tmdb_id ? parseInt(webhookData.tmdb_id, 10) : (wikiBindings.tmdbId?.value ? parseInt(wikiBindings.tmdbId.value, 10) : null),
  type: webhookData.type || 'individual',
  group_type: webhookData.group_type || null,
  parent_group: webhookData.parent_group || null,
  members: webhookData.members || null,
  x_id: cleanSocialId(wikiBindings.twitter?.value),
  instagram_id: cleanSocialId(wikiBindings.instagram?.value),
  youtube_id: cleanSocialId(wikiBindings.youtube?.value),
  favorite_youtube: null,
  official_site: wikiBindings.website?.value || webhookData.wikipedia_url || null,
  bio: bioText || null
};

// 推しフラグ保護
if (webhookData.is_favorite !== undefined) {
  record.is_favorite = Boolean(webhookData.is_favorite);
}

return [{ json: record }];

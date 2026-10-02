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

// 7. 国コードの推論
let country = webhookData.country || wikiBindings.countryLabel?.value || 'KR';
if (country.includes('韓国') || country.includes('Korea') || country.includes('大韓') || country.includes('朝鮮')) {
  country = 'KR';
} else if (country.includes('日本') || country.includes('Japan')) {
  country = 'JP';
} else if (country.includes('アメリカ') || country.includes('USA') || country.includes('米国')) {
  country = 'US';
}

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

/**
 * 【05】Supabase Upsert整形 (Code Node)
 * 
 * 役割:
 *   1. 前段の「入力分割コード」「Wikidata人物情報取得」「Gemini人物クレンジング」のデータを完全統合。
 *   2. 俳優・監督だけでなく、政治家・歴史上の人物・アイドル・学者等あらゆるジャンルを適切にスコアリング選定。
 *   3. 画像URL正規化、SNSアカウント整形、TMDb ID、国籍コード、役職・職業をクレンジング。
 *   4. Supabase "Persons" テーブル最新スキーマ（tmdb_id, favorite_youtube含む）と完全互換のUpsert用JSONを出力。
 *   5. is_favorite を誤って false でリセットしない安全設計（未指定時はキーを除外して既存値を保護）。
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
  const str = String(countryStr).toLowerCase();
  if (str.includes('韓') || str.includes('korea') || str === 'kr' || str.includes('朝鮮') || str.includes('joseon') || str.includes('高麗')) return 'KR';
  if (str.includes('日本') || str.includes('japan') || str === 'jp') return 'JP';
  if (str.includes('アメリカ') || str.includes('usa') || str === 'us' || str.includes('米国')) return 'US';
  if (str.includes('イギリス') || str.includes('uk') || str === 'gb' || str.includes('英国')) return 'GB';
  if (str.includes('中国') || str.includes('china') || str === 'cn') return 'CN';
  if (str.includes('フランス') || str.includes('france') || str === 'fr') return 'FR';
  if (str.includes('ドイツ') || str.includes('germany') || str === 'de') return 'DE';
  return countryStr;
}

function findBestCandidate(bindings, input) {
  if (!bindings || !Array.isArray(bindings) || bindings.length === 0) return {};
  if (bindings.length === 1) return bindings[0];

  let bestScore = -999;
  let bestCandidate = bindings[0];

  const targetCountry = String(input.country || '').toLowerCase();
  const targetOcc = String(input.occupation || '').toLowerCase();
  const targetCat = String(input.category || '').toLowerCase();
  const targetName = String(input.name || '').toLowerCase();
  const targetNameEn = String(input.name_en || '').toLowerCase();

  for (const b of bindings) {
    let score = 0;
    const cLabel = String(b.countryLabel?.value || '').toLowerCase();
    const occLabel = String(b.occupationLabel?.value || '').toLowerCase();
    const posLabel = String(b.positionLabel?.value || '').toLowerCase();
    const partyLabel = String(b.partyLabel?.value || '').toLowerCase();
    const jaLabel = String(b.personJaLabel?.value || b.personLabel?.value || '').toLowerCase();
    const koLabel = String(b.personKoLabel?.value || '').toLowerCase();
    const enLabel = String(b.personEnLabel?.value || '').toLowerCase();

    // 1. 国籍・所属判定
    if (targetCountry.includes('kr') || targetCountry.includes('韓') || targetOcc.includes('韓')) {
      if (cLabel.includes('韓') || cLabel.includes('korea') || cLabel.includes('朝鮮') || cLabel.includes('大韓') || cLabel.includes('高麗')) {
        score += 80;
      } else if (cLabel) {
        score -= 50;
      }
    } else if (targetCountry.includes('jp') || targetCountry.includes('日')) {
      if (cLabel.includes('日本') || cLabel.includes('japan')) {
        score += 80;
      } else if (cLabel) {
        score -= 50;
      }
    }

    // 2. カテゴリ・職業の一致判定
    if (targetCat === 'politician' || targetOcc.includes('政治') || targetOcc.includes('大統領') || targetOcc.includes('議員') || targetOcc.includes('官僚')) {
      if (posLabel.includes('大統領') || posLabel.includes('総理') || posLabel.includes('議員') || posLabel.includes('知事') || posLabel.includes('長官')) score += 100;
      if (occLabel.includes('政治家') || occLabel.includes('弁護士') || occLabel.includes('検察官') || partyLabel) score += 60;
    } else if (targetCat === 'historical' || targetOcc.includes('歴史') || targetOcc.includes('王') || targetOcc.includes('将軍')) {
      if (posLabel.includes('王') || posLabel.includes('君主') || posLabel.includes('皇帝') || posLabel.includes('将軍') || posLabel.includes('提督')) score += 100;
      if (b.deathDate?.value) score += 40; // 没年がある = 歴史的人物
    } else if (targetCat === 'idol' || targetCat === 'singer' || targetOcc.includes('アイドル') || targetOcc.includes('歌手')) {
      if (occLabel.includes('歌手') || occLabel.includes('アイドル') || occLabel.includes('ミュージシャン') || b.membersList?.value) score += 80;
    } else if (targetCat === 'actor' || targetCat === 'director' || targetOcc.includes('俳優') || targetOcc.includes('女優') || targetOcc.includes('監督')) {
      if (occLabel.includes('俳優') || occLabel.includes('女優') || occLabel.includes('モデル') || occLabel.includes('映画監督') || occLabel.includes('演出家')) score += 80;
      if (b.tmdbId?.value) score += 40; // TMDb ID がある = 映像関係者
    } else if (targetCat === 'author' || targetOcc.includes('学者') || targetOcc.includes('作家') || targetOcc.includes('教授')) {
      if (occLabel.includes('作家') || occLabel.includes('小説家') || occLabel.includes('学者') || occLabel.includes('教授') || occLabel.includes('ジャーナリスト')) score += 80;
    } else {
      // カテゴリ未指定の場合：TMDb ID、公職、または職業があれば加点
      if (posLabel) score += 30;
      if (occLabel) score += 20;
      if (b.tmdbId?.value) score += 30;
    }

    // 3. 画像あり
    if (b.image?.value) score += 25;

    // 4. SNS / 公式情報あり
    if (b.instagram?.value || b.twitter?.value || b.youtube?.value || b.website?.value) score += 20;

    // 5. 名前の一致度
    if (targetName && (jaLabel.includes(targetName) || koLabel.includes(targetName) || enLabel.includes(targetName))) score += 40;
    if (targetNameEn && (koLabel.includes(targetNameEn) || enLabel.includes(targetNameEn))) score += 40;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = b;
    }
  }

  return bestCandidate;
}

function extractBindings(raw) {
  if (!raw) return [];
  if (Array.isArray(raw.results?.bindings)) return raw.results.bindings;
  if (Array.isArray(raw.bindings)) return raw.bindings;
  let parsed = raw;
  if (typeof raw.data === 'string') {
    try { parsed = JSON.parse(raw.data); } catch(e) {}
  } else if (raw.data && typeof raw.data === 'object') {
    parsed = raw.data;
  } else if (typeof raw.body === 'string') {
    try { parsed = JSON.parse(raw.body); } catch(e) {}
  } else if (raw.body && typeof raw.body === 'object') {
    parsed = raw.body;
  }
  if (Array.isArray(parsed?.results?.bindings)) return parsed.results.bindings;
  if (Array.isArray(parsed?.bindings)) return parsed.bindings;
  return [];
}

// 1. 各ノードから全アイテムの配列を安全に取得
let allOriginalInputs = [];
const inputCandidates = ['入力分割コード', '人物データベース登録フォーム', 'Code', 'Code1', '入力分割', 'Supabase入力分割', 'Edit Fields', 'Webhook', 'Form Trigger'];
for (const inName of inputCandidates) {
  try {
    const items = $(inName).all();
    if (items && items.length > 0) {
      allOriginalInputs = items;
      break;
    }
  } catch(e) {}
}
if (!allOriginalInputs.length) {
  allOriginalInputs = $input.all();
}

let allWiki = [];
const wikiCandidates = ['Wikidata人物情報取得', 'Wikidata', 'HTTP Request', 'HTTP Request1', 'HTTP Request2', 'Wikidata取得', 'Wikidata_Person'];
for (const wn of wikiCandidates) {
  try {
    const w = $(wn).all();
    if (w && w.length > 0 && extractBindings(w[0]?.json).length > 0) {
      allWiki = w;
      break;
    }
  } catch(e) {}
}
if (!allWiki.length) {
  try { allWiki = $('Wikidata人物情報取得').all(); } catch(e) {}
}

let allGemini = [];
try { allGemini = $('Gemini人物クレンジング').all(); } catch(e) {}
if (!allGemini.length) {
  try { allGemini = $('Gemini').all(); } catch(e) {}
}

const results = [];
const loopCount = Math.max(allOriginalInputs.length, allGemini.length, allWiki.length, 1);

// 2. 届いた全アイテム（全員分）を確実にループ処理
for (let i = 0; i < loopCount; i++) {
  const input = allOriginalInputs[i]?.json || {};
  const wikiRaw = allWiki[i]?.json || {};
  const geminiRaw = allGemini[i]?.json || $input.all()[i]?.json || {};

  // Gemini 生成文 (bio) の抽出
  let bioText = null;
  if (geminiRaw.content?.parts?.[0]?.text) {
    bioText = geminiRaw.content.parts[0].text.trim();
  } else if (typeof geminiRaw === 'string') {
    bioText = geminiRaw.trim();
  } else if (geminiRaw.text || geminiRaw.output) {
    bioText = String(geminiRaw.text || geminiRaw.output).trim();
  }

  const bindings = extractBindings(wikiRaw);
  const wikiFirst = findBestCandidate(bindings, input);

  // QID
  let qid = input.wikidata_id || input['Wikidata ID (QID)'] || null;
  if (!qid && wikiFirst.person?.value) {
    qid = wikiFirst.person.value.split('/').pop();
  }

  // 名前（入力、Wikidataラベル、Gemini文頭から徹底抽出）
  let name = input.name || input['人物名'] || input['名前'] || input['name_ja'] || input.person || input.title || wikiFirst.personJaLabel?.value || wikiFirst.personLabel?.value || null;
  if (!name && bioText) {
    const match = bioText.match(/^([^\s、,は（\(]+)/);
    if (match) name = match[1];
  }
  if (!name) name = "人物";

  // 国籍（大韓民国 / 朝鮮国 -> KR）
  const country = inferCountryCode(wikiFirst.countryLabel?.value || input.country);

  // 原語名（韓国人の場合はハングル表記 personKoLabel を最優先）
  let nameEn = null;
  if (country === 'KR') {
    nameEn = wikiFirst.personKoLabel?.value || (input.name_en && /[\uac00-\ud7af]/.test(input.name_en) ? input.name_en : null) || wikiFirst.personEnLabel?.value || input.name_en || null;
  } else {
    nameEn = wikiFirst.personEnLabel?.value || input.name_en || null;
  }

  // メンバー・グループ判定
  const members = wikiFirst.membersList?.value || input.members || null;
  const isGroup = !!members || input.type === 'group';
  const type = isGroup ? 'group' : (input.type || 'individual');

  // 職業・肩書（Wikidataの公職・職業または入力値をスマート適用）
  let occupation = input.occupation || input['職業・肩書 / 検索ヒント'] || input['職業'];
  if (!occupation) {
    if (wikiFirst.positionLabel?.value) {
      occupation = wikiFirst.positionLabel.value;
    } else if (wikiFirst.occupationLabel?.value) {
      occupation = wikiFirst.occupationLabel.value;
    } else if (isGroup) {
      occupation = 'グループ';
    } else {
      occupation = '文化人';
    }
  }

  // 性別
  let gender = (input.gender || wikiFirst.genderLabel?.value || '').toLowerCase();
  if (gender.includes('female') || gender.includes('女性')) gender = 'female';
  else if (gender.includes('male') || gender.includes('男性')) gender = 'male';
  else gender = isGroup ? null : null;

  // 画像URL
  const profileUrl = cleanImageUrl(wikiFirst.image?.value || input.profile_url);

  // SNS リンク
  const xId = cleanSnsHandle(wikiFirst.twitter?.value || input.x_id);
  const instaId = cleanSnsHandle(wikiFirst.instagram?.value || input.instagram_id);
  const ytId = cleanSnsHandle(wikiFirst.youtube?.value || input.youtube_id);
  const officialSite = wikiFirst.website?.value || input.official_site || null;

  // TMDb ID (数値型として安全に抽出)
  let tmdbId = null;
  const rawTmdb = input.tmdb_id || wikiFirst.tmdbId?.value;
  if (rawTmdb !== null && rawTmdb !== undefined && !isNaN(Number(rawTmdb))) {
    tmdbId = parseInt(rawTmdb, 10);
  }

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
    type: type,
    group_type: input.group_type || null,
    parent_group: input.parent_group || null,
    members: members,
    x_id: xId,
    instagram_id: instaId,
    youtube_id: ytId,
    official_site: officialSite,
    bio: bioText || input.bio || null,
    tmdb_id: tmdbId,
    favorite_youtube: input.favorite_youtube || null
  };

  // 💡 is_favorite は入力で明示された場合のみ含め、未指定時は既存のお気に入りフラグを上書き保護
  if (input.is_favorite !== undefined && input.is_favorite !== null) {
    personRecord.is_favorite = Boolean(input.is_favorite);
  }

  if (personRecord.id === undefined) delete personRecord.id;

  results.push({ json: personRecord });
}

return results;

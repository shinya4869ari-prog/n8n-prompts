// 他のノードから元の入力データ（国・年・タイトル・メディア種別・監督・キャスト）を安全に取得
function getSourceData() {
  const nodeNames = [
    'スクショ解析結果整形',
    '入力統一・分割コード',
    '映画ごとにループ実行',
    'Loop Over Items',
    'On form submission',
    'On form submission1'
  ];
  for (const name of nodeNames) {
    try {
      const d = $(name).first()?.json || $(name).item?.json;
      if (d && (d.title || d.origin_title || d.target_country || d.country)) return d;
    } catch(e) {}
  }
  return {};
}

const sourceData = getSourceData();

// 🎯【国コード】Geminiまたはフォームから確定した国コード（JP, KR, US等）
const rawCountry = sourceData.target_country || sourceData.country || null;
const targetCountry = (rawCountry && !rawCountry.includes('OTHER') && !rawCountry.includes('all')) 
  ? String(rawCountry).toUpperCase().trim() 
  : null;

const targetTitle = (sourceData.title || sourceData.query || '').trim();
const targetYear = sourceData.year ? parseInt(String(sourceData.year).substring(0, 4), 10) : null;
const targetLang = sourceData.target_lang || null;

// 🎯【メディア種別】Geminiまたはフォームから確定した種別（movie / tv）
const targetMediaType = (sourceData.media_type && !sourceData.media_type.includes('all')) 
  ? (sourceData.media_type.includes('tv') ? 'tv' : 'movie') 
  : null;

// 1. 直前の入力データ（TMDb検索_タイトル または ID判定 から届いたデータ）
const directInput = $input.first()?.json || {};
const directList = directInput.results || (directInput.id ? [directInput] : []);

// 2. ID/Wikidata検索結果 (res1) の取得
let rawRes1 = {};
try {
  rawRes1 = $('TMDb検索_ID/Wikidata').first()?.json || {};
} catch(e) {}

const res1Candidates = [];
if (targetMediaType === 'tv') {
  if (rawRes1.tv_results) rawRes1.tv_results.forEach(m => res1Candidates.push({ ...m, media_type: 'tv' }));
} else if (targetMediaType === 'movie') {
  if (rawRes1.movie_results) rawRes1.movie_results.forEach(m => res1Candidates.push({ ...m, media_type: 'movie' }));
} else {
  if (rawRes1.movie_results) rawRes1.movie_results.forEach(m => res1Candidates.push({ ...m, media_type: 'movie' }));
  if (rawRes1.tv_results) rawRes1.tv_results.forEach(m => res1Candidates.push({ ...m, media_type: 'tv' }));
  if (rawRes1.id) res1Candidates.push(rawRes1);
}

// 3. タイトル検索結果 (res2) の取得
let res2List = [];
try {
  const tData = $('TMDb検索_タイトル').first()?.json;
  if (tData?.results) res2List = tData.results;
  else if (tData?.id) res2List = [tData];
} catch(e) {}

// すべての候補を合算（直前の入力 ＋ タイトル検索 ＋ ID検索）
const allCandidates = [];
const seenIds = new Set();
[...directList, ...res2List, ...res1Candidates].forEach(m => {
  if (m && m.id && !seenIds.has(m.id)) {
    seenIds.add(m.id);
    allCandidates.push(m);
  }
});

// 国コードと原語コードの対応マップ
const countryLangMap = {
  'KR': 'ko',
  'JP': 'ja',
  'US': 'en',
  'GB': 'en',
  'CN': 'zh',
  'HK': 'zh',
  'TW': 'zh',
  'FR': 'fr',
  'DE': 'de',
  'ES': 'es',
  'IT': 'it'
};

// 指定された国コード・言語に合致しているかを判定する関数
function isCountryMatch(movie, targetCountry) {
  if (!targetCountry || targetCountry === 'OTHER') return true; // 国指定なしの場合はパス
  const originCountries = movie.origin_country || (movie.production_countries ? movie.production_countries.map(c => c.iso_3166_1) : []);
  const origLang = movie.original_language || '';
  const expectedLang = countryLangMap[targetCountry];

  // 1. origin_country に含まれているか
  if (Array.isArray(originCountries) && originCountries.length > 0) {
    if (originCountries.includes(targetCountry)) return true;
  }

  // 2. original_language が一致しているか（例: KRならko、JPならja）
  if (expectedLang && origLang === expectedLang) {
    return true;
  }

  return false;
}

// 4. 厳格フィルタリング（メディア種別・公開年・国コード）
const validCandidates = allCandidates.filter(movie => {
  const isTv = movie.media_type === 'tv' || !!movie.first_air_date || (movie.name && !movie.title);
  const isMovie = movie.media_type === 'movie' || !!movie.release_date || (movie.title && !movie.name);

  // 🎯 メディア種別判定（movie指定時にtvを除外、tv指定時にmovieを除外）
  if (targetMediaType === 'movie' && !isMovie && isTv) return false;
  if (targetMediaType === 'tv' && !isTv && isMovie) return false;

  const releaseDate = movie.release_date || movie.first_air_date || '';
  const releaseYear = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : null;

  // 🎯 公開年の判定（±1年以内。年が2年以上離れている場合は別作品として除外）
  if (targetYear && releaseYear && Math.abs(releaseYear - targetYear) > 1) {
    return false;
  }

  // 🎯 国コードの厳格判定（指定された国・言語に合致しない他国作品は100%除外）
  if (targetCountry && !isCountryMatch(movie, targetCountry)) {
    return false;
  }

  return true;
});

// 5. スコア計算関数（タイトル・国・年・種別の総合一致度）
function calculateScore(m) {
  let score = 0;
  const mTitle = (m.title || m.name || '').trim();
  const mOrig = (m.original_title || m.original_name || '').trim();
  const mYear = parseInt((m.release_date || m.first_air_date || '0').substring(0, 4), 10);
  const originCountries = m.origin_country || (m.production_countries ? m.production_countries.map(c => c.iso_3166_1) : []);

  // タイトル完全一致（最重要: +1000点）
  if (targetTitle && (mTitle === targetTitle || mOrig === targetTitle)) {
    score += 1000;
  } else if (targetTitle && (mTitle.includes(targetTitle) || targetTitle.includes(mTitle))) {
    score += 300;
  }

  // 国コード一致（+500点）
  if (targetCountry && isCountryMatch(m, targetCountry)) {
    score += 500;
  }

  // 公開年の完全一致（+500点）
  if (targetYear && mYear) {
    const diff = Math.abs(mYear - targetYear);
    if (diff === 0) score += 500;
    else if (diff === 1) score += 200;
    else score -= diff * 100;
  }

  // メディア種別の合致（+200点）
  const isMovie = m.media_type === 'movie' || !!m.release_date;
  if (targetMediaType === 'movie' && isMovie) score += 200;
  if (targetMediaType === 'tv' && !isMovie) score += 200;

  // 人気順（微加点）
  score += (m.popularity || 0) * 0.1;

  return score;
}

// 6. 最適な映画の選定
let matchedMovie = null;

// ① 厳格フィルタ通過候補からスコア順で選定
if (validCandidates.length > 0) {
  const sorted = [...validCandidates].sort((a, b) => calculateScore(b) - calculateScore(a));
  matchedMovie = sorted[0];
}

// ② 手動ID直接指定時の安全パススルー（IDを自分で指定した場合は最優先で通過）
if (!matchedMovie && (sourceData.tmdb_id || /^\d+$/.test(sourceData.query || ''))) {
  const directId = sourceData.tmdb_id || parseInt(sourceData.query, 10);
  matchedMovie = {
    id: directId,
    tmdb_id: directId,
    media_type: targetMediaType || 'movie'
  };
}

// 🛑 他国映画へのフォールバックは完全廃止！
// 国が指定されているのに一致する候補が見つからない場合は、別国映画の誤爆・APIコスト浪費を防ぐため即座にエラー停止
if (!matchedMovie && targetCountry && targetCountry !== 'OTHER') {
  const candidateSummary = allCandidates.map(c => `・${c.title || c.name} (${(c.origin_country || []).join(',') || c.original_language || '国不明'}, ${c.release_date || c.first_air_date || '年不明'})`).slice(0, 5).join('\n');
  throw new Error(
    `【安全停止】指定された国【${targetCountry}】に一致する作品がTMDbで見つかりませんでした。\n` +
    `（別国の同名作品への誤登録およびClaude/GeminiのAPIコスト浪費を防止するため、処理を中断しました）\n` +
    `■ 検索タイトル: 「${targetTitle || sourceData.query || '未指定'}」\n` +
    `■ 指定された国: ${targetCountry} / 年: ${targetYear || '指定なし'}\n` +
    (candidateSummary ? `■ TMDbで見つかった他国候補:\n${candidateSummary}\n` : '') +
    `💡 対処方法: TMDb ID（例: 964592）を直接指定するか、タイトル・公開年をご確認ください。`
  );
}

// 候補が本当に何もない場合
if (!matchedMovie) {
  throw new Error(`【検索未ヒット】「${targetTitle || sourceData.query || ''}」に一致する作品がTMDbで見つかりませんでした。TMDb IDを直接指定して再実行してください。`);
}

// 正しいメディア種別を確実に付与
matchedMovie.media_type = targetMediaType || matchedMovie.media_type || (matchedMovie.first_air_date ? 'tv' : 'movie');

return [{ json: matchedMovie }];

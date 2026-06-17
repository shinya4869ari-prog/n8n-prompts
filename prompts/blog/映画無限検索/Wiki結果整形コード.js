let raw = {};
try {
  raw = $('Wikidataから映画リスト取得').first().json.data || $('Wikidataから映画リスト取得').first().json;
} catch (e) {
  raw = $input.first().json.data || $input.first().json;
}

let bindings = [];
let parseError = null;
try {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  bindings = parsed?.results?.bindings || [];
} catch(e) {
  parseError = e.message;
}

if (bindings.length === 0) {
  return [{ 
    json: { 
      skip: true, 
      debug_reason: "No bindings found",
      rawType: typeof raw,
      rawKeys: raw ? Object.keys(raw) : [],
      parseError: parseError
    } 
  }];
}

// フォームトリガーノードから設定値を取得
let formNode = {};
try {
  formNode = $('n8n Form Trigger').first().json;
} catch(e) {
  try {
    formNode = $('n8n Form Trigger').item.json;
  } catch(e2) {
    try {
      formNode = $('country-master-lookup').first().json;
    } catch(e3) {
      // データベース行（created_atやposter_url等を持つ）の場合は検索条件として使用しない
      const firstInput = $input.first().json;
      if (firstInput && !firstInput.created_at && !firstInput.poster_url && !firstInput.overview) {
        formNode = firstInput;
      }
    }
  }
}

const rawLimit = formNode.limit || formNode.number || formNode.limitCount || formNode.count;
const limit = rawLimit ? parseInt(rawLimit) : 40;
const directorName = formNode.directorName || formNode.englishName || formNode['監督'] || formNode.director || formNode.director_name || '';

const movieMap = new Map();

// Supabase等データベースから既存の映画データを安全に取得して重複排除に使う
const existingTmdbIds = new Set();
const existingWikidataIds = new Set();
try {
  // ※ ワークフロー上のデータベース参照ノード（例: 'Supabase' や 'Get many rows'）から既存データを取得
  let dbData = [];
  try {
    dbData = $('Supabase').all();
  } catch (err1) {
    dbData = $('Get many rows').all();
  }
  for (const item of dbData) {
    const data = item.json;
    if (data.tmdb_id) {
      existingTmdbIds.add(parseInt(data.tmdb_id));
    }
    if (data.wikidata_id) {
      existingWikidataIds.add(String(data.wikidata_id).trim());
    }
  }
} catch (e) {
  // ノードが存在しない、またはまだ実行されていない場合はスキップ
}

// 国コードから言語コードへのマッピング（映画データベース充実ワークフロー準拠）
const countryToLang = {
  'KR': 'ko', 'JP': 'ja', 'US': 'en', 'GB': 'en', 'FR': 'fr', 'DE': 'de',
  'CN': 'zh', 'HK': 'zh', 'TW': 'zh', 'IN': 'hi', 'TH': 'th', 'IT': 'it',
  'ES': 'es', 'RU': 'ru', 'VN': 'vi', 'ID': 'id',
};

const filteredOut = [];

for (const b of bindings) {
  const movieUrl = b.movie?.value;
  const tmdb_id = b.tmdb?.value ? parseInt(b.tmdb.value) : null;
  const title = b.movieLabel?.value;
  
  if (!movieUrl || !tmdb_id) {
    filteredOut.push({ title, reason: 'Missing URL or TMDb ID' });
    continue;
  }

  const wikidata_id = movieUrl.split('/').pop() || null;

  // すでにデータベース（Supabase）に登録済みの映画は除外する
  if (existingTmdbIds.has(tmdb_id)) {
    filteredOut.push({ title, reason: 'Already in Supabase (TMDb ID matched)', tmdb_id });
    continue;
  }
  if (wikidata_id && existingWikidataIds.has(wikidata_id)) {
    filteredOut.push({ title, reason: 'Already in Supabase (Wikidata ID matched)', wikidata_id });
    continue;
  }

  if (!title || /^Q\d+$/.test(title)) {
    filteredOut.push({ title, reason: 'Missing or Invalid Title (Q-code)' });
    continue;
  }

  let movie = movieMap.get(movieUrl);
  if (!movie) {
    const target_country = b.countryCode?.value || null;
    const target_lang = target_country ? (countryToLang[target_country] || null) : null;

    movie = {
      title,
      origin_title: b.movieLabelKo?.value || b.movieLabelEn?.value || null,
      year: b.year?.value ? parseInt(b.year.value) : null,
      target_country,
      target_lang,
      tmdb_id,
      wikidata_id,
      director_name: directorName,
    };
    movieMap.set(movieUrl, movie);
  }
}

const movieList = Array.from(movieMap.values());

// 公開年が新しい順（降順）にソート
movieList.sort((a, b) => (b.year || 0) - (a.year || 0));

const results = movieList.slice(0, limit).map(movie => ({ json: movie }));

return results.length ? results : [{ 
  json: { 
    skip: true, 
    debug_reason: "All movies filtered out",
    filtered_details: filteredOut,
    existingTmdbIds: Array.from(existingTmdbIds),
    existingWikidataIds: Array.from(existingWikidataIds),
    wikidataMovies: bindings.map(b => ({
      title: b.movieLabel?.value,
      tmdb_id: b.tmdb?.value ? parseInt(b.tmdb.value) : null,
      wikidata_id: b.movie?.value ? b.movie.value.split('/').pop() : null
    }))
  } 
}];

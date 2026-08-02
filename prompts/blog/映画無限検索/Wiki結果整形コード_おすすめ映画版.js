let raw = {};
try {
  raw = $('Wikidataから映画リスト取得').first().json.data || $('Wikidataから映画リスト取得').first().json;
} catch (e) {
  try {
    raw = $('TMDb結果変換コード').first().json.data || $('TMDb結果変換コード').first().json;
  } catch (e2) {
    raw = $input.first().json.data || $input.first().json;
  }
}

let bindings = [];
let parseError = null;
try {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  bindings = parsed?.results?.bindings || [];
} catch(e) {
  parseError = e.message;
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

if (bindings.length === 0) {
  const country = formNode.country || formNode['国名（日本語）'] || '指定の国';
  const year = formNode.year || formNode['制作年数'] || '';
  const message = year ? `${country}の${year}年の映画はありませんでした。` : `${country}の映画は見つかりませんでした。`;

  return [{ 
    json: { 
      skip: true,
      message: message,
      debug_reason: "No bindings found",
      rawType: typeof raw,
      rawKeys: raw ? Object.keys(raw) : [],
      parseError: parseError
    } 
  }];
}

const rawLimit = formNode.limit || formNode.number || formNode.limitCount || formNode.count || formNode['リスト件数'];
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

  const rawWikidataId = movieUrl.split('/').pop() || null;
  const wikidata_id = (rawWikidataId && /^Q\d+$/.test(rawWikidataId)) ? rawWikidataId : null;

  // ★おすすめ映画版のため、データベース既存データの重複排除（除外）は行いません

  if (!title || /^Q\d+$/.test(title)) {
    filteredOut.push({ title, reason: 'Missing or Invalid Title (Q-code)' });
    continue;
  }

  let movie = movieMap.get(movieUrl);
  const currentCountryCode = b.countryCode?.value || null;
  const searchedCountryCode = formNode.countryCode || null;

  if (!movie) {
    movie = {
      title,
      origin_title: b.movieLabelKo?.value || b.movieLabelEn?.value || null,
      year: b.year?.value ? parseInt(b.year.value) : null,
      target_country: currentCountryCode,
      target_lang: currentCountryCode ? (countryToLang[currentCountryCode] || null) : null,
      tmdb_id,
      wikidata_id,
      director_name: directorName,
    };
    movieMap.set(movieUrl, movie);
  } else {
    // すでに仮登録された映画でも、今回の行の国コードが検索条件の国コード（例：KR）と一致していれば上書きする
    if (searchedCountryCode && currentCountryCode === searchedCountryCode) {
      movie.target_country = searchedCountryCode;
      movie.target_lang = countryToLang[searchedCountryCode] || null;
    }
  }
}

const movieList = Array.from(movieMap.values());

// 公開年が新しい順（降順）にソート
movieList.sort((a, b) => (b.year || 0) - (a.year || 0));

// 直近2026年から10件、26年がない場合は25年、25年がない場合は24年のフォールバック＆補完
const movies2026 = movieList.filter(m => m.year === 2026);
const movies2025 = movieList.filter(m => m.year === 2025);
const movies2024 = movieList.filter(m => m.year === 2024);

let selectedMovies = [];
const targetLimit = limit || 10;

// モード設定 (fill: 優先度付き補完 / strict: 完全年度フォールバック)
const fallbackMode = "fill"; 

if (fallbackMode === "strict") {
  if (movies2026.length > 0) {
    selectedMovies = movies2026.slice(0, targetLimit);
  } else if (movies2025.length > 0) {
    selectedMovies = movies2025.slice(0, targetLimit);
  } else if (movies2024.length > 0) {
    selectedMovies = movies2024.slice(0, targetLimit);
  } else {
    selectedMovies = movieList.slice(0, targetLimit);
  }
} else {
  // "fill": 2026年を優先し、足りない分を2025年、2024年で埋める
  selectedMovies = [...movies2026, ...movies2025, ...movies2024].slice(0, targetLimit);
  if (selectedMovies.length === 0) {
    selectedMovies = movieList.slice(0, targetLimit);
  }
}

const results = selectedMovies.map(movie => ({ json: movie }));

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

/**
 * 【n8n用】入力統一・分割コード（映画DB充実・個別登録版）
 * 
 * 役割: フォーム入力された値がどんなフィールド名であっても自動で値を拾い、
 *   - Wikidata QID（例: Q124128670, Q114414622）
 *   - TMDb ID（例: 849869, 1310677）
 *   - IMDb ID（例: tt16900880）
 *   - 映画タイトル（例: キル・ボクスン, ハナ・コリア）
 * のどれであっても自動判別して後続ノードへ渡します。
 */

const rawInput = $input.first()?.json || {};

// 1. フォームの入力値を全自動検出（どんなフィールド名・日本語ラベルでも確実に拾う）
let queryText = '';

// 指定の優先キーを確認（TMDb IDやQIDなどのIDを最優先で拾う）
const priorityKeys = ['id', 'tmdb_id', 'wikidata_id', 'qid', 'title', 'query', 'titles', '作品名', '映画名', 'TMDb ID'];
for (const key of priorityKeys) {
  if (rawInput[key] !== undefined && rawInput[key] !== null && String(rawInput[key]).trim() !== '') {
    queryText = String(rawInput[key]).trim();
    break;
  }
}

// 優先キーで見つからない場合、オブジェクト内の最初の文字列/数値を採用
if (!queryText) {
  const ignoreKeys = ['country', 'target_country', 'lang', 'target_lang', 'year', 'headers', 'params', 'query_params'];
  for (const key in rawInput) {
    if (!ignoreKeys.includes(key.toLowerCase()) && rawInput[key] !== undefined && rawInput[key] !== null) {
      const val = String(rawInput[key]).trim();
      if (val.length > 0) {
        queryText = val;
        break;
      }
    }
  }
}

// 2. 国・年・言語・メディア種別パラメータの取得
let targetCountry = rawInput.country || rawInput.target_country || null;
if (targetCountry && typeof targetCountry === 'string' && targetCountry.includes(':')) {
  targetCountry = targetCountry.split(':')[0].trim();
}
if (targetCountry === 'OTHER') targetCountry = null;

const targetYear = rawInput.year || null;
const targetLang = rawInput.target_lang || 'ja';

// メディア種別（映画 / ドラマ）の自動判別
let mediaType = null;
const rawMedia = String(rawInput.media_type || rawInput.type || '').toLowerCase();
if (rawMedia.includes('tv') || rawMedia.includes('ドラマ') || rawMedia.includes('series')) {
  mediaType = 'tv';
} else if (rawMedia.includes('movie') || rawMedia.includes('映画')) {
  mediaType = 'movie';
}

// 3. 入力値の種別判定（QID / TMDb ID / IMDb ID / タイトル）
let wikidataId = null;
let tmdbId = null;
let imdbId = null;
let title = '';

if (/^Q\d+$/i.test(queryText)) {
  // 1. Wikidata QID（例: Q124128670）
  wikidataId = queryText.toUpperCase();
} else if (/^tt\d+$/i.test(queryText)) {
  // 2. IMDb ID（例: tt16900880）
  imdbId = queryText.toLowerCase();
} else if (/^\d+$/.test(queryText)) {
  // 3. TMDb ID（例: 1310677, 849869）
  tmdbId = parseInt(queryText, 10);
} else {
  // 4. タイトル名（例: キル・ボクスン）
  title = queryText;
}

return [{
  json: {
    query: queryText,
    title: title || (tmdbId ? String(tmdbId) : (wikidataId || '')),
    origin_title: rawInput.origin_title || null,
    year: targetYear,
    target_country: targetCountry,
    country: targetCountry,
    media_type: mediaType,
    target_lang: targetLang,
    tmdb_id: tmdbId,
    wikidata_id: wikidataId,
    qid: wikidataId,
    imdb_id: imdbId
  }
}];

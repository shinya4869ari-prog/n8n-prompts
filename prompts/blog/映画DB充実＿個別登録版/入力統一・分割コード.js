/**
 * 【n8n用】入力統一・分割コード（映画DB充実・個別登録版）
 * 
 * 役割: フォーム入力された値が
 *   - Wikidata QID（例: Q124128670, Q114414622）
 *   - TMDb ID（例: 849869, 217553）
 *   - IMDb ID（例: tt16900880）
 *   - 映画タイトル（例: キル・ボクスン, 길복순, Kill Boksoon）
 * のどれであっても自動で判別し、統一フォーマットで後続ノードへ渡します。
 */

const rawInput = $input.first()?.json || {};

// フォーム入力フィールドの取得（柔軟なキー名に対応）
const queryText = String(
  rawInput.title || 
  rawInput.query || 
  rawInput.tmdb_id || 
  rawInput.wikidata_id || 
  rawInput.qid || 
  rawInput.id || 
  ''
).trim();

const targetCountry = rawInput.country || rawInput.target_country || 'KR';
const targetYear = rawInput.year || null;
const targetLang = rawInput.target_lang || 'ja';

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
  // 3. TMDb ID（例: 849869）
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
    target_lang: targetLang,
    tmdb_id: tmdbId,
    wikidata_id: wikidataId,
    qid: wikidataId,
    imdb_id: imdbId
  }
}];

/**
 * 【n8n用】入力統一・分割コード（映画DB充実・個別登録版 / 「iD教えて」アプリ & フォーム両対応）
 * 
 * 役割: 
 *   1. 「iD教えて」アプリからの Webhook 送信（body直下、単一作品、複数作品の配列）を完全自動検出
 *   2. 既存のフォーム入力（QID、TMDb ID、IMDb ID、映画タイトル手入力）との100%互換維持
 *   3. アプリから渡された正式タイトル、原題、公開年、国、ポスター画像、メディア種別をそのまま後続へ伝達
 */

// 1. 入力データの取得（Webhookの body、配列、単一オブジェクトのすべてに対応）
const firstItem = $input.first()?.json || {};
let items = [];

if (firstItem.body) {
  // Webhookノード経由の場合（body配下にデータがある場合）
  items = Array.isArray(firstItem.body) ? firstItem.body : [firstItem.body];
} else if (Array.isArray(firstItem)) {
  items = firstItem;
} else {
  // フォーム入力や、直下にデータが展開されている場合
  items = $input.all().map(i => i.json);
}

// 2. 各アイテムを正規化して出力
return items.map(rawInput => {
  // アプリまたはフォームから明示的に渡されたタイトルの保持
  const explicitTitle = rawInput.title || rawInput.作品名 || rawInput.映画名 || '';
  const explicitOriginTitle = rawInput.original_title || rawInput.origin_title || null;
  const explicitTmdbId = rawInput.tmdb_id || (typeof rawInput.id === 'number' ? rawInput.id : null);

  // 検索クエリキーの自動検出（手入力フォーム用）
  let queryText = '';
  const priorityKeys = ['id', 'tmdb_id', 'wikidata_id', 'qid', 'title', 'query', 'titles', '作品名', '映画名', 'TMDb ID'];
  for (const key of priorityKeys) {
    if (rawInput[key] !== undefined && rawInput[key] !== null && String(rawInput[key]).trim() !== '') {
      queryText = String(rawInput[key]).trim();
      break;
    }
  }

  // 国・年・メディア種別の取得
  let targetCountry = rawInput.country || rawInput.target_country || rawInput.original_language || null;
  if (targetCountry && typeof targetCountry === 'string' && targetCountry.includes(':')) {
    targetCountry = targetCountry.split(':')[0].trim();
  }
  if (targetCountry === 'OTHER') targetCountry = null;

  const targetYear = rawInput.year || (rawInput.release_date ? rawInput.release_date.split('-')[0] : null);
  const targetLang = rawInput.target_lang || 'ja';

  // メディア種別（映画 / ドラマ）の自動判別
  let mediaType = null;
  const rawMedia = String(rawInput.media_type || rawInput.type || '').toLowerCase();
  if (rawMedia.includes('tv') || rawMedia.includes('ドラマ') || rawMedia.includes('series')) {
    mediaType = 'tv';
  } else if (rawMedia.includes('movie') || rawMedia.includes('映画')) {
    mediaType = 'movie';
  }

  // ID判定（QID / IMDb ID / TMDb ID）
  let wikidataId = rawInput.wikidata_id || null;
  let tmdbId = explicitTmdbId;
  let imdbId = rawInput.imdb_id || null;
  let title = explicitTitle;

  if (/^Q\d+$/i.test(queryText)) {
    wikidataId = queryText.toUpperCase();
  } else if (/^tt\d+$/i.test(queryText)) {
    imdbId = queryText.toLowerCase();
  } else if (/^\d+$/.test(queryText) && !tmdbId) {
    tmdbId = parseInt(queryText, 10);
  } else if (!title) {
    title = queryText;
  }

  return {
    json: {
      query: queryText || title || String(tmdbId || ''),
      title: title || (tmdbId ? String(tmdbId) : (wikidataId || '')),
      origin_title: explicitOriginTitle,
      year: targetYear,
      target_country: targetCountry,
      country: targetCountry,
      media_type: mediaType || 'movie',
      target_lang: targetLang,
      tmdb_id: tmdbId,
      wikidata_id: wikidataId,
      qid: wikidataId,
      imdb_id: imdbId,
      poster_path: rawInput.poster_path || null
    }
  };
});
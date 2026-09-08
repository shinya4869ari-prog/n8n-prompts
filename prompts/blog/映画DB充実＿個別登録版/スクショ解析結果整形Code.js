/**
 * 【スクショ解析結果整形コード（完全自動判定版）】
 * フォームで「自動判定（OTHER / all）」が選ばれている場合、
 * Geminiが画像から自動判定した「国コード（JP, KR, US等）」と「メディア種別（movie, tv）」を
 * 100%信頼して正式採用し、後続のTMDb検索へ引き渡します。
 */

const item = $input.first()?.json || {};
let parsed = {};

let rawText = item.text || item.output || item.content?.parts?.[0]?.text || '';
if (typeof item === 'string') rawText = item;

// ```json ... ``` の除去
rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

try {
  parsed = JSON.parse(rawText);
} catch (e) {
  const mTitle = rawText.match(/"title":\s*"([^"]+)"/);
  const mYear = rawText.match(/"year":\s*"*(\d{4})"*?/);
  const mCountry = rawText.match(/"country":\s*"([^"]+)"/);
  const mMedia = rawText.match(/"media_type":\s*"([^"]+)"/);
  parsed = {
    title: mTitle ? mTitle[1] : '',
    year: mYear ? mYear[1] : null,
    country: mCountry ? mCountry[1] : null,
    media_type: mMedia ? mMedia[1] : null
  };
}

let formInput = {};
try {
  formInput = $('On form submission').first()?.json || {};
} catch(e) {}

// 🎯【国コードの自動判定】
// フォームで手動指定（KR, US, JP）されていればそれを優先。
// 「OTHER : その他・自動判定」または未指定なら、Geminiの自動判定（parsed.country）を100%採用！
let finalCountry = null;
const formCountry = formInput.country ? String(formInput.country).split(':')[0].trim() : '';
if (formCountry && formCountry !== 'OTHER' && formCountry !== 'all') {
  finalCountry = formCountry;
} else if (parsed.country) {
  finalCountry = String(parsed.country).toUpperCase().trim();
}

// 🎯【メディア種別の自動判定】
// フォームで手動指定（movie / tv）されていればそれを優先。
// 「all : 自動判定」または未指定なら、Geminiの自動判定（parsed.media_type）を100%採用！
let finalMediaType = 'movie';
const formMedia = String(formInput.media_type || '');
if (formMedia.includes('tv') || formMedia.includes('ドラマ')) {
  finalMediaType = 'tv';
} else if (formMedia.includes('movie') || formMedia.includes('映画')) {
  finalMediaType = 'movie';
} else if (parsed.media_type) {
  finalMediaType = String(parsed.media_type).toLowerCase().includes('tv') ? 'tv' : 'movie';
}

// 手動入力のIDがある場合のみ採用（AIの嘘IDは除外）
const manualTmdbId = formInput.id && /^\d+$/.test(formInput.id) ? parseInt(formInput.id, 10) : null;
const manualQid = formInput.id && /^Q\d+$/i.test(formInput.id) ? formInput.id.toUpperCase() : null;

// タイトルと年
const finalTitle = parsed.title || formInput.title || '';
const finalYear = parsed.year ? String(parsed.year).substring(0, 4) : (formInput.year ? String(formInput.year).substring(0, 4) : null);

// 原題（日本映画の場合は日本語タイトルを原題としても扱う）
let originTitle = parsed.origin_title || null;
if (finalCountry === 'JP' && (!originTitle || originTitle.toLowerCase() === 'parade')) {
  originTitle = finalTitle;
}

return [{
  json: {
    // フォーム入力で上書きされないよう、自動判定された確定値を明示
    title: finalTitle,
    origin_title: originTitle,
    year: finalYear,
    director: parsed.director || null,
    cast: parsed.cast || null,
    country: finalCountry,
    target_country: finalCountry,
    media_type: finalMediaType,
    query: manualTmdbId ? String(manualTmdbId) : (manualQid || finalTitle),
    id: manualTmdbId || manualQid || null,
    tmdb_id: manualTmdbId,
    wikidata_id: manualQid,
    is_screenshot: true,
    formMode: formInput.formMode || 'test'
  }
}];

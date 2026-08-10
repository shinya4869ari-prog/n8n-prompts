/**
 * 【AI (Gemini) 映画データ整合性検証＆空欄補完・マージコード】
 * 
 * Geminiからの検証＆補完結果JSONを受け取り、元データと安全にマージします。
 * ハルシネーション（嘘の補完）を防ぐため、元データを最優先しつつ空欄のみを正確に補完します。
 */

const items = $input.all();

return items.map((item, index) => {
  let source = {};
  try {
    source = $('入力JSON分割').all()[index]?.json 
          || $('Form Trigger').all()[index]?.json 
          || item.json;
  } catch(e) {
    source = item.json;
  }

  let aiData = {};
  try {
    let rawText = "";
    const j = item.json || {};
    
    if (typeof j === 'string') {
      rawText = j;
    } else if (j.text) {
      rawText = j.text;
    } else if (j.content?.parts && Array.isArray(j.content.parts)) {
      rawText = j.content.parts.map(p => p.text || '').join('\n');
    } else if (j.candidates?.[0]?.content?.parts) {
      rawText = j.candidates[0].content.parts.map(p => p.text || '').join('\n');
    } else if (j.message?.content) {
      rawText = typeof j.message.content === 'string' ? j.message.content : JSON.stringify(j.message.content);
    } else {
      rawText = JSON.stringify(j);
    }

    const cleanJson = String(rawText)
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    aiData = JSON.parse(cleanJson);
  } catch(e) {
    aiData = item.json || {};
  }

  // ID / メディアURLの安全判定
  const isCorrected = aiData.audit_status && String(aiData.audit_status).includes('CORRECTED');

  // 本当に異なる映画の誤データとAIが検証・判定した場合はクリアし、それ以外はAI/元の入力データの正常な値を採択
  const tmdb_id = (isCorrected && aiData.tmdb_id === null) ? null : (aiData.tmdb_id || source.tmdb_id || null);
  const poster_url = (isCorrected && (aiData.poster_url === "" || aiData.poster_url === null)) ? "" : (aiData.poster_url || source.poster_url || "");
  const trailer_url = (isCorrected && (aiData.trailer_url === "" || aiData.trailer_url === null)) ? "" : (aiData.trailer_url || source.trailer_url || "");

  // ハングル判定関数
  const isHangul = (str) => /[\uac00-\ud7af]/.test(str || '');
  // 日本語判定関数
  const isJapanese = (str) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(str || '');

  const isKorea = (source.country === 'KR' || aiData.country === 'KR');

  // title: AIが公式邦題/日本語タイトルを返した場合はそちらを最優先採択
  const title = (aiData.title && isJapanese(aiData.title)) ? aiData.title : (source.title || aiData.title || null);
  // origin_title: 韓国映画の場合はハングル原題を優先採択
  const origin_title = (isKorea && aiData.origin_title && isHangul(aiData.origin_title)) ? aiData.origin_title : (source.origin_title || aiData.origin_title || (!isJapanese(source.title) ? source.title : null));

  // director: AIが日本語カタカナを返した場合はそちらを優先採択
  const director = (aiData.director && isJapanese(aiData.director)) ? aiData.director : (source.director || aiData.director || null);
  const director_en = (isKorea && aiData.director_en && isHangul(aiData.director_en)) ? aiData.director_en : ((aiData.director_en && !isJapanese(aiData.director_en)) ? aiData.director_en : (source.director_en || null));

  // cast: AIが日本語カタカナを返した場合はそちらを優先採択
  const cast = (aiData.cast && isJapanese(aiData.cast)) ? aiData.cast : (source.cast || aiData.cast || null);
  const cast_en = (isKorea && aiData.cast_en && isHangul(aiData.cast_en)) ? aiData.cast_en : ((aiData.cast_en && !isJapanese(aiData.cast_en)) ? aiData.cast_en : (source.cast_en || null));

  // overview: AIが詳細化・補完した場合はAIの出力を優先採択
  const overview = (aiData.overview && (aiData.overview.length >= (source.overview || '').length)) ? aiData.overview : (source.overview || aiData.overview || null);

  // overview_en: 韓国映画の場合はハングルを優先、通常はAIが詳細化・補完した出力を優先採択
  const overview_en = (isKorea && aiData.overview_en && isHangul(aiData.overview_en)) 
    ? aiData.overview_en 
    : ((aiData.overview_en && (aiData.overview_en.length >= (source.overview_en || '').length)) ? aiData.overview_en : (source.overview_en || aiData.overview_en || null));

  // ノイズ除去用関数 (例: "イ-・イダム" ➔ "イ・イダム" へ自動クレンジング)
  const cleanKatakanaHyphens = (str) => {
    if (!str) return str;
    return String(str).replace(/([アカ-ンa-zA-Z])-・/g, '$1・').replace(/-・/g, '・');
  };

  // 1. レコード構築
  const updatedRecord = {
    idx: source.idx ?? null,
    created_at: source.created_at || null,
    country: aiData.country || source.country || null,
    year: source.year || aiData.year || null,
    is_recommended: source.is_recommended ?? true,
    genres: source.genres || aiData.genres || null,

    title: cleanKatakanaHyphens(title),
    origin_title: origin_title,

    director: cleanKatakanaHyphens(director),
    director_en: director_en,

    cast: cleanKatakanaHyphens(cast),
    cast_en: cast_en,

    overview: overview,
    overview_en: overview_en,

    poster_url: poster_url,
    trailer_url: trailer_url,

    tmdb_id: tmdb_id,
    wikidata_id: (() => {
      const rawId = source.wikidata_id || aiData.wikidata_id || null;
      return (rawId && /^Q\d+$/.test(rawId)) ? rawId : null;
    })(),

    audit_status: aiData.audit_status || "OK"
  };

  // 2. 変更履歴 (changes_summary) の自動解析
  const changes = [];
  if ((!source.title || source.title !== updatedRecord.title) && updatedRecord.title) changes.push("補完: title");
  if ((!source.origin_title || source.origin_title !== updatedRecord.origin_title) && updatedRecord.origin_title) changes.push("補完: origin_title");
  if ((!source.director || source.director !== updatedRecord.director) && updatedRecord.director) changes.push("補完: director");
  if ((!source.director_en || source.director_en !== updatedRecord.director_en) && updatedRecord.director_en) changes.push("補完: director_en");
  if ((!source.cast || source.cast !== updatedRecord.cast) && updatedRecord.cast) changes.push("補完: cast");
  if ((!source.cast_en || source.cast_en !== updatedRecord.cast_en) && updatedRecord.cast_en) changes.push("補完: cast_en");
  if ((!source.overview || source.overview !== updatedRecord.overview) && updatedRecord.overview) changes.push("補完: overview");
  if ((!source.overview_en || source.overview_en !== updatedRecord.overview_en) && updatedRecord.overview_en) changes.push("補完: overview_en");
  if ((!source.genres || source.genres !== updatedRecord.genres) && updatedRecord.genres) changes.push("補完: genres");
  if ((!source.wikidata_id || source.wikidata_id !== updatedRecord.wikidata_id) && updatedRecord.wikidata_id) changes.push("補完: wikidata_id");
  if ((!source.tmdb_id || source.tmdb_id !== updatedRecord.tmdb_id) && updatedRecord.tmdb_id) changes.push("補完: tmdb_id");

  if (source.tmdb_id && updatedRecord.tmdb_id === null) changes.push("誤データ削除: tmdb_id");
  if (source.poster_url && updatedRecord.poster_url === "") changes.push("誤データ削除: poster_url");
  if (source.trailer_url && updatedRecord.trailer_url === "") changes.push("誤データ削除: trailer_url");

  if (!source.poster_url && !updatedRecord.poster_url) changes.push("元から空欄: poster_url");
  if (!source.trailer_url && !updatedRecord.trailer_url) changes.push("元から空欄: trailer_url");

  updatedRecord.changes_summary = changes.length > 0 ? changes.join(" | ") : "変更なし (完全一致)";

  return {
    json: updatedRecord
  };
});

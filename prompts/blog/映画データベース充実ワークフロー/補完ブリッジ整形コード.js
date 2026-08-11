/**
 * 補完ブリッジ整形コード（安全・完全取得版）
 * 役割: 映画DB充実ワークフローの各ノード（TMDb/Brave/Geminiあらすじ等）のデータを安全に一括集約し、
 *       映画データ補完ワークフロー（Gemini）への入力JSONに変換する
 */
function getNode(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

// 映画データ整形コードの取得
const shaped = (() => {
  const d = getNode('映画データ整形コード_claude');
  if (d.title || d.origin_title) return d;
  return getNode('映画データ整形コード');
})();

// キャスト・監督翻訳AIの取得
const castTrans = (() => {
  const c = getNode('キャスト・監督翻訳AI1');
  if (c.text || c.content || c.message) return c;
  return getNode('キャスト・監督翻訳AI');
})();

const parsedCast = (() => {
  try {
    const raw = castTrans.text || (Array.isArray(castTrans.content) ? castTrans.content[0]?.text : castTrans.content) || '';
    return JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch(e) { return {}; }
})();

// あらすじの取得（gemini_movie_db ➔ 整形コード の優先順で自動選択）
const aiOverview = (() => {
  try {
    const g = getNode('gemini_movie_db');
    let raw = g.text || g.output || '';
    if (!raw && g.candidates?.[0]?.content?.parts) {
      raw = g.candidates[0].content.parts.map(p => p.text || '').join('');
    }
    if (!raw && g.content?.parts) {
      raw = g.content.parts.map(p => p.text || '').join('');
    }
    if (raw && !raw.includes('申し訳') && !raw.includes('情報が') && raw.trim().length > 20) {
      return raw.trim();
    }
  } catch(e) {}
  return shaped.overview || '';
})();

// Brave 検索結果の取得
const braveResult = (() => {
  try {
    const bList = [getNode('Brave Search web'), getNode('Brave Search_movie'), getNode('Brave Search')];
    for (const b of bList) {
      const res = b.web?.results || b.results;
      if (Array.isArray(res) && res.length > 0) {
        return res.slice(0, 5).map(r => r.movie?.description || r.description || '').filter(Boolean).join('\n');
      }
    }
  } catch(e) {}
  return '';
})();

return [{
  json: {
    idx: shaped.idx || null,
    tmdb_id: shaped.tmdb_id || null,
    wikidata_id: shaped.wikidata_id || null,

    title: parsedCast.title || shaped.title || shaped.origin_title || '',
    origin_title: shaped.origin_title || '',
    year: shaped.year || null,
    country: shaped.country || '',
    genres: shaped.genres || '',

    director: parsedCast.director || shaped.director || '',
    director_en: shaped.director_en || '',
    cast: parsedCast.cast || shaped.cast || '',
    cast_en: shaped.cast_en || '',

    overview: aiOverview || shaped.overview || '',
    overview_en: shaped.overview_en || '',

    poster_url: shaped.poster_url || '',
    trailer_url: shaped.trailer_url || '',
    brave_search_result: braveResult,

    audit_status: 'PENDING_AUDIT'
  }
}];

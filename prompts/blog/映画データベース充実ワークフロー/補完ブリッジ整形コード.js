/**
 * 補完ブリッジ整形コード
 * 役割: 映画DB充実ワークフローのSupabase保存後のデータを
 *       映画データ補完ワークフロー（Gemini）への入力形式に整形する
 * 
 * 接続: Supabaseへ保存 → [このコード] → Gemini補完ノード(PromptLoader) → 補完結果整形コード → Supabase UPDATE
 */

// 充実ワークフロー内の各ノードからデータを収集
function getNodeData(nodeName) {
  try {
    return $(nodeName).first()?.json || $(nodeName).item?.json || {};
  } catch (e) {
    return {};
  }
}

const shaped = getNodeData('映画データ整形コード_claude');
const aiOverview = (() => {
  try {
    // Gemini あらすじノードの出力を取得
    const g = getNodeData('gemini_movie_db');
    const raw = g?.text || g?.output
      || (Array.isArray(g?.candidates)
        ? g.candidates[0]?.content?.parts?.map(p => p.text).join('') : '')
      || '';
    if (raw && !raw.includes('申し訳') && !raw.includes('情報が') && raw.trim().length > 30) {
      return raw.trim();
    }
  } catch(e) {}
  return '';
})();

const castTranslation = (() => {
  try {
    const c = getNodeData('キャスト・監督翻訳AI');
    const raw = c?.text || (Array.isArray(c?.content) ? c.content[0]?.text : c?.content) || '';
    return JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim());
  } catch(e) { return {}; }
})();

const brave_search_result = (() => {
  try {
    const b = getNodeData('Brave Search_movie');
    return (b?.web?.results || []).slice(0, 5).map(r => r.movie?.description || r.description || '').filter(Boolean).join('\n');
  } catch(e) { return ''; }
})();

// 補完 Gemini への入力データを構築（既存データ + 初回 AI 生成データを統合）
return [{
  json: {
    // ID 系
    idx: shaped.idx || null,
    tmdb_id: shaped.tmdb_id || null,
    wikidata_id: shaped.wikidata_id || null,

    // 基本情報
    title: castTranslation.title || shaped.title || '',
    origin_title: shaped.origin_title || '',
    year: shaped.year || null,
    country: shaped.country || '',
    genres: shaped.genres || '',

    // 監督・キャスト (日本語/英語)
    director: castTranslation.director || shaped.director || '',
    director_en: shaped.director_en || '',
    cast: castTranslation.cast || shaped.cast || '',
    cast_en: shaped.cast_en || '',

    // あらすじ (充実ワークフローで生成した日本語あらすじを overview として引き渡す)
    overview: aiOverview || shaped.overview || '',
    overview_en: shaped.overview_en || '',

    // メディア URL
    poster_url: shaped.poster_url || '',
    trailer_url: shaped.trailer_url || '',

    // Brave 検索結果（補完 Gemini のコンテキストとして利用）
    brave_search_result: brave_search_result,

    // 補完前ステータス
    audit_status: 'PENDING_AUDIT'
  }
}];

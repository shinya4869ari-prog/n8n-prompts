/**
 * 補完ブリッジ整形コード（安全・完全取得版）
 * 役割: 映画DB充実ワークフローの各ノード（TMDb/Brave/Geminiあらすじ/キャスト翻訳AI等）のデータを安全に一括集約し、
 *       映画データ補完ワークフロー（Gemini）への入力JSONに変換する
 */
function getNode(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

// 映画データ整形コードの取得
const shaped = (() => {
  return getNode('映画データ整形コード');
})();

// キャスト・監督翻訳AIの取得（ノード名: キャスト・監督翻訳AI）
const castTrans = (() => {
  return getNode('キャスト・監督翻訳AI');
})();

const parsedCast = (() => {
  try {
    let raw = castTrans.text || castTrans.output || '';
    if (!raw && castTrans.content?.parts && Array.isArray(castTrans.content.parts)) {
      raw = castTrans.content.parts.map(p => p.text || '').join('');
    } else if (!raw && castTrans.content?.parts?.[0]?.text) {
      raw = castTrans.content.parts[0].text;
    } else if (!raw && Array.isArray(castTrans.content)) {
      raw = castTrans.content[0]?.text || '';
    } else if (!raw && typeof castTrans.content === 'string') {
      raw = castTrans.content;
    } else if (!raw && castTrans.message?.content) {
      raw = typeof castTrans.message.content === 'string' ? castTrans.message.content : JSON.stringify(castTrans.message.content);
    }
    if (!raw) return {};

    const clean = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
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

// Brave Search_trailer からの予告編 URL 抽出（日本国内で再生可能な公式予告編を優先取得）
const trailerUrl = (() => {
  try {
    const b = getNode('Brave Search_trailer');
    const videos = b?.results || b?.videos?.results || (Array.isArray(b) ? b : []);
    if (Array.isArray(videos) && videos.length > 0) {
      const kwList = [
        shaped.title, shaped.origin_title, shaped.director,
        '予告', '予告編', 'PV', '公式', '日本'
      ].filter(Boolean).map(s => String(s).toLowerCase());

      // 1. タイトル＋「予告」または「公式」が含まれる YouTube 動画（日本国内再生可能な公式予告編）を最優先
      const matchedVid = videos.find(v => {
        const url = v.url || v.profile?.url || '';
        if (!url.includes('youtube.com')) return false;
        const text = ((v.title || '') + ' ' + (v.description || '')).toLowerCase();
        return (text.includes('予告') || text.includes('公式')) && kwList.some(kw => kw.length >= 2 && text.includes(kw));
      });
      if (matchedVid) return matchedVid.url || matchedVid.profile?.url;

      // 2. 予告編キーワード(trailer/予告)を含む YouTube 動画
      const trailerVid = videos.find(v => {
        const url = v.url || v.profile?.url || '';
        const text = ((v.title || '') + ' ' + (v.description || '')).toLowerCase();
        return url.includes('youtube.com') && (text.includes('trailer') || text.includes('予告'));
      });
      if (trailerVid) return trailerVid.url || trailerVid.profile?.url;
    }
  } catch(e) {}
  
  if (shaped.trailer_url && shaped.trailer_url.includes('youtube.com')) return shaped.trailer_url;
  return null;
})();

// Brave 検索結果の取得（Webテキスト）
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

// 日本語判定
const isJapanese = (str) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(str || '');

// AIが翻訳した日本語カタカナキャストを最優先。もしAIに不備があればshapedのデータを使用
const finalCast = (parsedCast.cast && isJapanese(parsedCast.cast)) 
  ? parsedCast.cast 
  : (isJapanese(shaped.cast) ? shaped.cast : (parsedCast.cast || shaped.cast || ''));

const finalCastEn = parsedCast.cast_en || shaped.cast_en || '';
const finalDirector = (parsedCast.director && isJapanese(parsedCast.director)) ? parsedCast.director : (shaped.director || parsedCast.director || '');
const finalDirectorEn = parsedCast.director_en || shaped.director_en || '';

return [{
  json: {
    idx: shaped.idx || null,
    tmdb_id: shaped.tmdb_id || null,
    wikidata_id: shaped.wikidata_id || null,

    title: parsedCast.title || shaped.title || shaped.origin_title || '',
    origin_title: shaped.origin_title || shaped.title || '',
    year: shaped.year || '',
    country: shaped.country || 'KR',
    genres: shaped.genres || '',

    director: finalDirector,
    director_en: finalDirectorEn,
    cast: finalCast,
    cast_en: finalCastEn,

    overview: aiOverview || shaped.overview || '',
    overview_en: shaped.overview_en || '',

    poster_url: shaped.poster_url || (shaped.poster_path ? (shaped.poster_path.startsWith('http') ? shaped.poster_path : `https://image.tmdb.org/t/p/w500${shaped.poster_path}`) : ''),
    trailer_url: trailerUrl || '',
    brave_search_result: braveResult,

    audit_status: 'PENDING_AUDIT'
  }
}];

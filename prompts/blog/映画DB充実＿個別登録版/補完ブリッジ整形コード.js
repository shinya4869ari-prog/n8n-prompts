/**
 * 補完ブリッジ整形コード（スリム＆高速版）
 * 役割: 各ノード（TMDb/Brave/Geminiあらすじ/キャスト翻訳等）のデータを集約し、後続の補完AIノードへ渡す
 */
function getNode(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

function extractAiText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  if (node.output) return node.output;
  if (Array.isArray(node.content?.parts)) return node.content.parts.map(p => p.text || '').join('\n');
  if (Array.isArray(node.candidates?.[0]?.content?.parts)) return node.candidates[0].content.parts.map(p => p.text || '').join('\n');
  if (node.message?.content) return typeof node.message.content === 'string' ? node.message.content : JSON.stringify(node.message.content);
  return '';
}

// 日本語判定関数
const isJapanese = (str) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(str || '');

// 1. 映画データ整形コードの取得
const shaped = getNode('映画データ整形コード');

// 2. 🎯 キャスト翻訳AIのパース（$input最優先 ➔ キャスト翻訳ノード）
const parsedCast = (() => {
  try {
    const candidates = [$input.first()?.json, $input.item?.json, getNode('キャスト翻訳')];
    for (const c of candidates) {
      if (!c) continue;
      if (c.cast && typeof c.cast === 'string' && isJapanese(c.cast) && !c.idx) return c;
      const raw = extractAiText(c);
      if (raw && (raw.includes('"cast"') || raw.includes('cast') || raw.includes('overview'))) {
        const clean = String(raw).replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = clean.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed && (parsed.cast || parsed.title || parsed.overview)) return parsed;
        }
      }
    }
    return {};
  } catch(e) { return {}; }
})();

// 3. あらすじの取得（キャスト翻訳AIの日本語あらすじ ➔ gemini_movie_db ➔ shaped）
const aiOverview = (() => {
  if (parsedCast.overview && isJapanese(parsedCast.overview) && parsedCast.overview.trim().length > 15) {
    return parsedCast.overview.trim();
  }
  try {
    const raw = extractAiText(getNode('gemini_movie_db'));
    if (raw && !raw.includes('申し訳') && !raw.includes('情報が') && raw.trim().length > 20) {
      return raw.trim();
    }
  } catch(e) {}
  return shaped.overview || '';
})();

// 4. 予告編 URL 抽出（Brave Search ➔ TMDb ➔ YouTube検索リンクへの完全自動フォールバック）
const trailerUrl = (() => {
  try {
    const b = getNode('Brave Search_trailer');
    const videos = b?.results || b?.videos?.results || (Array.isArray(b) ? b : []);
    if (Array.isArray(videos) && videos.length > 0) {
      const kwList = [shaped.title, shaped.origin_title, shaped.director, '予告', '予告編', 'PV', '公式', '日本'].filter(Boolean).map(s => String(s).toLowerCase());
      const matchedVid = videos.find(v => {
        const url = v.url || v.profile?.url || '';
        if (!url.includes('youtube.com')) return false;
        const text = ((v.title || '') + ' ' + (v.description || '')).toLowerCase();
        return (text.includes('予告') || text.includes('公式')) && kwList.some(kw => kw.length >= 2 && text.includes(kw));
      });
      if (matchedVid) return matchedVid.url || matchedVid.profile?.url;

      const trailerVid = videos.find(v => {
        const url = v.url || v.profile?.url || '';
        const text = ((v.title || '') + ' ' + (v.description || '')).toLowerCase();
        return url.includes('youtube.com') && (text.includes('trailer') || text.includes('予告'));
      });
      if (trailerVid) return trailerVid.url || trailerVid.profile?.url;
    }
  } catch(e) {}

  if (shaped.trailer_url && shaped.trailer_url.includes('watch?v=')) {
    return shaped.trailer_url;
  }

  // 予告編動画が見つからない場合は、YouTube検索リンクを自動セット
  const searchTitle = parsedCast.title || shaped.title || shaped.origin_title || '';
  if (searchTitle) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTitle + ' 予告編')}`;
  }
  return '';
})();

// 5. Brave 検索結果の取得
const braveResult = (() => {
  try {
    const b = getNode('Brave Search_movie') || getNode('Brave Search web');
    const res = b.web?.results || b.results;
    if (Array.isArray(res) && res.length > 0) {
      return res.slice(0, 5).map(r => r.movie?.description || r.description || '').filter(Boolean).join('\n');
    }
  } catch(e) {}
  return '';
})();

// キャスト・監督のマージ
const finalCast = (parsedCast.cast && isJapanese(parsedCast.cast)) 
  ? parsedCast.cast 
  : (isJapanese(shaped.cast) ? shaped.cast : (parsedCast.cast || shaped.cast || ''));

const finalCastEn = parsedCast.cast_en || shaped.cast_en || '';
const finalDirector = (parsedCast.director && isJapanese(parsedCast.director)) ? parsedCast.director : (shaped.director || parsedCast.director || '');
const finalDirectorEn = parsedCast.director_en || shaped.director_en || '';

return [{
  json: {
    idx: shaped.idx || null,
    created_at: shaped.created_at || null,
    country: shaped.country || '',
    year: shaped.year || '',
    genres: shaped.genres || '',
    platform: shaped.platform || '劇場公開',

    wikidata_id: shaped.wikidata_id || null,
    tmdb_id: shaped.tmdb_id || null,

    title: parsedCast.title || shaped.title || shaped.origin_title || '',
    origin_title: shaped.origin_title || shaped.title || '',

    director: finalDirector,
    director_en: finalDirectorEn,
    cast: finalCast,
    cast_en: finalCastEn,

    overview: aiOverview || shaped.overview || '',
    overview_en: shaped.overview_en || '',

    poster_url: shaped.poster_url || (shaped.poster_path ? (shaped.poster_path.startsWith('http') ? shaped.poster_path : `https://image.tmdb.org/t/p/w500${shaped.poster_path}`) : ''),
    trailer_url: trailerUrl || '',
    imdb_id: shaped.imdb_id || null,
    imdb_url: shaped.imdb_url || (shaped.imdb_id ? `https://www.imdb.com/title/${shaped.imdb_id}/` : null),

    brave_search_result: braveResult,
    audit_status: 'PENDING_AUDIT'
  }
}];

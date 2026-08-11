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

  const targetAi = Array.isArray(aiData) ? (aiData[index] || aiData[0] || {}) : aiData;
  const isCorrected = targetAi.audit_status && String(targetAi.audit_status).includes('CORRECTED');

  const tmdb_id = (isCorrected && targetAi.tmdb_id === null) ? null : (targetAi.tmdb_id || source.tmdb_id || null);
  const poster_url = (isCorrected && (targetAi.poster_url === "" || targetAi.poster_url === null)) ? "" : (targetAi.poster_url || source.poster_url || "");
  const trailer_url = (isCorrected && (targetAi.trailer_url === "" || targetAi.trailer_url === null)) ? "" : (targetAi.trailer_url || source.trailer_url || "");

  const isHangul = (str) => /[\uac00-\ud7af]/.test(str || '');
  const isJapanese = (str) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(str || '');
  const isKorea = (source.country === 'KR' || targetAi.country === 'KR');

  const title = (targetAi.title && isJapanese(targetAi.title)) ? targetAi.title : (source.title || targetAi.title || null);
  const origin_title = (isKorea && targetAi.origin_title && isHangul(targetAi.origin_title)) ? targetAi.origin_title : (source.origin_title || targetAi.origin_title || (!isJapanese(source.title) ? source.title : null));

  const director = (targetAi.director && isJapanese(targetAi.director)) ? targetAi.director : (source.director || targetAi.director || null);
  const director_en = (isKorea && targetAi.director_en && isHangul(targetAi.director_en)) ? targetAi.director_en : ((targetAi.director_en && !isJapanese(targetAi.director_en)) ? targetAi.director_en : (source.director_en || null));

  const cast = (targetAi.cast && isJapanese(targetAi.cast)) ? targetAi.cast : (source.cast || targetAi.cast || null);
  const cast_en = (isKorea && targetAi.cast_en && isHangul(targetAi.cast_en)) ? targetAi.cast_en : ((targetAi.cast_en && !isJapanese(targetAi.cast_en)) ? targetAi.cast_en : (source.cast_en || null));

  const overview = (targetAi.overview && (targetAi.overview.length >= (source.overview || '').length)) ? targetAi.overview : (source.overview || targetAi.overview || null);
  const overview_en = (isKorea && targetAi.overview_en && isHangul(targetAi.overview_en)) 
    ? targetAi.overview_en 
    : ((targetAi.overview_en && (targetAi.overview_en.length >= (source.overview_en || '').length)) ? targetAi.overview_en : (source.overview_en || targetAi.overview_en || null));

  const cleanKatakanaHyphens = (str) => {
    if (!str) return str;
    return String(str).replace(/([アカ-ンa-zA-Z])-・/g, '$1・').replace(/-・/g, '・');
  };

  const cleanGenres = (raw) => {
    if (!raw) return null;
    let str = String(raw);
    try {
      if (str.startsWith('[')) {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) str = parsed.join(', ');
      }
    } catch(e) {}

    const genreMap = {
      'Historical': '時代劇', 'Drama': 'ドラマ', 'Thriller': 'スリラー',
      'Dark Comedy': 'ブラックコメディ', 'Comedy': 'コメディ', 'Action': 'アクション',
      'Horror': 'ホラー', 'Mystery': 'ミステリー', 'Romance': 'ロマンス',
      'Documentary': 'ドキュメンタリー', 'Animation': 'アニメ', 'Sci-Fi': 'SF',
      'Crime': '犯罪', 'Adventure': 'アドベンチャー', 'Fantasy': 'ファンタジー',
      'Family': 'ファミリー', 'Music': '音楽', 'War': '戦争', 'Western': '西部劇'
    };

    Object.keys(genreMap).forEach(eng => {
      const reg = new RegExp('\\b' + eng + '\\b', 'gi');
      str = str.replace(reg, genreMap[eng]);
    });

    return str.replace(/[\[\]"']/g, '').trim();
  };

  const rawGenre = targetAi.genres || source.genres || null;

  // 1. 純粋な映画メタデータレコードのみを構築（is_recommended や update_reason などの不要項目を完全除外）
  return {
    json: {
      title: cleanKatakanaHyphens(title),
      origin_title: origin_title,

      year: source.year || targetAi.year || null,
      country: targetAi.country || source.country || null,
      genres: cleanGenres(rawGenre),

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
        const rawId = source.wikidata_id || targetAi.wikidata_id || null;
        return (rawId && /^Q\d+$/.test(rawId)) ? rawId : null;
      })()
    }
  };
});

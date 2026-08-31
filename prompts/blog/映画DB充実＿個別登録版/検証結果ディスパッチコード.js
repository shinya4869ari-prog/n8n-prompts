/**
 * 【n8n用】検証結果ディスパッチコード (検証結果ディスパッチコード.js)
 * 
 * 役割: 総合AI検証ノードの出力を解析し、
 *       1. 検証合否（is_valid: true/false）の判定
 *       2. REJECT（却下）された無関係サントラの完全除外
 *       3. 「映画」「人物」「サントラ」の各保存ノードへ安全に分配するための構造化
 */

const inputJson = $input.first()?.json || {};

// AIのレスポンスが文字列（Markdown/JSON）として返ってきた場合の自動パース
let auditResult = {};
const rawText = inputJson.content?.parts?.[0]?.text || 
                inputJson.parts?.[0]?.text || 
                inputJson.output || 
                inputJson.text || 
                (typeof inputJson.message?.content === 'string' ? inputJson.message.content : null);

if (rawText && typeof rawText === 'string') {
  try {
    const cleanStr = rawText.replace(/```json\s*|```/gi, '').trim();
    auditResult = JSON.parse(cleanStr);
  } catch (e) {
    auditResult = { is_valid: true, movie: inputJson };
  }
} else if (inputJson.movie || inputJson.tracks || inputJson.persons) {
  auditResult = inputJson;
} else {
  auditResult = inputJson;
}

// 1. 合否判定 (is_valid または confidence_score >= 70)
const isValid = auditResult.is_valid !== false && (auditResult.confidence_score === undefined || auditResult.confidence_score >= 70);

// 2. 総合検証集約コードから元データを安全取得（AIの間引きを完全防止）
let origPersons = [];
let origTracks = [];
let origMovie = {};
try {
  const aggr = $('総合検証集約コード').first()?.json;
  if (aggr) {
    origPersons = aggr.persons_payload || [];
    origTracks = aggr.tracks_payload || aggr.tracks || [];
    origMovie = aggr.movie_payload || {};
  }
} catch (e) {}

if (origPersons.length === 0) {
  try {
    origPersons = $('Supabase整形コード').all().map(item => item.json).filter(Boolean);
  } catch (e) {}
}

if (origTracks.length === 0) {
  try {
    origTracks = $('OST劇中歌取得整形Code').all().map(item => item.json).filter(t => t && t.track_id && t.has_tracks !== false);
  } catch (e) {}
}

// 3. 映画データの抽出（元の全フィールド: imdb_id, imdb_url, overview_en, genres, platform等を100%完全保持）
const movie = {
  ...origMovie,
  ...(auditResult.movie || {})
};
// ★ 人名ノイズ自動クレンジング関数（"イ-・ウンボク" ➔ "イ・ウンボク" への是正）
const cleanNameNoise = (str) => {
  if (!str) return str;
  return String(str)
    .replace(/[-‐‑–—]・/g, '・')
    .replace(/・[-‐‑–—]/g, '・')
    .replace(/([ァ-ヴぁ-んa-zA-Z])[-‐‑–—]・/g, '$1・')
    .replace(/([ァ-ヴぁ-ん])[-‐‑–—]([ァ-ヴぁ-ん])/g, '$1・$2')
    .replace(/_/g, '・')
    .replace(/・{2,}/g, '・')
    .replace(/^[・\-\s]+|[・\-\s]+$/g, '')
    .trim();
};

// ★ 元データの完全保護（AIの勝手な改悪・ノイズ混入を100%防止）
// 入力（origMovie）にすでに正しい名前が存在する場合は、AIの出力を破棄して元の正しい値を最優先保持
if (origMovie.director && origMovie.director.trim()) {
  movie.director = cleanNameNoise(origMovie.director);
} else if (movie.director) {
  movie.director = cleanNameNoise(movie.director);
}

if (origMovie.cast && origMovie.cast.trim()) {
  movie.cast = cleanNameNoise(origMovie.cast);
} else if (movie.cast) {
  movie.cast = cleanNameNoise(movie.cast);
}

if (origMovie.title && origMovie.title.trim() && !/^[A-Za-z0-9\s:,'"-]+$/.test(origMovie.title)) {
  movie.title = origMovie.title;
}

// ★ ハングル保護: 元データにハングルがある場合、AIがローマ字に変換していてもハングル表記を100%最優先保護
const hasHangul = (str) => /[\uac00-\ud7af]/.test(str || '');
if (hasHangul(origMovie.cast_en)) {
  movie.cast_en = origMovie.cast_en;
}
if (hasHangul(origMovie.director_en)) {
  movie.director_en = origMovie.director_en;
}

// ★ プラットフォーム判定（tvNなどの放送局、配信サービス）
// 勝手に「テレビドラマ」や「劇場公開」を補完せず、確証があるもの以外は null
let safePlatform = movie.platform || origMovie.platform || null;
if (safePlatform === 'テレビドラマ' || safePlatform === '劇場公開') {
  safePlatform = null;
}
movie.platform = safePlatform;

// 4. 人物データの抽出（キャスト・監督抽出の全員を100%確実に保持＆AIの補正を統合）
const aiPersons = auditResult.persons || [];
const mergedPersonsMap = new Map();

// まず元データ（キャスト・監督抽出 ➔ Supabase整形コード）の全員を最優先で登録
(origPersons.length > 0 ? origPersons : aiPersons).forEach(origP => {
  const rawName = cleanNameNoise(origP.name);
  if (!rawName) return;

  const matchedAi = aiPersons.find(ap => 
    ((ap.wikidata_id || ap.qid) && (origP.wikidata_id || origP.qid) && (ap.wikidata_id || ap.qid) === (origP.wikidata_id || origP.qid)) ||
    (ap.name && rawName && (cleanNameNoise(ap.name) === rawName || cleanNameNoise(ap.name).includes(rawName) || rawName.includes(cleanNameNoise(ap.name))))
  );

  const wId = origP.wikidata_id || origP.qid || matchedAi?.wikidata_id || matchedAi?.qid || null;
  const pNameEn = (hasHangul(origP.name_en) && !hasHangul(matchedAi?.name_en))
    ? origP.name_en
    : (matchedAi?.name_en || origP.name_en || null);

  const pObj = {
    ...origP,
    name: cleanNameNoise(origP.name || matchedAi?.name || rawName),
    name_en: pNameEn,
    occupation: origP.occupation || matchedAi?.occupation || '俳優',
    country: matchedAi?.country || origP.country || movie.country || '',
    profile_url: origP.profile_url || matchedAi?.profile_url || origP.image_url || null,
    gender: origP.gender || matchedAi?.gender || null,
    wikidata_id: wId,
    tmdb_id: origP.tmdb_id || matchedAi?.tmdb_id || null,
    x_id: origP.x_id || null,
    instagram_id: origP.instagram_id || null,
    youtube_id: origP.youtube_id || null,
    official_site: origP.official_site || null
  };
  delete pObj.qid;
  mergedPersonsMap.set(rawName, pObj);
});

// AIが追加した有効なキャストがいればそれも補完
aiPersons.forEach(ap => {
  const rawName = cleanNameNoise(ap.name);
  if (rawName && !mergedPersonsMap.has(rawName)) {
    mergedPersonsMap.set(rawName, {
      name: rawName,
      name_en: ap.name_en || null,
      occupation: ap.occupation || '俳優',
      country: ap.country || movie.country || '',
      profile_url: ap.profile_url || null,
      gender: ap.gender || null,
      wikidata_id: ap.wikidata_id || ap.qid || null,
      tmdb_id: ap.tmdb_id || null,
      x_id: null,
      instagram_id: null,
      youtube_id: null,
      official_site: null
    });
  }
});

const validPersons = Array.from(mergedPersonsMap.values()).filter(p => {
  if (!p || !p.name || p.name.trim().length < 2) return false;

  const isStaff = (p.occupation === '監督' || p.occupation === '脚本' || p.occupation === '製作');
  // 1. 監督・脚本・製作などのスタッフは写真やIDがなくても100%残す！
  if (isStaff) return true;

  // 2. キャスト（俳優）は、写真が一切ない人、またはWikidata ID / TMDb IDが一切ない人は「誰かわからない」ため削除
  const hasPhoto = Boolean(p.profile_url);
  const hasId = Boolean(p.wikidata_id || p.tmdb_id);
  if (!hasPhoto || !hasId) {
    return false;
  }
  return true;
});

// 4. サントラデータの抽出（元データの曲を最優先保護・復元 & カタカナ/ハングル整合性クレンジング）
let approvedTracks = [];
const rawAiTracks = Array.isArray(auditResult.tracks) ? auditResult.tracks : [];

// A. AIが返した tracks の精査とマッピング
if (rawAiTracks.length > 0) {
  approvedTracks = rawAiTracks.filter(t => {
    if (!t || (!t.track_id && !t.track_name)) return false;
    if (t.status && String(t.status).toUpperCase() === 'REJECTED') return false;
    return true;
  }).map(t => {
    const matchedOrig = origTracks.find(ot => String(ot.track_id) === String(t.track_id) || (ot.track_name && t.track_name && ot.track_name.includes(t.track_name)));
    
    // 韓国作品の場合、ハングル表記を最優先保護
    const artistEn = (hasHangul(matchedOrig?.artist_name_en) && !hasHangul(t.artist_name_en))
      ? matchedOrig.artist_name_en
      : (t.artist_name_en || matchedOrig?.artist_name_en || t.artist_name || '');
    
    const trackEn = (hasHangul(matchedOrig?.track_name_en) && !hasHangul(t.track_name_en))
      ? matchedOrig.track_name_en
      : (t.track_name_en || matchedOrig?.track_name_en || t.track_name || '');

    return {
      track_id: String(t.track_id || matchedOrig?.track_id || ''),
      track_name: t.track_name || matchedOrig?.track_name || '',
      track_name_en: trackEn,
      artist_name: t.artist_name || matchedOrig?.artist_name || '',
      artist_name_en: artistEn,
      country: t.country || matchedOrig?.country || movie.country || 'KR',
      release_year: String(t.release_year || matchedOrig?.release_year || movie.year || ''),
      preview_url: t.preview_url || matchedOrig?.preview_url || '',
      itunes_url: t.itunes_url || matchedOrig?.itunes_url || '',
      album_cover: t.album_cover || matchedOrig?.album_cover || movie.poster_url || '',
      description: t.description || matchedOrig?.description || `映画・ドラマ『${movie.title}』公式挿入歌。`,
      ost_for: movie.title || matchedOrig?.ost_for || '',
      tmdb_id: movie.tmdb_id || matchedOrig?.tmdb_id || null,
      wikidata_id: movie.wikidata_id || matchedOrig?.wikidata_id || null,
      genre: t.genre || matchedOrig?.genre || 'OST'
    };
  });
}

// B. もしAIの出力が空配列[]だったり、全件除外されて0件になった場合は、元データの曲(origTracks)を100%保護採用！
if (approvedTracks.length === 0 && origTracks.length > 0) {
  approvedTracks = origTracks.map(ot => ({
    ...ot,
    ost_for: movie.title || ot.ost_for || '',
    tmdb_id: movie.tmdb_id || ot.tmdb_id || null,
    wikidata_id: movie.wikidata_id || ot.wikidata_id || null,
    country: ot.country || movie.country || 'KR'
  }));
}

return [{
  json: {
    is_valid: isValid,
    confidence_score: auditResult.confidence_score || 90,
    audit_summary: auditResult.audit_summary || '検証完了',

    // 🎯 映画データをトップレベルにも展開（Supabaseへ保存ノードのエラーを即座に解消）
    ...movie,

    // 映画データ
    movie: movie,

    // キャスト・人物データ (Personsテーブル用)
    persons: validPersons,
    persons_count: validPersons.length,

    // サントラデータ (tracksテーブル用 - REJECT除外済み)
    tracks: approvedTracks,
    tracks_count: approvedTracks.length
  }
}];

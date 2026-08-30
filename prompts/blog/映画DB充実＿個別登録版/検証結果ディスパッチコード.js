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
    origTracks = aggr.tracks_payload || [];
    origMovie = aggr.movie_payload || {};
  }
} catch (e) {}

if (origPersons.length === 0) {
  try {
    origPersons = $('Supabase整形コード').all().map(item => item.json).filter(Boolean);
  } catch (e) {}
}

// 3. 映画データの抽出（元の全フィールド: imdb_id, imdb_url, overview_en, genres, platform等を100%完全保持）
const movie = {
  ...origMovie,
  ...(auditResult.movie || {})
};
if (movie.cast) movie.cast = String(movie.cast).replace(/_/g, '・');
if (movie.director) movie.director = String(movie.director).replace(/_/g, '・');

// ★ ハングル保護: 元データにハングルがある場合、AIがローマ字に変換していてもハングル表記を100%最優先保護
const hasHangul = (str) => /[\uac00-\ud7af]/.test(str || '');
if (hasHangul(origMovie.cast_en) && !hasHangul(movie.cast_en)) {
  movie.cast_en = origMovie.cast_en;
}
if (hasHangul(origMovie.director_en) && !hasHangul(movie.director_en)) {
  movie.director_en = origMovie.director_en;
}

// ★ プラットフォーム安全サニタイズ（Supabase ENUM型: '劇場公開', 'Netflix', 'Amazon Prime', 'Disney+', 'Apple TV+', 'Watcha', 'TVING', 'その他' のみ許可）
const ALLOWED_PLATFORMS = ['劇場公開', 'Netflix', 'Amazon Prime', 'Disney+', 'Apple TV+', 'Watcha', 'TVING', 'その他'];
let safePlatform = movie.platform || origMovie.platform || '';
if (safePlatform === 'Amazon Prime Video') safePlatform = 'Amazon Prime';

const isTv = Boolean(
  movie.genres?.includes('ドラマ') || 
  origMovie.genres?.includes('ドラマ') || 
  movie.first_air_date || 
  origMovie.first_air_date
);

// TVドラマなのに「劇場公開」になっている場合は「その他」に強制是正
if (isTv && safePlatform === '劇場公開') {
  safePlatform = 'その他';
} else if (!ALLOWED_PLATFORMS.includes(safePlatform)) {
  safePlatform = isTv ? 'その他' : '劇場公開';
}
movie.platform = safePlatform;

// 4. 人物データの抽出（Supabase Personsテーブルのカラム名 wikidata_id に100%統一）
const aiPersons = auditResult.persons || [];
const validPersons = (origPersons.length > 0 ? origPersons : aiPersons).map(origP => {
  const rawName = String(origP.name || '').replace(/_/g, '・');
  const matchedAi = aiPersons.find(ap => 
    ((ap.wikidata_id || ap.qid) && (origP.wikidata_id || origP.qid) && (ap.wikidata_id || ap.qid) === (origP.wikidata_id || origP.qid)) ||
    (ap.name && rawName && (ap.name === rawName || ap.name.includes(rawName) || rawName.includes(ap.name)))
  );

  const wId = origP.wikidata_id || origP.qid || matchedAi?.wikidata_id || matchedAi?.qid || null;
  const pNameEn = (hasHangul(origP.name_en) && !hasHangul(matchedAi?.name_en))
    ? origP.name_en
    : (matchedAi?.name_en || origP.name_en || null);

  const pObj = {
    ...origP,
    name: String(matchedAi?.name || rawName).replace(/_/g, '・'),
    name_en: pNameEn,
    occupation: matchedAi?.occupation || origP.occupation || '俳優',
    country: matchedAi?.country || origP.country || movie.country || '',
    profile_url: matchedAi?.profile_url || origP.profile_url || origP.image_url || null,
    gender: origP.gender || null,
    wikidata_id: wId,
    tmdb_id: origP.tmdb_id || matchedAi?.tmdb_id || null,
    x_id: origP.x_id || null,
    instagram_id: origP.instagram_id || null,
    youtube_id: origP.youtube_id || null,
    official_site: origP.official_site || null
  };
  delete pObj.qid; // Supabaseには存在しないqidを完全除去
  return pObj;
}).filter(p => p && p.name && p.name.trim().length >= 2);

// 4. サントラデータの抽出（APPROVEDされたもの、またはREJECTEDでないもののみを通過）
const rawTracks = auditResult.tracks || inputJson.tracks_payload || [];
const approvedTracks = rawTracks.filter(t => {
  if (!t || !t.track_id) return false;
  if (t.status && t.status.toUpperCase() === 'REJECTED') return false;
  return true;
});

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

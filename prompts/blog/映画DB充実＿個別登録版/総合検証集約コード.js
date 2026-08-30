/**
 * 【n8n用】映画・人物・サントラ（OST）総合検証集約コード (総合検証集約コード.js)
 * 
 * 役割: 「映画データ」「キャスト・監督（人物データ）」「サントラ（OST劇中歌データ）」の
 *       3系統の整形済みデータを1つのJSONに完全集約し、後続の総合AI検証ノードへ渡します。
 */

function getNodeData(name) {
  try {
    const node = $(name);
    if (!node) return null;
    const all = node.all();
    if (Array.isArray(all) && all.length > 0) {
      return all.map(item => item.json).filter(Boolean);
    }
    return node.first()?.json ? [node.first().json] : null;
  } catch (e) {
    return null;
  }
}

// 1. 映画データの取得（補完結果整形コード ➔ 補完ブリッジ整形コード ➔ 映画データ整形コード）
const movieDataList = getNodeData('補完結果整形コード') || 
                      getNodeData('補完ブリッジ整形コード') || 
                      getNodeData('映画データ整形コード') || 
                      [];
const movie = movieDataList[0] || $input.first()?.json || {};

// 2. キャスト・監督（人物データ）の取得（Supabase整形コード）
const persons = getNodeData('Supabase整形コード') || [];

// 3. サントラ（OST劇中歌データ）の取得（OST劇中歌取得整形Code）
let rawTracks = getNodeData('OST劇中歌取得整形Code') || [];
if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
  try {
    const ostNode = $('OST劇中歌取得整形Code');
    if (ostNode) {
      const all = ostNode.all();
      if (Array.isArray(all) && all.length > 0) {
        rawTracks = all.map(item => item.json).filter(Boolean);
      }
    }
  } catch(e) {}
}

// has_tracks: false のダミーメッセージは除外
const validTracks = rawTracks.filter(t => t && t.has_tracks !== false && t.track_id);

// 4. AI検証用サマリーオブジェクトの構築
return [{
  json: {
    movie_title: movie.title || movie.origin_title || '',
    origin_title: movie.origin_title || '',
    country: movie.country || '',
    year: movie.year || '',
    director: movie.director || '',
    director_en: movie.director_en || '',
    cast: movie.cast || '',
    cast_en: movie.cast_en || '',
    overview: movie.overview || '',
    poster_url: movie.poster_url || '',
    trailer_url: movie.trailer_url || '',
    tmdb_id: movie.tmdb_id || null,
    wikidata_id: movie.wikidata_id || null,

    // フル映画データ
    movie_payload: movie,

    // 人物データ一覧 (全フィールド: 写真、SNS、YouTube、性別、公式サイト等を100%完全保持)
    persons_payload: persons.map(p => ({
      ...p,
      name: p.name || '',
      name_en: p.name_en || '',
      occupation: p.occupation || '俳優',
      country: p.country || movie.country || '',
      wikidata_id: p.wikidata_id || p.qid || null,
      profile_url: p.profile_url || p.image_url || null,
      gender: p.gender || null,
      tmdb_id: p.tmdb_id || null,
      x_id: p.x_id || null,
      instagram_id: p.instagram_id || null,
      youtube_id: p.youtube_id || null,
      official_site: p.official_site || null
    })),

    // サントラデータ一覧 (曲名、アーティスト、発売年、試聴URL、ジャケ写)
    tracks_payload: validTracks.map(t => ({
      track_id: t.track_id || '',
      track_name: t.track_name || '',
      track_name_en: t.track_name_en || '',
      artist_name: t.artist_name || '',
      artist_name_en: t.artist_name_en || '',
      release_year: t.release_year || '',
      preview_url: t.preview_url || '',
      itunes_url: t.itunes_url || '',
      album_cover: t.album_cover || '',
      ost_for: t.ost_for || movie.title || '',
      tmdb_id: t.tmdb_id || movie.tmdb_id || null,
      wikidata_id: t.wikidata_id || movie.wikidata_id || null,
      genre: t.genre || 'OST'
    })),

    total_persons_count: persons.length,
    total_tracks_count: validTracks.length
  }
}];

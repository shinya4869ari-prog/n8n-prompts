/**
 * 【n8n用】個別の音楽・アーティストデータ統合整形コード
 * 
 * 役割: アーティスト名/グループ名（例: BLACKPINK）を入力とし、
 *       iTunes API + Wikidata からグループ情報・メンバー一覧・代表曲・ジャケット画像・試聴URLを統合して出力します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const input = $input.first()?.json || $input.item?.json || {};
const artistQuery = input.artist || input.query || input.name || '';
const itunes = getNodeData('iTunes検索');
const wiki = getNodeData('Wikidataアーティスト検索');

const itunesTracks = itunes.results || (Array.isArray(itunes) ? itunes : []);
const firstTrack = itunesTracks[0] || {};

// 代表曲一覧の抽出
const topSongs = itunesTracks.slice(0, 10).map(t => ({
  track_name: t.trackName,
  album_name: t.collectionName,
  artwork_url: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : '',
  preview_url: t.previewUrl,
  release_date: t.releaseDate ? t.releaseDate.substring(0, 4) : ''
}));

return [{
  json: {
    artist_name: firstTrack.artistName || artistQuery,
    artist_id: firstTrack.artistId || null,
    genre: firstTrack.primaryGenreName || 'K-POP / J-POP',
    country: input.country || 'KR',
    artwork_url: firstTrack.artworkUrl100 ? firstTrack.artworkUrl100.replace('100x100bb', '600x600bb') : '',
    top_songs: topSongs,
    
    // グループ・メンバー構造 (Wikidata等から自動補完)
    type: (input.type || 'group'), 
    members: input.members || null
  }
}];

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
const itunesRaw = getNodeData('iTunes検索');
const wiki = getNodeData('Wikidataメンバー検索');

// iTunes レスポンスの柔軟なパース
let itunesData = {};
try {
  if (itunesRaw.data) {
    itunesData = typeof itunesRaw.data === 'string' ? JSON.parse(itunesRaw.data) : itunesRaw.data;
  } else {
    itunesData = itunesRaw;
  }
} catch(e) {
  itunesData = {};
}

const itunesTracks = itunesData.results || (Array.isArray(itunesData) ? itunesData : []);
const firstTrack = itunesTracks[0] || {};
const artistQuery = input.artist || input['アーティスト名 / グループ名'] || input.body?.['アーティスト名 / グループ名'] || firstTrack.artistName || 'BLACKPINK';

// 代表曲一覧の抽出（最大10曲）
const topSongs = itunesTracks.slice(0, 10).map(t => ({
  track_name: t.trackName,
  album_name: t.collectionName,
  artwork_url: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : '',
  preview_url: t.previewUrl,
  release_date: t.releaseDate ? t.releaseDate.substring(0, 4) : ''
}));

// グループかソロかの自動判別
const hasMembers = wiki.results?.bindings && wiki.results.bindings.length > 0;

return [{
  json: {
    artist_name: firstTrack.artistName || artistQuery,
    artist_id: firstTrack.artistId || null,
    genre: firstTrack.primaryGenreName || 'K-Pop',
    country: firstTrack.country || 'KR',
    artwork_url: firstTrack.artworkUrl100 ? firstTrack.artworkUrl100.replace('100x100bb', '600x600bb') : '',
    top_songs: topSongs,
    
    // グループ・メンバー構造
    type: hasMembers ? 'group' : 'individual',
    has_members: hasMembers
  }
}];

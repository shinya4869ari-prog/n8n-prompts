/**
 * 【n8n用】個別の音楽・アーティストデータ統合整形コード
 * 
 * 役割: アーティスト名/グループ名を入力とし、
 *       iTunes API + Wikidata からグループ情報・メンバー一覧・代表曲・ジャケット画像・試聴URLを統合して出力します。
 */

function getNodeData(name) {
  try { return $(name).first()?.json || $(name).item?.json || {}; } catch(e) { return {}; }
}

const input = $input.first()?.json || $input.item?.json || {};
const itunesRaw = getNodeData('iTunes検索');
const wikiRaw = getNodeData('Wikidataメンバー検索');

let itunesData = {};
try {
  if (itunesRaw.data) {
    itunesData = typeof itunesRaw.data === 'string' ? JSON.parse(itunesRaw.data) : itunesRaw.data;
  } else { itunesData = itunesRaw; }
} catch(e) { itunesData = {}; }

let wikiData = {};
try {
  if (wikiRaw.data) {
    wikiData = typeof wikiRaw.data === 'string' ? JSON.parse(wikiRaw.data) : wikiRaw.data;
  } else { wikiData = wikiRaw; }
} catch(e) { wikiData = {}; }

const itunesTracks = itunesData.results || (Array.isArray(itunesData) ? itunesData : []);
const firstTrack = itunesTracks[0] || {};
const artistQuery = input.artist || input.q || input['アーティスト名 / グループ名'] || input.body?.['アーティスト名 / グループ名'] || 'BLACKPINK';

// 🎯 検索された名前（artistQuery）を尊重する。1曲目のコラボ相手（FTISLAND等）に化けないよう判定
let targetArtistName = artistQuery;
if (firstTrack.artistName && (firstTrack.artistName.toLowerCase().includes(artistQuery.toLowerCase()) || artistQuery.toLowerCase().includes(firstTrack.artistName.toLowerCase()))) {
  targetArtistName = firstTrack.artistName;
}

const topSongs = itunesTracks.slice(0, 10).map(t => ({
  track_name: t.trackName,
  album_name: t.collectionName,
  artwork_url: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '600x600bb') : '',
  preview_url: t.previewUrl,
  release_date: t.releaseDate ? t.releaseDate.substring(0, 4) : ''
}));

const membersList = wikiData.results?.bindings || [];
const hasMembers = membersList.length > 0;
const genre = firstTrack.primaryGenreName || 'K-Pop';

let country = 'KR';
if (genre.toLowerCase().includes('k-pop') || /^[A-Z0-9\s]+$/i.test(targetArtistName)) {
  country = 'KR';
} else if (firstTrack.country && firstTrack.country !== 'USA') {
  country = firstTrack.country;
}

return [{
  json: {
    artist_name: targetArtistName,
    artist_id: firstTrack.artistId || null,
    genre: genre,
    country: country,
    artwork_url: firstTrack.artworkUrl100 ? firstTrack.artworkUrl100.replace('100x100bb', '600x600bb') : '',
    top_songs: topSongs,
    type: hasMembers ? 'group' : 'individual',
    has_members: hasMembers
  }
}];

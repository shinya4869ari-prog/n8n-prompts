/**
 * 🎵 04_ID検索結果確定.js
 * ノード名: 「04_ID検索結果確定」
 */
let input = $input.first()?.json || {};

if (typeof input.data === 'string') {
  try {
    input = JSON.parse(input.data.trim());
  } catch (e) {}
} else if (typeof input === 'string') {
  try {
    input = JSON.parse(input.trim());
  } catch (e) {}
}

const results = input.results || [];

if (results.length === 0) {
  throw new Error("指定されたTrack IDの楽曲が見つかりませんでした。");
}

const track = results[0];
const coverUrl = (track.artworkUrl100 || "").replace("100x100bb", "600x600bb");
const searchQuery = `${track.trackName} ${track.artistName}`;

return [{
  json: {
    track_meta: {
      track_id: String(track.trackId),
      track_name: track.trackName,
      track_name_en: track.trackName,
      artist_name: track.artistName,
      album_name: track.collectionName,
      album_cover: coverUrl,
      preview_url: track.previewUrl || '',
      itunes_url: track.trackViewUrl || '',
      release_date: track.releaseDate ? track.releaseDate.split('T')[0] : '',
      genre: track.primaryGenreName || 'K-POP'
    },
    lrclib_search_url: `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`,
    source: 'track_id'
  }
}];

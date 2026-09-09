/**
 * 🎵 02_スクショ検索結果確定.js
 * ノード名: 「02_スクショ検索結果確定」
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
  throw new Error("iTunesで楽曲が見つかりませんでした。スクショ画像をご確認ください。");
}

const best = results[0];
const coverUrl = (best.artworkUrl100 || "").replace("100x100bb", "600x600bb");
const searchQuery = `${best.trackName} ${best.artistName}`;

return [{
  json: {
    track_meta: {
      track_id: String(best.trackId),
      track_name: best.trackName,
      track_name_en: best.trackName,
      artist_name: best.artistName,
      album_name: best.collectionName,
      album_cover: coverUrl,
      preview_url: best.previewUrl || '',
      itunes_url: best.trackViewUrl || '',
      release_date: best.releaseDate ? best.releaseDate.split('T')[0] : '',
      genre: best.primaryGenreName || 'K-POP'
    },
    lrclib_search_url: `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`,
    source: 'screenshot'
  }
}];

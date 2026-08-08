/**
 * iTunes Search API 検索結果整形ノード
 * iTunes APIのレスポンス結果(results)から必要な要素を抽出し、高解像度アートワーク・試聴音源URLを付与してAIスクリーニングへ渡す
 */
let rawData = items[0].json;

// n8nのHTTP Requestノードが文字列 (rawData.data) としてレスポンスを返した場合のパース処理
if (rawData && typeof rawData.data === 'string') {
  try {
    rawData = JSON.parse(rawData.data.trim());
  } catch (e) {}
}

// iTunes APIの応答: rawData.results または rawData.data.results
const results = rawData.results || rawData.data?.results || [];
let countryJa = '対象国';
try {
  countryJa = $('iTunes検索_クエリ作成').first().json.countryJa;
} catch (e) {}

if (!Array.isArray(results) || results.length === 0) {
  return [{
    json: {
      countryJa,
      tracks: [],
      rawCount: 0
    }
  }];
}

// 必要な情報のみをコンパクト抽出
const parsedTracks = results.map(track => {
  // 100x100bb の画像を 600x600bb 高解像度に変換
  const rawArtwork = track.artworkUrl100 || track.artworkUrl60 || '';
  const highResArtwork = rawArtwork.replace('100x100bb', '600x600bb').replace('60x60bb', '600x600bb');
  
  const releaseDate = track.releaseDate || '';
  const releaseYear = releaseDate.split('-')[0] || '';

  return {
    track_id: String(track.trackId || ''),
    track_name: track.trackName || '',
    artist_name: track.artistName || '',
    album_name: track.collectionName || '',
    genre_name: track.primaryGenreName || '',
    album_cover: highResArtwork,
    preview_url: track.previewUrl || '',
    itunes_url: track.trackViewUrl || track.collectionViewUrl || '',
    release_date: releaseDate,
    release_year: releaseYear
  };
});

// 最新曲・最新リリース順にソート (降順)
parsedTracks.sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0));

return [{
  json: {
    countryJa,
    tracks: parsedTracks,
    rawCount: parsedTracks.length
  }
}];

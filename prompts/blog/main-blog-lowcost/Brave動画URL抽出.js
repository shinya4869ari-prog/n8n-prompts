// === Brave動画URL抽出 ===
// Brave Search (Videos) の結果から、YouTubeの予告編URLを安全に抽出します。

// 入力データ（Brave Searchの結果）をすべて取得
const braveItems = $input.all();

// 手前の「リサーチデータ整形」の映画データをすべて取得
let movieItems = [];
try {
  movieItems = $('リサーチデータ整形').all();
} catch (e) {
  try {
    movieItems = $('Loop Over Items').all();
  } catch (e2) {
    try {
      movieItems = $('Loop Over Items1').all();
    } catch (e3) {
      try {
        movieItems = $('映画ごとにループ実行').all();
      } catch (e4) {
        movieItems = [];
      }
    }
  }
}

// すべてのアイテムを順番に処理してマージする
return braveItems.map((item, index) => {
  const braveData = item.json || {};
  const braveVideos = Array.isArray(braveData.results) ? braveData.results :
                      (Array.isArray(braveData.videos?.results) ? braveData.videos.results : []);

  const youtubeVideo = braveVideos.find(v => {
    const url = v.url || v.profile?.url || '';
    const title = (v.title || v.description || '').toLowerCase();
    
    // YouTubeの動画リンクであること
    const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
    if (!isYouTube) return false;
    
    // エラー画面等のノイズを除外
    const isNoise = title.includes('not currently available') || title.includes('利用できません') || title.includes('device');
    if (isNoise) return false;
    
    // 予告編に関連するキーワードの判定
    const hasKeyword = title.includes('予告') || 
                      title.includes('特報') || 
                      title.includes('trailer') || 
                      title.includes('teaser') || 
                      title.includes('preview') || 
                      title.includes('promo');
    return hasKeyword;
  });

  const trailer_url = youtubeVideo?.url || youtubeVideo?.profile?.url || null;

  // 対応するインデックスの映画データを取得
  const movieData = movieItems[index]?.json || {};

  // poster_path を絶対URL（poster_url）に変換
  let poster_url = movieData.poster_url || movieData.poster_path || null;
  if (poster_url && typeof poster_url === 'string' && poster_url.startsWith('/')) {
    poster_url = `https://image.tmdb.org/t/p/w500${poster_url}`;
  }

  return {
    json: {
      title: movieData.title || null,
      origin_title: movieData.origin_title || null,
      poster_url: poster_url,
      country: movieData.country || null,
      wikidata_id: movieData.wikidata_id || null,
      tmdb_id: movieData.tmdb_id || 0,
      overview: movieData.overview || null,
      year: movieData.year || null,
      ai_summary: movieData.ai_summary || null,
      director: movieData.director || null,
      cast: movieData.cast || null,
      trailer_url: trailer_url
    }
  };
});

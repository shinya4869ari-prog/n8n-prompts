// === ブログのワークフロー用：YouTube URLマージコード ===
// 存在しないTMDb関連ノードの参照を排除し、Brave SearchからYouTube予告編URLを安全に抽出して映画データにマージします。

const braveTrailer = (() => {
  try {
    return $('Brave Search_trailer').item?.json || {};
  } catch (e) {
    try {
      return $input.item?.json || {};
    } catch (e2) {
      return {};
    }
  }
})();

let movieData = {};
try {
  movieData = $('Loop Over Items').item?.json || {};
} catch (e) {
  try {
    movieData = $input.item?.json || {};
  } catch (e2) {}
}

const braveVideos = Array.isArray(braveTrailer?.results) ? braveTrailer.results :
                    (Array.isArray(braveTrailer?.videos?.results) ? braveTrailer.videos.results : []);

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

return [{
  json: {
    ...movieData,
    trailer_url: trailer_url
  }
}];

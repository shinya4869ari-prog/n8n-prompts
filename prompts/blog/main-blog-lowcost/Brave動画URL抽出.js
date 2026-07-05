// === Brave動画URL抽出 ===
// Brave Search (Videos) の結果から、YouTubeの予告編URLを安全に抽出します。

const braveVideos = Array.isArray($json.results) ? $json.results :
                    (Array.isArray($json.videos?.results) ? $json.videos.results : []);

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
    trailer_url: trailer_url
  }
}];

/**
 * 🎵 03_通常ID入力確定.js
 * ノード名: 「03_通常ID入力確定」
 * 
 * 【役割】
 * - フォームから手動入力された楽曲IDを受け取る
 * - 余計な記号等を除去して数字のTrack IDを抽出
 * - iTunes Lookup API のURLを生成
 */

const item = $input.first()?.json || {};
let trackId = item.track_id || item.id || item.trackId || "";

if (typeof trackId === 'string') {
  const numMatch = trackId.match(/\d+/);
  if (numMatch) {
    trackId = numMatch[0];
  }
}

if (!trackId) {
  trackId = "1681264206"; // デフォルト（DAWN - Dear My Light）
}

return [{
  json: {
    target_track_id: String(trackId),
    itunes_lookup_url: `https://itunes.apple.com/lookup?id=${encodeURIComponent(trackId)}&country=US`
  }
}];

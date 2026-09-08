/**
 * 🎵 01_楽曲ID入力_iTunesメタデータ取得.js
 * 
 * 【役割】
 * - 入力された楽曲ID（track_id: 例 "1648228862"）を受け取る
 * - iTunes Lookup API を呼び出して曲名、アーティスト、高画質ジャケット、試聴音源URLを取得
 * - 次のAI（Gemini）ノードへ渡すためのクリーンなメタデータオブジェクトを構築
 */

// 1. 入力データの取得（Manual Trigger, Webhook, または直前ノードから）
const input = $input.first()?.json || {};

// 楽曲IDの特定（track_id, id, query のいずれかから取得）
let trackId = input.track_id || input.id || input.trackId || "";

// もし "track_1648228862" などのプレフィックスがあれば数字のみ抽出
if (typeof trackId === 'string') {
  const numMatch = trackId.match(/\d+/);
  if (numMatch) {
    trackId = numMatch[0];
  }
}

if (!trackId) {
  // デスト用デフォルト（例: キム・ナヨン - Once Again / もう一度君を）
  trackId = "1648228862"; 
}

// 2. iTunes Lookup API URLの生成
// 韓国ストア（country=KR）を優先し、韓国語曲名・ハングル表記を取得
const itunesUrl = `https://itunes.apple.com/lookup?id=${encodeURIComponent(trackId)}&country=KR`;

return [{
  json: {
    target_track_id: String(trackId),
    itunes_lookup_url: itunesUrl,
    input_received_at: new Date().toISOString()
  }
}];

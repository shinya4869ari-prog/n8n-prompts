/**
 * 🎵 01_アプリ連携メタデータ確定_LRCLIB生成.js
 * ノード名: 「01_アプリ連携メタデータ確定 & LRCLIB生成」
 * 
 * 【役割】
 * - 外部音楽検索アプリからWebhook（HTTP POST）で届いたリッチな楽曲JSONを受け取る
 * - カバー画像を 600x600bb の高解像度に自動変換
 * - 試聴音源URL、Apple Musicリンク、トラックIDを100%保持
 * - LRCLIB（公式歌詞API）の検索クエリURLを自動生成
 */

// --- 1. Webhook 受信データの取得と正規化 ---
let input = $input.first()?.json || {};

// Webhookのbodyプロパティ配下にある場合を展開
if (input.body) {
  input = input.body;
}

// 配列形式（[ { track_id: ... } ]）で送られてきた場合は先頭要素を採用
if (Array.isArray(input)) {
  input = input[0] || {};
}

// ⚠️ 万が一文字列で届いた場合の安全パース
if (typeof input === 'string') {
  try {
    input = JSON.parse(input.trim());
    if (Array.isArray(input)) input = input[0] || {};
  } catch (e) {}
}

// --- 2. トラックIDの安全な抽出 ---
const rawTrackId = input.track_id || input.id || "";
let trackId = String(rawTrackId).trim();
const numMatch = trackId.match(/\d+/);
if (numMatch) {
  trackId = numMatch[0];
}

if (!trackId) {
  throw new Error("⚠️ トラックID（track_id または id）が見つかりません。アプリからの送信データをご確認ください。");
}

// --- 3. 楽曲メタデータの抽出と高画質化 ---
const trackTitle = String(input.title || input.track_name || input.name || "").trim();
const artistName = String(input.artist || input.artist_name || "").trim();
const albumName = String(input.album || input.album_name || "").trim();
const releaseDate = String(input.release_date || "").split('T')[0];
const previewUrl = String(input.preview_url || "").trim();
const trackViewUrl = String(input.track_view_url || input.itunes_url || "").trim();

// カバー画像を 600x600bb の高解像度へ自動変換
let coverUrl = String(input.artwork_url || input.album_cover || "").trim();
if (coverUrl) {
  coverUrl = coverUrl.replace(/\/\d+x\d+bb\./, '/600x600bb.');
}

// --- YouTube ID の安全な抽出（URL / ID直指定の両対応） ---
let youtubeId = "";
const rawYt = input.youtube_id || input.youtube || input.youtube_url || input.mv_url || "";
if (rawYt) {
  const ytMatch = String(rawYt).match(/(?:v=|\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    youtubeId = ytMatch[1];
  } else if (/^[a-zA-Z0-9_-]{11}$/.test(String(rawYt).trim())) {
    youtubeId = String(rawYt).trim();
  }
}

// --- 識別子（Wikidata, ISRC, MusicBrainz）の取得 ---
const wikidataId = String(input.wikidata_id || input.wiki_data_id || "").trim();
const isrc = String(input.isrc || "").trim();
const musicbrainzId = String(input.musicbrainz_id || "").trim();
const releaseYear = String(input.year || releaseDate.split('-')[0] || "").trim();

// --- 4. LRCLIB 公式歌詞検索クエリの最適化 ---
// 例: "I'm Firefly Hwang Karam" または クエリにハングルがあればそれを活用
let queryForLyrics = "";
if (trackTitle && artistName) {
  queryForLyrics = `${trackTitle} ${artistName}`;
} else {
  queryForLyrics = trackTitle || artistName || input.query || "";
}

// 記号除去してクリーンな検索文字列を作成
const cleanQuery = queryForLyrics.replace(/[()[\]{}「」『』]/g, ' ').replace(/\s+/g, ' ').trim();
const lrclibUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanQuery)}`;

// --- 5. 統一フォーマット（track_meta）を出力 ---
return [{
  json: {
    track_meta: {
      track_id: trackId,
      track_name: trackTitle,
      track_name_en: trackTitle,
      artist_name: artistName,
      artist_name_en: artistName,
      album_name: albumName,
      album_cover: coverUrl,
      preview_url: previewUrl,
      itunes_url: trackViewUrl,
      youtube_id: youtubeId,
      wikidata_id: wikidataId || null,
      isrc: isrc || null,
      musicbrainz_id: musicbrainzId || null,
      release_date: releaseDate,
      release_year: releaseYear || null,
      genre: input.genre || 'K-POP',
      query: input.query || ""
    },
    lrclib_search_url: lrclibUrl,
    model: 'gemini-3.8-flash',
    source: 'music_search_app'
  }
}];

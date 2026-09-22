/**
 * 🎵 04_手入力検索結果確定.js
 * ノード名: 「04_手入力検索結果確定」（または 04_ID検索結果確定）
 */

// --- 1. レスポンスのパースと正規化 ---
// 直前の「ID事前Lookup API」から返ってきたレスポンスを安全に展開する
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

// 検索ヒットが完全0件の場合は停止
if (results.length === 0) {
  throw new Error("iTunesの検索結果が0件でした。キーワードを変えてお試しください。");
}

// --- 2. 検索元ノードから入力されたアーティスト名を取得 ---
// 手前のクエリ生成ノードから指定されたアーティスト名を取得（大文字小文字を無視）
let expectedArtist = "";
try {
  expectedArtist = String($('03_手入力検索クエリ生成').first().json.artist || "").trim().toLowerCase();
} catch (e) {
  try {
    expectedArtist = String($('03_通常ID入力確定').first().json.artist || "").trim().toLowerCase();
  } catch (err) {}
}

// --- 3. 候補リストから本命の楽曲を特定 ---
// 1番目決め打ち（results[0]）をやめ、指定アーティスト名を含むトラックを優先して探す
let best = null;
if (expectedArtist) {
  best = results.find(item => {
    const isTrack = item.wrapperType === 'track' || item.kind === 'song';
    const artistName = String(item.artistName || "").toLowerCase();
    return isTrack && artistName.includes(expectedArtist);
  });
}

// 一致するものがなければトラック形式のもの、または配列の先頭を採用（後続のWaitノードで確認するため）
if (!best) {
  best = results.find(item => item.wrapperType === 'track' || item.kind === 'song') || results[0];
}

// --- 4. 画像URLと歌詞検索キーワードの組み立て ---
// カバー画像を600x600の高画質に変換
const coverUrl = (best.artworkUrl100 || "").replace("100x100bb", "600x600bb");

// トラック名とアーティスト名を安全に結合（記号混入バグを完全排除）
const trackNameStr = String(best.trackName || best.collectionName || "").trim();
const artistNameStr = String(best.artistName || "").trim();
const searchQuery = trackNameStr + " " + artistNameStr;

// --- 5. 統一フォーマットで出力 ---
return [{
  json: {
    track_meta: {
      track_id: String(best.trackId || best.collectionId || ""),
      track_name: trackNameStr,
      track_name_en: trackNameStr,
      artist_name: artistNameStr,
      album_name: best.collectionName || "",
      album_cover: coverUrl,
      preview_url: best.previewUrl || '',
      itunes_url: best.trackViewUrl || best.collectionViewUrl || '',
      release_date: best.releaseDate ? best.releaseDate.split('T')[0] : '',
      genre: best.primaryGenreName || 'K-POP'
    },
    lrclib_search_url: "https://lrclib.net/api/search?q=" + encodeURIComponent(searchQuery),
    source: 'manual_text'
  }
}];
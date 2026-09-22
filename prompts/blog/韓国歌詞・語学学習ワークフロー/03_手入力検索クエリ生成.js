/**
 * 🎵 03_手入力検索クエリ生成.js
 * ノード名: 「03_手入力検索クエリ生成」
 */

// --- 1. フォーム入力値の取得 ---
const item = $input.first()?.json || {};
const formItem = $('楽曲登録フォーム (スクショ / ID入力)')?.first()?.json || {};

const artist = String(item['アーティスト名'] || formItem['アーティスト名'] || item.artist || "").trim();
const title = String(item['曲名'] || formItem['曲名'] || item.title || "").trim();

// --- 2. 検索キーワードの結合 ---
let term = "";
if (artist && title) {
  term = artist + " " + title;
} else if (title) {
  term = title;
} else if (artist) {
  term = artist;
}

if (!term) {
  throw new Error("アーティスト名または曲名を入力してください。");
}

// --- 3. iTunes検索URL（USストア基準に戻す） ---
// USストアで最大25件取得し、後続ノードで目的の曲を抽出する
const searchUrl = "https://itunes.apple.com/search?term=" + encodeURIComponent(term) + "&country=US&media=music&limit=25";

const selectedModel = item.model || formItem.model || 'gemini-2.5-flash';

// --- 4. 出力 ---
return [{
  json: {
    artist: artist,
    title: title,
    search_term: term,
    itunes_search_url: searchUrl,
    model: selectedModel,
    source: 'manual_text'
  }
}];
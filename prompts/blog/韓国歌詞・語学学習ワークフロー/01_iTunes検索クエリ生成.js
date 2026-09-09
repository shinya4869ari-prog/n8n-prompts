/**
 * 🎵 01_iTunes検索クエリ生成.js
 * ノード名: 「01_iTunes検索クエリ生成」
 * 
 * 【役割】
 * - Gemini Vision の出力（画像から読み取ったアーティスト・曲名）をパース
 * - 記号やカッコを除去し、検索ヒット率が最も高いiTunes検索URLをコード側で自動生成
 * - ⚠️ スクショから特定できなかった場合はフォールバックせず、明確なエラーで即時停止
 */

const item = $input.first()?.json || {};
let rawText = item.text || item.output || item.content?.parts?.[0]?.text || '';
if (typeof item === 'string') rawText = item;

rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

let parsed = {};
try {
  parsed = JSON.parse(rawText);
} catch (e) {
  const mArtist = rawText.match(/"artist":\s*"([^"]+)"/);
  const mTitle = rawText.match(/"title":\s*"([^"]+)"/);
  const mTitleKo = rawText.match(/"title_ko":\s*"([^"]+)"/);
  const mTitleEn = rawText.match(/"title_en":\s*"([^"]+)"/);
  parsed = {
    artist: mArtist ? mArtist[1] : '',
    title: mTitle ? mTitle[1] : '',
    title_ko: mTitleKo ? mTitleKo[1] : '',
    title_en: mTitleEn ? mTitleEn[1] : ''
  };
}

// 記号を除去し、検索ヒット率が最も高いクエリをコード側で自動合成
const cleanArtist = (parsed.artist || '').replace(/\([^)]*\)/g, '').trim() || parsed.artist || '';
const cleanTitle = (parsed.title_en || parsed.title_ko || parsed.title || '').replace(/[()[\]]/g, ' ').trim();
const query = `${cleanArtist} ${cleanTitle}`.trim() || parsed.title || '';

// ⚠️ 曲名やアーティスト名が特定できなかった場合は、無駄な検索に進まず明確なエラーで停止
if (!query || (!cleanTitle && !cleanArtist)) {
  const detail = rawText ? rawText.slice(0, 120) : 'Geminiからの応答が空です';
  throw new Error(`⚠️ スクリーンショットから楽曲情報（曲名・アーティスト名）を特定できませんでした。\n【Geminiの応答】: ${detail}\n画像の曲名表示が鮮明かご確認いただくか、フォームから楽曲ID（track_id）を直接入力してください。`);
}

// iTunes Search API
const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=US&entity=song&limit=5`;

return [{
  json: {
    identified: parsed,
    search_query: query,
    itunes_search_url: searchUrl
  }
}];

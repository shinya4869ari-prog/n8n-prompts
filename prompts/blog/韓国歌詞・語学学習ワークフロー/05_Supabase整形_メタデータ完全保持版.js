/**
 * 🎵 05_Supabase整形_メタデータ完全保持版.js
 * ノード名: 「05_Supabase整形 & コスト算出」
 * 
 * 【役割】
 * - Google Gemini API のレスポンス（usageMetadata / candidates）を解析
 * - トークン消費量と日本円コスト（JPY）を自動算出
 * - 先行ノードまたは Webhook から「本物の楽曲メタデータ」を100%確実に復元
 * - preview_url, itunes_url, album_cover, track_id の null 化を完全防止
 * - Korean-Learner アプリの Supabase `tracks` レコード形式で出力
 */

const geminiResponse = $input.first()?.json || {};

// --- 1. track_meta の多重フォールバック復元（絶対に null にさせない！） ---
let trackMeta = {};

// 候補1: 直前の「03_Geminiリクエスト生成」ノードの出力
try {
  trackMeta = $('03_Geminiリクエスト生成')?.first()?.json?.track_meta ||
              $('03_Geminiリクエスト生成_メタデータ完全保持版')?.first()?.json?.track_meta ||
              $('06_iTunesレスポンス解析_Geminiリクエスト生成')?.first()?.json?.track_meta || {};
} catch (e) {}

// 候補2: 「01_アプリ連携メタデータ確定」ノードの出力
if (!trackMeta.track_id || !trackMeta.preview_url) {
  try {
    const meta01 = $('01_アプリ連携メタデータ確定 & LRCLIB生成')?.first()?.json?.track_meta ||
                   $('01_アプリ連携メタデータ確定_LRCLIB生成')?.first()?.json?.track_meta || {};
    trackMeta = { ...meta01, ...trackMeta };
  } catch (e) {}
}

// 候補3: 最初の「Webhook (アプリ検索結果受信)」ノードの生データから直接復元
if (!trackMeta.track_id || !trackMeta.preview_url) {
  try {
    const webhookData = $('Webhook (アプリ検索結果受信)')?.first()?.json || {};
    const item = webhookData.body || webhookData;
    const target = Array.isArray(item) ? item[0] : item;
    if (target && (target.track_id || target.id)) {
      trackMeta = {
        track_id: String(target.track_id || target.id),
        track_name: target.title || target.track_name || trackMeta.track_name || "",
        track_name_en: target.title || target.track_name || trackMeta.track_name_en || "",
        artist_name: target.artist || target.artist_name || trackMeta.artist_name || "",
        artist_name_en: target.artist || target.artist_name || trackMeta.artist_name_en || "",
        album_name: target.album || trackMeta.album_name || "",
        album_cover: (target.artwork_url || "").replace(/\/\d+x\d+bb\./, '/600x600bb.') || trackMeta.album_cover || "",
        preview_url: target.preview_url || trackMeta.preview_url || "",
        itunes_url: target.track_view_url || target.itunes_url || trackMeta.itunes_url || "",
        youtube_id: target.youtube_id || trackMeta.youtube_id || "",
        wikidata_id: target.wikidata_id || target.wiki_data_id || trackMeta.wikidata_id || null,
        isrc: target.isrc || trackMeta.isrc || null,
        musicbrainz_id: target.musicbrainz_id || trackMeta.musicbrainz_id || null,
        release_date: (target.release_date || "").split('T')[0] || trackMeta.release_date || "",
        release_year: target.year || trackMeta.release_year || null,
        genre: target.genre || trackMeta.genre || 'K-POP'
      };
    }
  } catch (e) {}
}

// --- 2. Gemini レスポンス & トークン解析 ---
let responseText = "";
let promptTokens = 0;
let completionTokens = 0;
let totalTokens = 0;

if (geminiResponse.candidates && geminiResponse.candidates[0]?.content?.parts) {
  responseText = geminiResponse.candidates[0].content.parts.map(p => p.text).join("\n");
  if (geminiResponse.usageMetadata) {
    promptTokens = geminiResponse.usageMetadata.promptTokenCount || 0;
    completionTokens = geminiResponse.usageMetadata.candidatesTokenCount || 0;
    totalTokens = geminiResponse.usageMetadata.totalTokenCount || (promptTokens + completionTokens);
  }
} else if (geminiResponse.choices && geminiResponse.choices[0]?.message?.content) {
  responseText = geminiResponse.choices[0].message.content;
  if (geminiResponse.usage) {
    promptTokens = geminiResponse.usage.prompt_tokens || 0;
    completionTokens = geminiResponse.usage.completion_tokens || 0;
    totalTokens = geminiResponse.usage.total_tokens || (promptTokens + completionTokens);
  }
} else {
  responseText = typeof geminiResponse === 'string' ? geminiResponse : JSON.stringify(geminiResponse);
}

// 為替レート & 単価テーブル (USD per 1M tokens)
const USD_TO_JPY = 155.0;
const MODEL_NAME = (trackMeta.model || "gemini-3.8-flash").toLowerCase();
let rates = { input: 0.100, output: 0.400 };
if (MODEL_NAME.includes("pro")) {
  rates = { input: 1.250, output: 5.000 };
} else if (MODEL_NAME.includes("lite") || MODEL_NAME.includes("8b")) {
  rates = { input: 0.0375, output: 0.150 };
} else {
  rates = { input: 0.100, output: 0.400 };
}

const costUsdInput = (promptTokens / 1000000) * rates.input;
const costUsdOutput = (completionTokens / 1000000) * rates.output;
const totalCostUsd = costUsdInput + costUsdOutput;
const totalCostJpy = totalCostUsd * USD_TO_JPY;

const formattedJpy = totalCostJpy < 0.01 ? `${(totalCostJpy * 100).toFixed(2)} 銭` : `${totalCostJpy.toFixed(3)} 円`;
const formattedUsd = `$${totalCostUsd.toFixed(6)}`;

// --- 3. Gemini 生成 JSON の安全パース ---
let lyricsData = {};
try {
  let cleanJsonStr = responseText.trim();
  cleanJsonStr = cleanJsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  lyricsData = JSON.parse(cleanJsonStr);
} catch (err) {
  lyricsData = {
    title_ko: trackMeta.track_name || "",
    title_ja: trackMeta.track_name || "",
    artist: trackMeta.artist_name || "",
    sentences: [],
    vocab: [],
    grammar: [],
    lyrics_notes: []
  };
}

// --- 4. 最終保存ペイロードの作成（メタデータを100%保持！） ---
const trackId = String(trackMeta.track_id || "");
if (!trackId) {
  throw new Error("⚠️ トラックIDが特定できませんでした。Supabase保存を停止します。");
}

const finalLyricsPayload = {
  id: `lyrics-${trackId}`,
  title_ko: lyricsData.title_ko || trackMeta.track_name || "無題",
  title_ja: lyricsData.title_ja || trackMeta.track_name || "無題",
  artist: trackMeta.artist_name || lyricsData.artist || "アーティスト不明", // 本物のアーティスト名を最優先
  category: lyricsData.category || "K-POP / OST",
  level: lyricsData.level || "日常会話・感情表現",
  cat_class: "cat-music",
  source: trackMeta.album_name ? `Album『${trackMeta.album_name}』` : "Apple Music / 公式音源",
  preview_url: trackMeta.preview_url || null,
  itunes_url: trackMeta.itunes_url || null,
  album_cover: trackMeta.album_cover || null,
  youtube_id: trackMeta.youtube_id || null,
  wikidata_id: trackMeta.wikidata_id || null,
  isrc: trackMeta.isrc || null,
  musicbrainz_id: trackMeta.musicbrainz_id || null,
  release_year: trackMeta.release_year || null,
  mv_url: trackMeta.youtube_id ? `https://www.youtube.com/watch?v=${trackMeta.youtube_id}` : null,
  mv_embed_url: trackMeta.youtube_id ? `https://www.youtube-nocookie.com/embed/${trackMeta.youtube_id}` : null,
  sentences: Array.isArray(lyricsData.sentences) ? lyricsData.sentences : [],
  vocab: Array.isArray(lyricsData.vocab) ? lyricsData.vocab : [],
  grammar: Array.isArray(lyricsData.grammar) ? lyricsData.grammar : [],
  lyrics_notes: Array.isArray(lyricsData.lyrics_notes) ? lyricsData.lyrics_notes : [],
  generation_cost: {
    model: MODEL_NAME,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    cost_usd: formattedUsd,
    cost_jpy: formattedJpy,
    generated_at: new Date().toISOString()
  }
};

const supabaseRecord = {
  track_id: trackId,
  track_name: finalLyricsPayload.title_ja,
  track_name_en: finalLyricsPayload.title_ko,
  artist_name: trackMeta.artist_name || finalLyricsPayload.artist,
  artist_name_en: trackMeta.artist_name_en || trackMeta.artist_name,
  country: "KR",
  genre: trackMeta.genre || "Ballad",
  preview_url: finalLyricsPayload.preview_url,
  itunes_url: finalLyricsPayload.itunes_url,
  album_cover: finalLyricsPayload.album_cover,
  youtube_id: trackMeta.youtube_id || null,
  mv_url: finalLyricsPayload.mv_url,
  release_year: trackMeta.release_year || null,
  wikidata_id: trackMeta.wikidata_id || null,
  isrc: trackMeta.isrc || null,
  musicbrainz_id: trackMeta.musicbrainz_id || null,
  description: finalLyricsPayload.title_ja,
  lyrics: JSON.stringify(finalLyricsPayload)
};

return [{
  json: supabaseRecord
}];

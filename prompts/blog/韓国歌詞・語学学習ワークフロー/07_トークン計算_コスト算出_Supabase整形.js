/**
 * 🎵 07_トークン計算_コスト算出_Supabase整形.js
 * ノード名: 「07_トークン計算_コスト算出_Supabase整形」
 * 
 * 【役割】
 * - Google Gemini API から返ってきた usageMetadata を解析
 * - トークン消費量と日本円コスト（cost_estimation）を自動算出
 * - Korean-Learner アプリの Supabase `tracks` テーブル格納用ペイロードを作成
 */

const geminiResponse = $input.first()?.json || {};
const prevNode = $('06_iTunesレスポンス解析_Geminiリクエスト生成')?.first()?.json || {};
const trackMeta = prevNode.track_meta || {};

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

// ユーザーが指定したモデル名を取得（フォーム選択、またはtrackMeta、環境変数、フォールバック）
let formModel = "";
try {
  formModel = $('楽曲登録フォーム (スクショ / ID入力)')?.item?.json?.model || "";
} catch (e) {}

const MODEL_NAME = (formModel || trackMeta.model || $env.GEMINI_MODEL || "gemini-3.8-flash").toLowerCase();

// どのモデルが選ばれても柔軟に単価を自動判定
let rates = { input: 0.100, output: 0.400 }; // デフォルト（標準Flash単価）

if (MODEL_NAME.includes("pro")) {
  rates = { input: 1.250, output: 5.000 };
} else if (MODEL_NAME.includes("lite") || MODEL_NAME.includes("8b")) {
  rates = { input: 0.0375, output: 0.150 };
} else if (MODEL_NAME.includes("1.5-flash")) {
  rates = { input: 0.075, output: 0.300 };
} else {
  // gemini-3.8-flash, gemini-3.5-flash 等の最新Flash系
  rates = { input: 0.100, output: 0.400 };
}

const costUsdInput = (promptTokens / 1000000) * rates.input;
const costUsdOutput = (completionTokens / 1000000) * rates.output;
const totalCostUsd = costUsdInput + costUsdOutput;
const totalCostJpy = totalCostUsd * USD_TO_JPY;

const formattedJpy = totalCostJpy < 0.01 ? `${(totalCostJpy * 100).toFixed(2)} 銭` : `${totalCostJpy.toFixed(3)} 円`;
const formattedUsd = `$${totalCostUsd.toFixed(6)}`;

const costReportText = `
┌────────────────────────────────────────────────────────┐
│ 🎵 歌詞学習データ生成完了 & コストレポート             │
├────────────────────────────────────────────────────────┤
│ 楽曲: ${trackMeta.track_name || '不明'} (${trackMeta.artist_name || ''})
│ モデル: ${MODEL_NAME}
│ 入力トークン: ${promptTokens.toLocaleString()} tokens ($${costUsdInput.toFixed(6)})
│ 出力トークン: ${completionTokens.toLocaleString()} tokens ($${costUsdOutput.toFixed(6)})
│ 合計トークン: ${totalTokens.toLocaleString()} tokens
├────────────────────────────────────────────────────────┤
│ 💵 発生コスト(USD): ${formattedUsd}
│ 💴 発生コスト(日本円): 約 ${formattedJpy}
└────────────────────────────────────────────────────────┘
`.trim();

console.log(costReportText);

let lyricsData = {};
try {
  let cleanJsonStr = responseText.trim();
  cleanJsonStr = cleanJsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  lyricsData = JSON.parse(cleanJsonStr);
} catch (err) {
  console.warn("JSONパース失敗:", err);
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

const trackId = trackMeta.track_id || String(Date.now());
const finalLyricsPayload = {
  id: `lyrics-${trackId}`,
  title_ko: lyricsData.title_ko || trackMeta.track_name || "無題",
  title_ja: lyricsData.title_ja || trackMeta.track_name || "無題",
  artist: lyricsData.artist || trackMeta.artist_name || "アーティスト不明",
  category: lyricsData.category || "K-POP / OST",
  level: lyricsData.level || "日常会話・感情表現",
  cat_class: "cat-music",
  source: trackMeta.album_name ? `Album『${trackMeta.album_name}』` : "Apple Music / 公式音源",
  preview_url: trackMeta.preview_url || null,
  itunes_url: trackMeta.itunes_url || null,
  album_cover: trackMeta.album_cover || null,
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
  track_name: finalLyricsPayload.title_ko,
  track_name_en: lyricsData.title_en || trackMeta.track_name_en || trackMeta.track_name,
  artist_name: finalLyricsPayload.artist,
  artist_name_en: trackMeta.artist_name,
  country: "KR",
  genre: trackMeta.genre || "Ballad",
  preview_url: trackMeta.preview_url || null,
  itunes_url: trackMeta.itunes_url || null,
  album_cover: trackMeta.album_cover || null,
  spotify_id: null,
  description: finalLyricsPayload.title_ja,
  lyrics: JSON.stringify(finalLyricsPayload)
};

return [{
  json: supabaseRecord
}];

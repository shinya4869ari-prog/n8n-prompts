/**
 * 🎵 03_トークン計算_コスト算出_Supabase整形.js
 * 
 * 【役割】
 * 1. AI (Gemini / OpenAI) からのレスポンスから消費トークン数を抽出
 * 2. 入力/出力トークン単価と為替レート（USD→JPY）に基づき「何円かかったか」を正確に算出
 * 3. 実行ログ・通知用の分かりやすいコストレポートを生成
 * 4. 韓国語学習アプリ（Korean-Learner）のSupabase `tracks` テーブル格納用ペイロードを作成
 */

// 1. 直前のノードデータの取得
const geminiResponse = $input.first()?.json || {};
// iTunesメタデータノードからメタデータを引き継ぎ
const prevNode = $('iTunesレスポンス解析')?.first()?.json || $('Code')?.first()?.json || {};
const trackMeta = prevNode.track_meta || {};

// 2. AIのテキスト出力とトークン使用量の抽出
let responseText = "";
let promptTokens = 0;
let completionTokens = 0;
let totalTokens = 0;

// Gemini API の場合
if (geminiResponse.candidates && geminiResponse.candidates[0]?.content?.parts) {
  responseText = geminiResponse.candidates[0].content.parts.map(p => p.text).join("\n");
  if (geminiResponse.usageMetadata) {
    promptTokens = geminiResponse.usageMetadata.promptTokenCount || 0;
    completionTokens = geminiResponse.usageMetadata.candidatesTokenCount || 0;
    totalTokens = geminiResponse.usageMetadata.totalTokenCount || (promptTokens + completionTokens);
  }
}
// OpenAI API / LangChain の場合 (フォールバック)
else if (geminiResponse.choices && geminiResponse.choices[0]?.message?.content) {
  responseText = geminiResponse.choices[0].message.content;
  if (geminiResponse.usage) {
    promptTokens = geminiResponse.usage.prompt_tokens || 0;
    completionTokens = geminiResponse.usage.completion_tokens || 0;
    totalTokens = geminiResponse.usage.total_tokens || (promptTokens + completionTokens);
  }
} else {
  // 直接テキストまたはパース済みJSONの場合
  responseText = typeof geminiResponse === 'string' ? geminiResponse : JSON.stringify(geminiResponse);
}

// 3. 💵 コスト（API料金・日本円）の計算
// 設定: 為替レート & モデル別単価 (100万トークンあたり)
const USD_TO_JPY = 155.0; // 1ドル = 155円換算

// 単価設定テーブル (USD per 1M tokens)
const PRICING = {
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
  "gemini-1.5-pro":   { input: 1.250, output: 5.00 },
  "gpt-4o-mini":      { input: 0.150, output: 0.60 },
  "gpt-4o":           { input: 2.500, output: 10.00 }
};

// 使用モデル（デフォルト: Gemini 1.5 Flash）
const MODEL_NAME = "gemini-1.5-flash";
const rates = PRICING[MODEL_NAME] || PRICING["gemini-1.5-flash"];

const costUsdInput = (promptTokens / 1000000) * rates.input;
const costUsdOutput = (completionTokens / 1000000) * rates.output;
const totalCostUsd = costUsdInput + costUsdOutput;
const totalCostJpy = totalCostUsd * USD_TO_JPY;

// 表示用フォーマット
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

// 4. AIが返した歌詞JSONのパース & クリーニング
let lyricsData = {};
try {
  let cleanJsonStr = responseText.trim();
  // マークダウンの ```json ... ``` を除去
  cleanJsonStr = cleanJsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  lyricsData = JSON.parse(cleanJsonStr);
} catch (err) {
  console.warn("JSONパースに失敗したため、基本骨格でラップします:", err);
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

// 5. Korean-Learner アプリと 100% 互換性のあるオブジェクトに整形
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
  // コスト＆メタデータ
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

// 6. Supabase `tracks` テーブルの Upsert 用データ
const supabaseRecord = {
  track_id: trackId,
  track_name: finalLyricsPayload.title_ko,
  track_name_en: lyricsData.title_en || trackMeta.track_name,
  artist_name: finalLyricsPayload.artist,
  artist_name_en: trackMeta.artist_name,
  country: "KR",
  genre: trackMeta.genre || "Ballad",
  preview_url: trackMeta.preview_url || null,
  itunes_url: trackMeta.itunes_url || null,
  album_cover: trackMeta.album_cover || null,
  description: finalLyricsPayload.title_ja,
  lyrics: JSON.stringify(finalLyricsPayload),
  updated_at: new Date().toISOString()
};

return [{
  json: {
    supabase_record: supabaseRecord,
    cost_summary: {
      track_id: trackId,
      track_name: finalLyricsPayload.title_ko,
      artist: finalLyricsPayload.artist,
      model: MODEL_NAME,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cost_usd: formattedUsd,
      cost_jpy: formattedJpy,
      message: `💰 今回の生成コスト: 約 ${formattedJpy} (${totalTokens.toLocaleString()} tokens)`
    },
    cost_report_banner: costReportText
  }
}];

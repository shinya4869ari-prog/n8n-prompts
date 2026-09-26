/**
 * 🎵 03_Geminiリクエスト生成_メタデータ完全保持版.js
 * ノード名: 「03_Geminiリクエスト生成」
 * 
 * 【役割】
 * - LRCLIB 公式歌詞レスポンスから歌詞テキストを安全に抽出
 * - アプリ連携ノードから受け取った track_meta を100%保持
 * - 韓国語学習アプリ「K-Learner」仕様の高品質プロンプト（対訳、カタカナルビ、語彙、文法、解説）を生成
 */

let input = $input.first()?.json || {};

// --- 1. track_meta の多重復元（絶対にロストさせないガード） ---
let trackMeta = input.track_meta;
if (!trackMeta || !trackMeta.track_id) {
  try {
    trackMeta = $('01_アプリ連携メタデータ確定 & LRCLIB生成')?.first()?.json?.track_meta ||
                $('01_アプリ連携メタデータ確定_LRCLIB生成')?.first()?.json?.track_meta ||
                $('02_スクショ検索結果確定')?.first()?.json?.track_meta ||
                $('04_ID検索結果確定')?.first()?.json?.track_meta || {};
  } catch (e) {
    trackMeta = {};
  }
}

// 最初の Webhook 入力からもフォールバック復元を試みる
if (!trackMeta.track_id) {
  try {
    const rawWebhook = $('Webhook (アプリ検索結果受信)')?.first()?.json || {};
    const item = rawWebhook.body || rawWebhook;
    const target = Array.isArray(item) ? item[0] : item;
    if (target && (target.track_id || target.id)) {
      trackMeta = {
        track_id: String(target.track_id || target.id),
        track_name: target.title || target.track_name || "",
        track_name_en: target.title || target.track_name || "",
        artist_name: target.artist || target.artist_name || "",
        artist_name_en: target.artist || target.artist_name || "",
        album_name: target.album || "",
        album_cover: (target.artwork_url || "").replace(/\/\d+x\d+bb\./, '/600x600bb.'),
        preview_url: target.preview_url || "",
        itunes_url: target.track_view_url || target.itunes_url || "",
        youtube_id: target.youtube_id || "",
        wikidata_id: target.wikidata_id || target.wiki_data_id || null,
        isrc: target.isrc || null,
        musicbrainz_id: target.musicbrainz_id || null,
        release_date: (target.release_date || "").split('T')[0],
        release_year: target.year || (target.release_date ? target.release_date.split('-')[0] : null),
        genre: target.genre || 'K-POP'
      };
    }
  } catch (e) {}
}

// --- 2. LRCLIB レスポンスからの歌詞抽出 ---
let autoLyrics = "";
let lrcList = [];
if (Array.isArray(input)) {
  lrcList = input;
} else if (input.data && Array.isArray(input.data)) {
  lrcList = input.data;
} else if (Array.isArray($input.all())) {
  lrcList = $input.all().map(i => i.json);
}

const matchedLrc = lrcList.find(item => item && item.plainLyrics && item.plainLyrics.trim().length > 0) || lrcList[0];
if (matchedLrc && matchedLrc.plainLyrics) {
  autoLyrics = matchedLrc.plainLyrics.trim();
}

const trackName = trackMeta.track_name || "";
const artistName = trackMeta.artist_name || "";
const albumName = trackMeta.album_name || "";
const genre = trackMeta.genre || "K-POP";
const releaseDate = trackMeta.release_date || "";

// 手動歌詞の指定があれば優先
let customLyrics = "";
try {
  customLyrics = input.custom_lyrics || $('Webhook (アプリ検索結果受信)')?.first()?.json?.custom_lyrics || "";
} catch (e) {}

let officialLyrics = "";
if (customLyrics && customLyrics.trim().length > 0) {
  officialLyrics = customLyrics.trim();
} else if (autoLyrics && autoLyrics.trim().length > 0) {
  officialLyrics = autoLyrics.trim();
}

const hasOfficialLyrics = (officialLyrics && officialLyrics.trim().length > 0);

// --- 3. Gemini システムプロンプトの構築 ---
const systemInstruction = `あなたは韓国語教育の最高峰エキスパートであり、K-POP・韓国ドラマOSTの歌詞対訳プロフェッショナルです。
韓国語学習アプリ「K-Learner」に格納する、超高品質な「公式歌詞・対訳・語彙・文法」JSONデータを生成してください。

【⚠️ 最重要：公式歌詞の完全性・正確性】
- 本データは【個人利用の語学学習用】です。要約や省略は一切禁止です。
${hasOfficialLyrics 
  ? "- 提供された「公式フル歌詞」を一言一句完全に一致させて出力してください。\n- イントロ、サビ、アウトロまで、公式音源の歌唱順通りにすべてのフレーズを1行も飛ばさず完全収録してください。"
  : "- 韓国の公式音源サイト（Melon, Genie, Bugs等）に登録されている公式歌詞を正確に特定し、1行も省略せず完全収録してください。"}

【厳格な要件】
1. **歌詞行 (sentences)**:
   - 公式歌詞に基づき、1行（1フレーズ）ずつ分解。
   - \`ko\`: 公式ハングル歌詞（一言一句正確に）。
   - \`ja\`: 原文の感情を忠実に活かした、自然で美しい日本語対訳。
   - \`rubi\`: 日本人が自然に発音できる正確なカタカナ発音（連音化・濃音化を反映）。

2. **重要単語 (vocab)**:
   - 歌詞に登場する重要単語・表現（8〜15個程度）。
   - \`word\`, \`hanja\`, \`pos\`, \`meaning\`, \`level\`

3. **重要文法・表現 (grammar)**:
   - 韓国語特有の文末表現・助詞・構文（3〜5個程度）。
   - \`pattern\`, \`meaning\`, \`desc\`

4. **楽曲・歌詞解説 (lyrics_notes)**:
   - メッセージ性、心理描写、語学的なポイントを解説するHTML文字列の配列（2〜3個）。
   - 例: '💬 <strong>心理描写:</strong> ...'

【出力フォーマット】
Markdown記法（\`\`\`json）を含めず、必ず完全な純粋JSONオブジェクトのみを返してください。
{
  "title_ko": "曲名（韓国語ハングル）",
  "title_ja": "曲名（日本語・英語副題）",
  "artist": "アーティスト名",
  "category": "ジャンル・作品名",
  "level": "学習目安レベル",
  "sentences": [
    {
      "ko": "...",
      "rubi": "...",
      "ja": "..."
    }
  ],
  "vocab": [
    {
      "word": "...",
      "hanja": "...",
      "pos": "...",
      "meaning": "...",
      "level": "..."
    }
  ],
  "grammar": [
    {
      "pattern": "...",
      "meaning": "...",
      "desc": "..."
    }
  ],
  "lyrics_notes": [
    "💬 <strong>...:</strong> ..."
  ]
}`;

let userPrompt = `対象楽曲情報:
- 曲名: ${trackName}
- アーティスト: ${artistName}
- アルバム: ${albumName}
- ジャンル: ${genre}
- リリース日: ${releaseDate}`;

if (hasOfficialLyrics) {
  userPrompt += `\n\n【公式フル歌詞テキスト（これを100%忠実に使用してください）】:\n${officialLyrics}\n\n⚠️ 最重要注意事項：上記の公式歌詞を一言一句漏らさず全てsentencesに分解し、対訳・ルビ・語彙・文法を付与して出力してください。AIによる勝手な作詞や言い換え、行の削除・省略は絶対に禁止です。`;
} else {
  userPrompt += `\n\n⚠️ 歌詞APIサーバー混雑のため、あなたの膨大な韓国音楽ナレッジベースから該当楽曲の「韓国語公式フル歌詞」を正確に特定し、1行も省略せず全フレーズをsentencesに分解して、対訳・ルビ・語彙・文法を出力してください。`;
}

const selectedModel = 'gemini-3.8-flash';

// --- 4. 後続（Google Gemini API）への出力 ---
return [{
  json: {
    model: selectedModel,
    track_meta: trackMeta, // ← 確定メタデータを確実に出力に同封
    gemini_request: {
      contents: [
        {
          role: "user",
          parts: [
            { text: systemInstruction + "\n\n" + userPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.0,
        response_mime_type: "application/json"
      }
    }
  }
}];

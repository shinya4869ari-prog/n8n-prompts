/**
 * 🎵 06_iTunesレスポンス解析_Geminiリクエスト生成.js
 * ノード名: 「06_iTunesレスポンス解析_Geminiリクエスト生成」
 * 
 * 【役割】
 * - 確定した楽曲メタデータを受け取る
 * - 韓国語学習アプリ「K-Learner」仕様の超高精度プロンプト（歌詞、対訳、カタカナルビ、語彙、文法、解説）を構築
 */

let input = $input.first()?.json || {};

// 先行ノードからの track_meta 取得（直前が LRCLIB ノードでも先行確定ノードから確実に復元）
let trackMeta = input.track_meta;
if (!trackMeta) {
  try {
    trackMeta = $('02_スクショ検索結果確定')?.item?.json?.track_meta ||
                $('04_ID検索結果確定')?.item?.json?.track_meta || {};
  } catch (e) {
    trackMeta = {};
  }
}

// LRCLIB API レスポンスからの自動歌詞抽出
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

// フォームからの手動歌詞入力があれば取得
let customLyrics = "";
try {
  customLyrics = $('楽曲登録フォーム (スクショ / ID入力)')?.item?.json?.custom_lyrics || "";
} catch (e) {}

// Gemini システムプロンプト
const systemInstruction = `あなたは韓国語教育の最高峰エキスパートであり、K-POP・韓国ドラマOSTの歌詞対訳プロフェッショナルです。
韓国語学習アプリ「K-Learner」に格納する、超高品質な「公式歌詞・対訳・語彙・文法」JSONデータを生成してください。

【⚠️ 最重要：公式歌詞の完全性・勝手な作詞の絶対禁止】
- 本データは【個人利用の語学学習用】です。著作権配慮による要約・一部省略・リピート省略は一切不要であり、厳禁です。
- Melon、Genie、Bugsなどの公式音源サイトに登録されている「公式フル歌詞」を一言一句完全に一致させて出力してください。
- 記憶が曖昧だからといって、AIが途中で勝手に作詞・作文・改変・差し替えを行うことは絶対に許されません。
- イントロ、1番、サビ、2番、ブリッジ（Cメロ）、ラストサビ、アウトロまで、公式音源の歌唱順通りにすべてのフレーズを1行も飛ばさず完全収録してください。

【厳格な要件】
1. **歌詞行 (sentences)**:
   - 公式歌詞に基づき、1行（1フレーズ）ずつ分解してください。
   - \`ko\`: 公式ハングル歌詞（一言一句正確に。勝手な言い換え禁止）。
   - \`ja\`: 原文のニュアンス・感情・口語表現を忠実に活かした、自然で美しい日本語対訳。
   - \`rubi\`: 日本人が自然に発音できる正確なカタカナ発音（連音化・濃音化・鼻音化などの音韻変化を反映）。

2. **重要単語 (vocab)**:
   - 歌詞に登場する重要な単語・表現（8〜15個程度）。
   - \`word\`: 歌詞中の表記または原形。
   - \`hanja\`: 漢字語の場合は漢字表記（固有語は '―'）。
   - \`pos\`: 品詞（名詞、動詞、形容詞など）。
   - \`meaning\`: 日本語の意味。
   - \`level\`: 難易度（初級 / 中級 / 上級 / TOPIK等）。

3. **重要文法・表現 (grammar)**:
   - 歌詞に登場する韓国語特有の文末表現・助詞・構文（3〜5個程度）。
   - \`pattern\`: パターン（例: '~(으)ㄴ 채로'）。
   - \`meaning\`: 日本語意味。
   - \`desc\`: ニュアンスや使われ方の簡潔な解説。

4. **楽曲・歌詞解説 (lyrics_notes)**:
   - 楽曲のメッセージ性、歌詞に込められた心理描写、語学的なポイントを解説するHTML文字列の配列（2〜3個）。
   - 例: '💬 <strong>心理描写:</strong> ...'

【出力フォーマット】
マークダウン装飾（\`\`\`json）を含めず、必ず以下の完全な純粋JSONオブジェクトのみを返してください。
{
  "title_ko": "曲名（韓国語ハングル）",
  "title_ja": "曲名（日本語・英語副題）",
  "artist": "アーティスト名",
  "category": "ジャンル・作品名（例: K-POP / アルバム名）",
  "level": "学習目安レベル（例: 初中級・日常感情表現）",
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

let officialLyrics = "";
if (customLyrics && customLyrics.trim().length > 0) {
  officialLyrics = customLyrics.trim();
} else if (autoLyrics && autoLyrics.trim().length > 0) {
  officialLyrics = autoLyrics.trim();
}

if (!officialLyrics || officialLyrics.trim().length === 0) {
  throw new Error(`⚠️ 公式歌詞が取得できませんでした（曲名: ${trackName} / 歌手: ${artistName}）。\nAIによる勝手な作詞・ハルシネーションを防ぐため、処理を即座に停止しました。\n曲名・歌手名の表記を確認するか、少し待って再実行してください。`);
}

userPrompt += `\n\n【公式フル歌詞テキスト（これを100%忠実に使用してください）】:\n${officialLyrics}\n\n⚠️ 最重要注意事項：上記の公式歌詞を一言一句漏らさず全てsentencesに分解し、対訳・ルビ・語彙・文法を付与して出力してください。AIによる勝手な作詞や言い換え、行の削除・省略は絶対に禁止です。`;

return [{
  json: {
    track_meta: trackMeta,
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

/**
 * 🎵 02_iTunesレスポンス解析_Geminiリクエスト生成.js
 * 
 * 【役割】
 * - HTTP Request (iTunes API) のレスポンスを解析
 * - 曲名・アーティスト名・アルバム名・600x600高画質ジャケット・試聴音源URLを抽出
 * - 韓国語学習アプリ（Korean-Learner）に最適化したAI（Gemini）プロンプトを構築
 */

const input = $input.first()?.json || {};
const results = input.results || [];

if (results.length === 0) {
  throw new Error(`iTunes APIで楽曲が見つかりませんでした。track_id: ${input.target_track_id || '不明'}`);
}

const track = results[0];

const trackId = String(track.trackId || input.target_track_id);
const trackName = track.trackName || "";
const artistName = track.artistName || "";
const albumName = track.collectionName || "";
const releaseDate = track.releaseDate ? track.releaseDate.split('T')[0] : "";
const previewUrl = track.previewUrl || "";
const itunesUrl = track.trackViewUrl || "";
// 100x100 から 600x600 の高解像度ジャケットに置換
const albumCover = (track.artworkUrl100 || "").replace('100x100bb', '600x600bb');
const genre = track.primaryGenreName || "K-POP";

// 🎯 Gemini に送るシステムプロンプト & 指示
const systemInstruction = `あなたは韓国語教育の最高峰エキスパートであり、K-POP・韓国ドラマOSTの歌詞対訳プロフェッショナルです。
韓国語学習アプリ「K-Learner」に格納する、超高品質な「歌詞・対訳・語彙・文法」JSONデータを生成してください。

【厳格な要件】
1. **歌詞行 (sentences)**:
   - 韓国の公式歌詞に基づき、1行（1フレーズ）ずつ分解してください。
   - \`ko\`: 正確な韓国語ハングル歌詞。
   - \`ja\`: 原文のニュアンス・感情・口語表現を忠実に活かした、自然で美しい日本語対訳。直訳すぎて不自然になったり、意訳しすぎてハングルと乖離しないよう、文節単位の対応が取れる自然な日本語にしてください。
   - \`rubi\`: 日本人が自然に発音できる正確なカタカナ発音（連音化・濃音化・鼻音化・流音化などの音韻変化を反映）。

2. **重要単語 (vocab)**:
   - 歌詞に登場する重要な単語・表現（8〜15個程度）。
   - \`word\`: 歌詞中の表記または原形（活用形の場合は原形も補足）。
   - \`hanja\`: 漢字語の場合は漢字表記（固有語は '―'）。
   - \`pos\`: 品詞（名詞、動詞、形容詞、副詞など）。
   - \`meaning\`: 日本語の意味（歌詞の文脈に合ったニュアンス）。
   - \`level\`: 難易度（初級 / 中級 / 上級 / TOPIK 3級 / 日常口語 など）。
   ※アプリの「単語ホバー（Tango Hover）」機能でハイライト連動するため、sentences内の単語と表記が綺麗に一致するようにしてください。

3. **重要文法・表現 (grammar)**:
   - 歌詞に登場する韓国語特有の文末表現・助詞・構文（3〜5個程度）。
   - \`pattern\`: パターン（例: '~(으)ㄴ 채로', '~다가도', '~마저'）。
   - \`meaning\`: 日本語意味。
   - \`desc\`: ニュアンスや使われ方の簡潔な解説。

4. **楽曲・歌詞解説 (lyrics_notes)**:
   - 楽曲のメッセージ性、歌詞に込められた心理描写、語学的なポイントを解説するHTML文字列の配列（2〜3個）。
   - 例: '💬 <strong>「버릇처럼（癖のように）」の心理描写:</strong> ...'

【出力フォーマット】
マークダウン装飾（\`\`\`json）を含めず、必ず以下の完全な純粋JSONオブジェクトのみを返してください。
{
  "title_ko": "曲名（韓国語）",
  "title_ja": "曲名（日本語・邦題・英語副題）",
  "artist": "アーティスト名",
  "category": "ジャンル・作品名（例: ドラマ『太陽の末裔』OST / K-POP）",
  "level": "学習目安レベル（例: 中級・感情口語表現）",
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

const userPrompt = `対象楽曲情報:
- 曲名: ${trackName}
- アーティスト: ${artistName}
- アルバム: ${albumName}
- ジャンル: ${genre}
- リリース日: ${releaseDate}

この楽曲のフル歌詞を取得し、上記の要件に従って「K-Learner」用の最高品質な歌詞対訳・語学学習JSONを出力してください。`;

return [{
  json: {
    track_meta: {
      track_id: trackId,
      track_name: trackName,
      artist_name: artistName,
      album_name: albumName,
      album_cover: albumCover,
      preview_url: previewUrl,
      itunes_url: itunesUrl,
      release_date: releaseDate,
      genre: genre
    },
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
        temperature: 0.2,
        response_mime_type: "application/json"
      }
    }
  }
}];

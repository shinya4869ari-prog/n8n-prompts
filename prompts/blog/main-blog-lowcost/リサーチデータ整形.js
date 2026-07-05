// === ブロック1: 入力データの取得と初期化 ===
// 前段の映画検索ノードから届いたすべてのデータを取得します。
const items = $input.all(); 
let results = [];
let seenTitles = new Set();

// テキスト内からJSON部分を抽出してパースする内部関数です。
function forceParseJSON(text) {
  if (!text || typeof text !== 'string') return null;
  let clean = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const pureJsonText = clean.substring(firstBrace, lastBrace + 1);
    try { return JSON.parse(pureJsonText); } catch (e) { return null; }
  }
  return null;
}

// === ブロック2: データのパースと映画リストの統合 ===
// 映画検索結果のテキスト（output）を解析し、リスト化します。
for (const item of items) {
  const rawText = item.json.output;
  if (!rawText) continue;

  const data = forceParseJSON(rawText);
  if (!data) continue;

  let allMovies = [];
  if (Array.isArray(data.映像作品)) allMovies.push(...data.映像作品);
  if (Array.isArray(data.おすすめ映画ランキング)) allMovies.push(...data.おすすめ映画ランキング);

  // === ブロック3: 重複排除と出力フォーマットの整形 ===
  // タイトルの重複を削り、後続のAIノードに引き渡す枠組みを作ります。
  for (const movie of allMovies) {
    const title = movie.タイトル_日本語 || "タイトル不明";
    
    if (title !== "タイトル不明" && !seenTitles.has(title)) {
      seenTitles.add(title);

      // 公開年（制作年）を数値に変換（例："2023年" -> 2023）
      const rawYear = movie.公開年 || movie.year || "";
      const parsedYear = parseInt(String(rawYear).replace(/[^0-9]/g, '')) || null;

      results.push({
        json: {
          title: title,
          director: movie.director || "監督不明",
          cast: movie.cast || "出演者不明",
          origin_title: movie.原題 || "原題不明",
          poster_path: movie.poster_path || "",
          country: data.country || "",
          overview: movie.あらすじ || movie.overview || "",
          tmdb_id: movie.tmdb_id ? parseInt(movie.tmdb_id) : 0, // ★ nullエラー防止のため、IDが無い場合は0を指定
          imdb_url: movie.imdb_url || "",
          year: parsedYear // ★ 追加：制作年数（公開年）
        }
      });
    }
  }
}

// === ブロック4: 整形済みリストの出力 ===
return results;
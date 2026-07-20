// === ブロック1: 入力データの取得と初期化 ===
// 前段の映画検索ノードから届いたすべてのデータを取得します。
const items = $input.all(); 
let results = [];
let seenTitles = new Set();

// テキスト内からJSON部分を抽出してパースする内部関数です。
function forceParseJSON(text) {
  if (!text) return null;
  if (typeof text === 'object') return text;
  if (typeof text !== 'string') return null;
  let clean = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  
  if (firstBracket !== -1 && lastBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    try { return JSON.parse(clean.substring(firstBracket, lastBracket + 1)); } catch (e) {}
  }
  if (firstBrace !== -1 && lastBrace !== -1) {
    try { return JSON.parse(clean.substring(firstBrace, lastBrace + 1)); } catch (e) {}
  }
  return null;
}

// === ブロック2: データのパースと映画リストの統合 ===
// 映画検索結果のテキスト（output）を解析し、リスト化します。
let allMovies = [];

for (const item of items) {
  if (item.json && (item.json.title || item.json.タイトル_日本語 || item.json.origin_title || item.json.tmdb_id)) {
    allMovies.push(item.json);
    continue;
  }

  const rawText = item.json?.output ?? (typeof item.json?.message === 'object' ? item.json.message?.content : item.json?.message) ?? item.json?.text ?? (typeof item.json === 'string' ? item.json : JSON.stringify(item.json));
  if (!rawText) continue;

  const data = forceParseJSON(rawText);
  if (!data) continue;

  if (Array.isArray(data)) {
    allMovies.push(...data);
  } else if (typeof data === 'object' && data !== null) {
    if (data.title || data.タイトル_日本語) {
      allMovies.push(data);
    }
    if (Array.isArray(data.映像作品)) allMovies.push(...data.映像作品);
    if (Array.isArray(data.おすすめ映画)) allMovies.push(...data.おすすめ映画);
    if (Array.isArray(data.おすすめ映画ランキング)) allMovies.push(...data.おすすめ映画ランキング);
    if (Array.isArray(data.movies)) allMovies.push(...data.movies);
    if (Array.isArray(data.映画)) allMovies.push(...data.映画);
    
    for (const key in data) {
      if (Array.isArray(data[key])) {
        allMovies.push(...data[key]);
      }
    }
  }
}

// === ブロック3: 重複排除と出力フォーマットの整形 ===
// タイトルの重複を削り、後続のAIノードに引き渡す枠組みを作ります。
for (const movie of allMovies) {
  const title = movie.タイトル_日本語 || movie.title || movie.name || movie.title_ja || "タイトル不明";
  
  if (title !== "タイトル不明" && !seenTitles.has(title)) {
    seenTitles.add(title);

    const rawYear = movie.公開年 || movie.year || movie.release_date || "";
    const parsedYear = parseInt(String(rawYear).replace(/[^0-9]/g, '')) || null;

    results.push({
      json: {
        title: title,
        director: movie.director || movie.director_name || movie.監督 || "監督不明",
        cast: movie.cast || movie.キャスト || movie.出演 || "出演者不明",
        origin_title: movie.原題 || movie.origin_title || "原題不明",
        poster_path: movie.poster_url || movie.poster_path || "",
        country: movie.country || movie.target_country || "",
        overview: movie.あらすじ || movie.overview || movie.ai_summary || "",
        tmdb_id: movie.tmdb_id ? parseInt(movie.tmdb_id) : 0,
        imdb_url: movie.imdb_url || (movie.wikidata_id ? `https://www.imdb.com/title/${movie.wikidata_id}/` : ""),
        year: parsedYear,
        wikidata_id: movie.wikidata_id || null,
        ai_summary: movie.ai_summary || null
      }
    });
  }
}

// === ブロック4: 整形済みリストの出力 ===
return results;
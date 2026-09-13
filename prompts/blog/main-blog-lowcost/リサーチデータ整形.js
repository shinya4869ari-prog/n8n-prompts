// === ブロック1: 入力データの取得と初期化 ===
// 前段の映画検索ノード（またはコスト計算ノード）から届いたデータを取得します。
const items = $input.all(); 
let results = [];
let seenTitles = new Set();

// テキスト内からJSON部分を抽出してパースする内部関数
function forceParseJSON(text) {
  if (!text) return null;
  if (typeof text === 'object') return text; // 既にパース済みの場合はそのまま返却
  if (typeof text !== 'string') return null;

  let clean = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  // マークダウン記号の除去
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // 1. そのままパース試行
  try { return JSON.parse(clean); } catch (e) {}

  // 2. オブジェクト { ... } の切り出し
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(clean.substring(firstBrace, lastBrace + 1)); } catch (e) {}
  }

  // 3. 配列 [ ... ] の切り出し
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try { return JSON.parse(clean.substring(firstBracket, lastBracket + 1)); } catch (e) {}
  }

  return null;
}

// === ブロック2: データのパースと映画リストの統合 ===
for (const item of items) {
  const json = item.json || {};

  // 1. テキスト抽出（Geminiの content.parts[0].text を最優先）
  let rawText = json.content?.parts?.[0]?.text
             ?? json.output
             ?? (typeof json.message === 'object' ? json.message?.content : json.message)
             ?? json.text
             ?? '';

  let data = null;

  // すでにパース済みオブジェクトのキーとして存在する場合
  if (Array.isArray(json.映像作品)) {
    data = json;
  } else if (Array.isArray(json.movies)) {
    data = json;
  } else if (rawText) {
    data = forceParseJSON(rawText);
  } else {
    // 最終手段として item.json 全体をパース試行
    data = forceParseJSON(JSON.stringify(json));
  }

  if (!data) continue;

  let allMovies = [];
  
  // データ自体が配列の場合
  if (Array.isArray(data)) {
    allMovies.push(...data);
  } else if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data.映像作品)) allMovies.push(...data.映像作品);
    else if (Array.isArray(data.おすすめ映画ランキング)) allMovies.push(...data.おすすめ映画ランキング);
    else if (Array.isArray(data.movies)) allMovies.push(...data.movies);
    else if (Array.isArray(data.映画)) allMovies.push(...data.映画);
    
    // それでも見つからない場合、オブジェクト内の配列を片っ端から探索
    if (allMovies.length === 0) {
      for (const key in data) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          allMovies.push(...data[key]);
          break;
        }
      }
    }
  }

  // 国名の取得
  let countryName = data.country || json.country || "";
  if (!countryName) {
    try { countryName = $('PromptLoader').first()?.json?.country || ""; } catch(e) {}
  }

  // === ブロック3: 重複排除と出力フォーマットの整形 ===
  for (const movie of allMovies) {
    if (!movie || typeof movie !== 'object') continue;

    const title = movie.タイトル_日本語 || movie.title || movie.タイトル || "タイトル不明";
    
    if (title !== "タイトル不明" && !seenTitles.has(title)) {
      seenTitles.add(title);

      // 公開年（制作年）を数値に変換（例："2023年" -> 2023）
      const rawYear = movie.公開年 || movie.year || movie.制作年 || "";
      const parsedYear = parseInt(String(rawYear).replace(/[^0-9]/g, '')) || null;

      results.push({
        json: {
          title: title,
          director: movie.director || movie.監督 || "監督不明",
          cast: movie.cast || movie.出演 || "出演者不明",
          origin_title: movie.原題 || movie.origin_title || title,
          poster_url: movie.poster_url || movie.poster_path || "",
          country: countryName,
          overview: movie.あらすじ || movie.overview || "",
          tmdb_id: movie.tmdb_id ? parseInt(movie.tmdb_id) : 0,
          imdb_url: movie.imdb_url || "",
          year: parsedYear,
          wikidata_id: movie.wikidata_id || null,
          related_event: movie.関連事件 || movie.related_event || "",
          historical_significance: movie.歴史クロス解説 || movie.historical_significance || "",
          type: movie.種別 || movie.type || "映画",
          is_serious: movie.is_serious !== undefined ? movie.is_serious : true
        }
      });
    }
  }
}

// === ブロック4: 整形済みリストの出力 ===
return results;
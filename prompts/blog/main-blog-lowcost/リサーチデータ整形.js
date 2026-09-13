// === リサーチデータ整形（超堅牢・AI出力全対応版） ===
const items = $input.all();
let results = [];
let seenTitles = new Set();

// --- JSON超強力パース関数 ---
function forceParseJSON(text) {
  if (!text) return null;
  if (typeof text === 'object') return text;
  if (typeof text !== 'string') return null;

  let clean = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();

  // 1. ```json ... ``` のマークダウンブロックを最優先抽出
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (mdMatch && mdMatch[1]) {
    try { return JSON.parse(mdMatch[1].trim()); } catch(e) {}
  }

  // 2. そのままパース
  try { return JSON.parse(clean); } catch(e) {}

  // 3. { ... } オブジェクト切り出し
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(clean.substring(firstBrace, lastBrace + 1)); } catch(e) {}
  }

  // 4. [ ... ] 配列切り出し
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try { return JSON.parse(clean.substring(firstBracket, lastBracket + 1)); } catch(e) {}
  }

  return null;
}

// --- 映画配列（Array）をオブジェクト内のどこからでも救出する関数 ---
function extractMoviesArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data !== 'object') return [];

  // 代表的なキー候補
  const candidateKeys = [
    '映像作品', 'movies', '映画', 'おすすめ映画ランキング', 
    '作品', '作品リスト', '映画リスト', 'recommendations', 'items', 'list'
  ];
  for (const k of candidateKeys) {
    if (Array.isArray(data[k]) && data[k].length > 0) return data[k];
  }

  // オブジェクト内のすべてのプロパティを探索
  for (const k of Object.keys(data)) {
    if (Array.isArray(data[k]) && data[k].length > 0) {
      // 配列の要素がオブジェクトなら映画リストとみなす
      if (typeof data[k][0] === 'object') return data[k];
    }
  }

  return [];
}

// === メイン処理 ===
for (const item of items) {
  const json = item.json || {};

  // 1. テキスト抽出（あらゆるGemini/n8n出力構造を網羅）
  let rawText = '';
  if (json.content?.parts?.[0]?.text) {
    rawText = json.content.parts[0].text;
  } else if (json.output) {
    rawText = typeof json.output === 'string' ? json.output : JSON.stringify(json.output);
  } else if (typeof json.message === 'object' && json.message?.content) {
    rawText = json.message.content;
  } else if (typeof json.message === 'string') {
    rawText = json.message;
  } else if (json.text) {
    rawText = json.text;
  } else if (json.response?.text) {
    rawText = json.response.text;
  } else if (typeof json === 'string') {
    rawText = json;
  } else {
    rawText = JSON.stringify(json);
  }

  // 2. パース
  let data = null;
  if (Array.isArray(json.映像作品) || Array.isArray(json.movies)) {
    data = json;
  } else if (rawText) {
    data = forceParseJSON(rawText);
  }

  // 3. 映画配列の救出
  let allMovies = extractMoviesArray(data);

  // もし救出できなかった場合の最終フォールバック（item.json直下をスキャン）
  if (allMovies.length === 0) {
    allMovies = extractMoviesArray(json);
  }

  // 国名の取得
  let countryName = data?.country || json.country || "";
  if (!countryName) {
    try { countryName = $('PromptLoader').first()?.json?.country || ""; } catch(e) {}
  }

  // 4. 出力フォーマットの整形
  for (const movie of allMovies) {
    if (!movie || typeof movie !== 'object') continue;

    // タイトルキーの超柔軟取得
    const title = movie.タイトル_日本語 
               || movie.title 
               || movie.タイトル 
               || movie.邦題 
               || movie.原題 
               || movie.name 
               || movie.映画名
               || Object.values(movie).find(v => typeof v === 'string' && v.length > 0)
               || "タイトル不明";

    if (title !== "タイトル不明" && !seenTitles.has(title)) {
      seenTitles.add(title);

      // 公開年を数値に変換（例："2012年" -> 2012）
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
          overview: movie.あらすじ || movie.overview || movie.歴史クロス解説 || "",
          tmdb_id: movie.tmdb_id ? parseInt(movie.tmdb_id) : 0,
          imdb_url: movie.imdb_url || "",
          year: parsedYear,
          wikidata_id: movie.wikidata_id || null,
          related_event: movie.関連事件 || movie.related_event || "",
          historical_significance: movie.歴史クロス解説 || movie.historical_significance || movie.overview || "",
          type: movie.種別 || movie.type || "映画",
          is_serious: movie.is_serious !== undefined ? movie.is_serious : true
        }
      });
    }
  }
}

// もし1件も取れなかった場合、後続が落ちないようにデバッグ情報を1件返却（原因がすぐわかる）
if (results.length === 0) {
  const sampleJson = items[0]?.json || {};
  return [{
    json: {
      _ERROR: "映画リストの抽出に失敗しました（入力データの形式を確認してください）",
      received_keys: Object.keys(sampleJson),
      received_snippet: JSON.stringify(sampleJson).substring(0, 300)
    }
  }];
}

return results;
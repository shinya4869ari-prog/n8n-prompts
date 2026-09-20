// === リサーチデータ整形（Supabaseキャッシュ & Gemini直接出力 完全両対応版） ===
const items = $input.all();
let results = [];
let seenTitles = new Set();

// --- JSON安全パース関数 ---
function safeParse(val) {
  if (!val) return null;
  if (typeof val === 'object') return val;
  if (typeof val !== 'string') return null;

  let clean = val.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // 1. そのままパース
  try { return JSON.parse(clean); } catch (e) {}

  // 2. { ... } オブジェクト切り出し
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(clean.substring(firstBrace, lastBrace + 1)); } catch (e) {}
  }

  // 3. [ ... ] 配列切り出し
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    try { return JSON.parse(clean.substring(firstBracket, lastBracket + 1)); } catch (e) {}
  }

  return null;
}

// === メイン処理 ===
// ワークフロー全体から共通の国名を取得（フォールバック用）
let fallbackCountry = "";
try { fallbackCountry = $('PromptLoader').first()?.json?.country || $('国名変換Code').first()?.json?.country || ""; } catch(e) {}

for (const item of items) {
  const json = item.json || {};

  // 1. 映画データが含まれるターゲットの特定（優先順位順）
  let rawSource = json.research25 
               || json.content?.parts?.[0]?.text 
               || json.output 
               || json.text 
               || json.message?.content 
               || json.message
               || json;

  // 2. パース実行
  let parsed = safeParse(rawSource);
  if (!parsed && typeof rawSource === 'object') {
    parsed = rawSource;
  }

  // 国名の特定（パース後オブジェクト ➜ 入力JSON ➜ フォールバック）
  const resolvedCountry = parsed?.country 
                       || json.country 
                       || fallbackCountry 
                       || "インドネシア";

  // 3. 映画配列（Array）の抽出
  let allMovies = [];
  if (Array.isArray(parsed)) {
    allMovies = parsed;
  } else if (parsed && typeof parsed === 'object') {
    // 既知のキーを探索
    allMovies = parsed.映像作品 
             || parsed.movies 
             || parsed.映画 
             || parsed.おすすめ映画ランキング 
             || parsed.作品 
             || parsed.list 
             || [];

    // もし上記で見つからず、中身に配列があればそれを採用
    if (allMovies.length === 0) {
      for (const k of Object.keys(parsed)) {
        if (Array.isArray(parsed[k]) && parsed[k].length > 0 && typeof parsed[k][0] === 'object') {
          allMovies = parsed[k];
          break;
        }
      }
    }
  }

  // 4. 映画1本ごとのオブジェクト整形
  for (const movie of allMovies) {
    if (!movie || typeof movie !== 'object') continue;

    const title = movie.タイトル_日本語 
               || movie.title 
               || movie.タイトル 
               || movie.邦題 
               || movie.原題 
               || movie.name 
               || "タイトル不明";

    if (title !== "タイトル不明" && !seenTitles.has(title)) {
      seenTitles.add(title);

      // 公開年を数値に変換（例："2012年" -> 2012）
      const rawYear = movie.公開年 || movie.year || movie.制作年 || "";
      const parsedYear = parseInt(String(rawYear).replace(/[^0-9]/g, '')) || null;

      results.push({
        json: {
          title: title,
          director: movie.監督 || movie.director || "監督不明",
          cast: movie.メインキャスト || movie.cast || movie.キャスト || movie.出演 || "出演者不明",
          origin_title: movie.原題 || movie.origin_title || title,
          poster_url: movie.poster_url || movie.poster_path || movie.ポスター || movie.poster || "",
          country: movie.country || resolvedCountry,
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

return results;
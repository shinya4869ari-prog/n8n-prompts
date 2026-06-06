// === ブロック1: 映画リストとAI解説の2つを取得 ===
// 重複排除した最初の映画リスト（タイトル、監督、キャスト等が入っているノード）
const movieRecords = $("リサーチデータ整形").all(); 

// 直前のAI Agentが検索して出してきた16件の解説文（output）
const aiOutputs = $input.all(); 

let results = [];

// === ブロック2: 上から順番に同じ位置のデータを結合 ===
for (let i = 0; i < movieRecords.length; i++) {
  
  const movie = movieRecords[i].json;
  // 対応する位置のAI解説（output）を取得
  const aiExplanation = aiOutputs[i] ? aiOutputs[i].json.output : "";

  // === ブロック3: 1つの綺麗なオブジェクトにまとめる ===
  results.push({
    json: {
      title: movie.title || "タイトル不明",
      director: movie.director || "監督不明",
      cast: movie.cast || "出演者不明",
      origin_title: movie.origin_title || "原題不明",
      poster_path: movie.poster_path || "",
      country: movie.country || "",
      overview: aiExplanation
    }
  });
}

// === ブロック4: 整形完了した16件をSupabaseへ引き渡し ===
return results;
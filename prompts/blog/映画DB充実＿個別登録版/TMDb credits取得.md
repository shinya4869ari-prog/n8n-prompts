【TMDb credits取得 (HTTP Request ノード) 用設定】

400エラーの原因: URLに `?` を直書きしたことでn8nのQuery Parametersと重複したため。
URLから `?` を外し、n8nの Query Parameters 欄で `append_to_response` を指定します。

---

### 1. URL 欄（末尾の ? 以降を削除）

```text
https://api.themoviedb.org/3/{{
  (() => {
    if ($json.id) {
      const type = $json.media_type || ($json.name ? 'tv' : 'movie');
      return `${type}/${$json.id}`;
    }

    const results = $json.results || $json.movie_results || $json.tv_results || [];
    if (results.length === 0) return 'movie/0';
    
    let sourceNode = {};
    try { sourceNode = $('映画ごとにループ実行').item?.json || {}; } catch(e) {
      try { sourceNode = $('Loop Over Items').item?.json || {}; } catch(e2) {
        sourceNode = $input.item?.json || {};
      }
    }
    const targetTitle = (sourceNode.origin_title || sourceNode.title || '').toLowerCase().trim();
    const targetYear = parseInt(sourceNode.year);
    
    let bestMatch = results[0];
    let bestScore = -Infinity;
    
    for (const movie of results) {
      let score = 0;
      const movieTitle = (movie.title || movie.name || '').toLowerCase().trim();
      const movieOrigTitle = (movie.original_title || movie.original_name || '').toLowerCase().trim();
      
      if (movieTitle === targetTitle || movieOrigTitle === targetTitle) {
        score += 100;
      } else if (movieTitle.includes(targetTitle) || movieOrigTitle.includes(targetTitle)) {
        score += 50;
      }
      
      const rDate = movie.release_date || movie.first_air_date;
      if (targetYear && rDate) {
        const releaseYear = parseInt(rDate.substring(0, 4));
        if (releaseYear) {
          const diff = Math.abs(releaseYear - targetYear);
          score += Math.max(0, 50 - diff * 10);
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = movie;
      }
    }
    
    const mediaType = bestMatch.media_type || (bestMatch.name && !bestMatch.title ? 'tv' : 'movie');
    return `${mediaType}/${bestMatch.id}`;
  })()
}}
```

---

### 2. Query Parameters 欄（n8n画面内のパラメータ追加）

`TMDb credits取得` ノードの **Query Parameters**（クエリパラメータ）に項目を追加します：

* **Name**: `append_to_response`
* **Value**: `credits,external_ids,videos`

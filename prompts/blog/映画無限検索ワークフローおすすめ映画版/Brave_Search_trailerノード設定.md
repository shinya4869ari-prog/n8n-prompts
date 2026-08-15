# Brave Search_trailer ノード設定 (HTTP Request / Brave Search)

## 📌 概要
映画のタイトルと原題を使って YouTube の公式予告編動画（Trailer）URL を検索します。

---

## 🛠️ 検索クエリ Expression

Brave Search ノードの `Query` 入力欄（または `q` パラメータ）に以下の Expression を設定します。

```javascript
{{
  (() => {
    let tmdb = {};
    let sourceData = {};
    try {
      tmdb = $('TMDb検索').first().json;
    } catch(e) {
      try {
        tmdb = $('Get TMDb Details').first().json;
      } catch(e2) {}
    }
    try {
      sourceData = $('映画ごとにループ実行').item.json;
    } catch(e) {
      try {
        sourceData = $('Loop Over Items').item.json;
      } catch(e2) {
        sourceData = $json;
      }
    }
    
    const resultsList = tmdb.results || tmdb.movie_results || (tmdb.id ? [tmdb] : []);
    let result = resultsList.length > 0 ? resultsList.find(m => 
      (m.original_language === sourceData.target_lang) || 
      (m.origin_country && m.origin_country.includes(sourceData.target_country))
    ) : null;
    
    if (!result && resultsList.length > 0) {
      result = resultsList[0];
    }
    
    const inputTitle = sourceData.title;
    const officialTitle = result?.title;
    const resolvedTitle = (/^\d+$/.test(inputTitle || '') ? null : inputTitle) || officialTitle || '';
    const originalTitle = result?.original_title || '';
    
    // タイトルと原題が同じ場合は重複を排除し、末尾に '予告編 youtube' を付与して動画リンクを確実にヒットさせる
    if (!originalTitle || originalTitle.toLowerCase() === resolvedTitle.toLowerCase()) {
      return `${resolvedTitle} 予告編 youtube`;
    }
    
    return `${resolvedTitle} ${originalTitle} 予告編 youtube`;
  })()
}}
```

---

## 🎯 検索結果の検証
- クエリ `군체 予告編 youtube` により、**公式 YouTube 予告編 `https://www.youtube.com/watch?v=FJ7uhPAAno8`（ヨン・サンホ監督、チョン・ジヒョン主演）** を 1 位で確実に引き当てることを確認済み。

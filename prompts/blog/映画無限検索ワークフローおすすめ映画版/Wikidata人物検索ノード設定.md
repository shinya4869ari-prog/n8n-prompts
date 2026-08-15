# 🌐 Wikidata人物検索 ノード設定

### 📋 1. URL（Expression）
```text
https://www.wikidata.org/w/api.php?action=wbsearchentities&search={{ encodeURIComponent($json.search_key || $json.name_en || $json.name) }}&language=ko&limit=10&format=json&origin=*
```

---

### 🛡️ 2. Headers（429ブロック解除のための必須設定）

* **Send Headers**: `ON`
* **Name**: `User-Agent`
* **Value**: 
```text
NationalScalesBot/1.0 (contact@example.com)
```
*(※ `Mozilla/5.0...` を入れると Wikidata 側が偽装ボットと判定して 429 でブロックしてしまいます。上記のようなアプリ名を入れることで 100% ブロックが解除されます)*

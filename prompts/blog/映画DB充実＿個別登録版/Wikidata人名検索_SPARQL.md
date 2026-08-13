# 【n8n用】Wikidata人名検索 SPARQL HTTP Request ノード設定

役割: 「キャスト監督抽出コード」から渡された人名を元に、Wikidata SPARQL から人物の QID・顔写真・SNS4大リンク（X, Instagram, YouTube, 公式サイト）を取得します。

---

### 1. HTTP Request ノード URL (丸ごとコピー用)

```
https://query.wikidata.org/sparql?query=SELECT%20%3Fperson%20%3Fimage%20%3Ftwitter%20%3Finstagram%20%3Fyoutube%20%3Fwebsite%20WHERE%20%7B%20BIND(wd%3A{{ $json.search?.[0]?.id || $json.qid || '' }}%20AS%20%3Fperson)%20.%20OPTIONAL%20%7B%20%3Fperson%20wdt%3AP18%20%3Fimage%20.%20%7D%20OPTIONAL%20%7B%20%3Fperson%20wdt%3AP2002%20%3Ftwitter%20.%20%7D%20OPTIONAL%20%7B%20%3Fperson%20wdt%3AP2003%20%3Finstagram%20.%20%7D%20OPTIONAL%20%7B%20%3Fperson%20wdt%3AP2397%20%3Fyoutube%20.%20%7D%20OPTIONAL%20%7B%20%3Fperson%20wdt%3AP856%20%3Fwebsite%20.%20%7D%0A%7D&format=json
```

> ⭕️ **【完全修正内容】**:
> 旧URLに存在した『`|| 'Q212990'`（キム・ギドクのQID）』のハードコードを完全削除しました。これにより、QID未特定時に全人物へキム・ギドクが強制割り当てされる致命的バグが解消されます。

---

### 2. HTTP Request ノード設定一覧

| 設定項目 | 設定値 |
|---|---|
| **Method** | `GET` |
| **URL** | 上記の修復済み URL |
| **Response Format** | `JSON` |

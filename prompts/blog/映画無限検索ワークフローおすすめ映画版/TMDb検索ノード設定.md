# TMDb検索 ノード設定 (HTTP Request)

## 📌 概要
ループから受け取った `tmdb_id` を使って、TMDb API から映画の詳細メタデータ（ジャンル・ポスター・各言語の公式あらすじ翻訳・**本物のWikidata ID**）を一括取得します。

---

## 🛠️ ノード設定パラメータ

| 設定項目 | 設定値 |
| :--- | :--- |
| **Method** | `GET` |
| **URL** | `https://api.themoviedb.org/3/movie/{{ $json.tmdb_id }}` |
| **Authentication** | `Generic Credential Type` ➡️ `Query Auth` (TMDb APIキー) |
| **Send Query Parameters** | `ON` (Using JSON) |

### Query Parameters (JSON):
```json
{
  "language": "ja-JP",
  "append_to_response": "translations,external_ids"
}
```

---

## 💡 設計のポイント
1. **`translations` (多言語あらすじ・タイトル翻訳)**:
   - 日本語版（`ja-JP`）が未登録の場合でも、**韓国語（`ko`）や英語（`en`）の公式あらすじを 1 回のリクエストで一括取得** できます。
   - 後続の AI（Claude）に渡して高品質な日本語あらすじを生成させることができます。

2. **`external_ids` (本物の Wikidata ID & IMDb ID)**:
   - TMDb が連携している **本物の Wikidata ID（例: `Q117320099`）** が自動でレスポンスに含まれるため、ダミーIDではなく本物の QID を Supabase に保存できます！

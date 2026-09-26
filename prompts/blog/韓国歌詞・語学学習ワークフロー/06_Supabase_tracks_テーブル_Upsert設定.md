# 💾 06 Supabase tracks テーブル Upsert（ノード設定仕様書）

このノードは **JavaScript（Codeノード）ではなく、n8n の標準「HTTP Request」ノード** です。  
手前の「05_Supabase整形 & コスト算出」ノードから渡された楽曲データを、Supabase の `tracks` テーブルへ **Upsert（新規追加 または 重複時上書き）** します。

---

## 📌 ノード基本情報
- **ノード種類**: `HTTP Request`
- **ノード名**: `06_Supabase tracks テーブル Upsert`
- **入力元**: `05_Supabase整形 & コスト算出` から接続

---

## ⚙️ ノードパラメータ設定

| 設定項目 | 設定値 | 補足説明 |
| :--- | :--- | :--- |
| **Method** | `POST` | Supabase REST API へ送信 |
| **URL** | `={{ $env.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co' }}/rest/v1/tracks` | 環境変数またはSupabaseプロジェクトURL |
| **Send Headers** | `true` (有効) | 下記の4つのヘッダーを設定 |
| **Send Body** | `true` (有効) | |
| **Body Content Type** | `JSON` | |
| **Specify Body** | `Using JSON` | |
| **JSON** | `={{ JSON.stringify($json) }}` | 前のノードから渡されたレコードをそのまま渡す |

---

## 📋 Header Parameters（ヘッダー一覧）

以下の **4つのヘッダー** を必ず設定してください：

```text
Prefer: resolution=merge-duplicates,return=representation
apikey: {{ $env.SUPABASE_SERVICE_ROLE_KEY || $env.SUPABASE_ANON_KEY }}
Authorization: Bearer {{ $env.SUPABASE_SERVICE_ROLE_KEY || $env.SUPABASE_ANON_KEY }}
Content-Type: application/json
```

### 💡 `Prefer: resolution=merge-duplicates,return=representation` とは？
- **`resolution=merge-duplicates`**: 主キー（track_id）が既に存在している場合はエラーにせず最新データで上書き（Upsert）します。
- **`return=representation`**: Supabaseが保存・更新した実際の全レコードデータを**ノードのアウトプット（レスポンス）としてそのまま返します**。これにより、n8nの実行画面や呼び出し元のアプリ側で保存結果を即座に確認できます。

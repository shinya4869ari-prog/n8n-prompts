# 🎵 02 LRCLIB 公式歌詞自動取得 API（ノード設定仕様書）

このノードは **JavaScript（Codeノード）ではなく、n8n の標準「HTTP Request」ノード** です。  
「01_アプリ連携メタデータ確定」で生成された検索URL（`lrclib_search_url`）をもとに、無料歌詞API（LRCLIB）から公式フル歌詞を自動取得します。

---

## 📌 ノード基本情報
- **ノード種類**: `HTTP Request`
- **ノード名**: `02_LRCLIB 公式歌詞自動取得 API`
- **入力元**: `01_アプリ連携メタデータ確定 & LRCLIB生成` から接続
- **出力先**: `03_Gemini 教材生成プロンプト構築` へ接続

---

## ⚙️ ノードパラメータ設定

| 設定項目 | 設定値 | 補足説明 |
| :--- | :--- | :--- |
| **Method** | `GET` | |
| **URL** | `={{ $json.lrclib_search_url }}` | 前のノードで生成された検索URL |
| **Authentication** | `None` | APIキー不要（完全無料・登録不要） |
| **Never Error (エラー無視)** | `ON` (有効) | 万が一見つからなくてもフローを止めない |
| **On Error (エラー時の挙動)** | `Continue Regular Output` | 503エラー時も空データで後続（Geminiフォールバック）へ流す |
| **Retry On Fail (自動再試行)** | `ON` (有効) | サーバー混雑時に自動で再試行 |
| **Max Tries** | `3` | 最大3回リトライ |
| **Wait Between Tries (ms)** | `2000` | 2秒間隔でリトライ |

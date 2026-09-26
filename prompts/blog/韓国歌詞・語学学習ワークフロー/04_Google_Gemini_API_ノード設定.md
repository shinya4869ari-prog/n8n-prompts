# 🤖 04 Google Gemini API（ノード設定仕様書）

このノードは **JavaScript（Codeノード）ではなく、n8n の標準「HTTP Request」ノード** です。  
手前の「03_Gemini 教材生成プロンプト構築」で作成されたプロンプトと設定（`gemini_request`）を、Google Gemini 公式 REST API に送信して教材データを高速生成します。

---

## 📌 ノード基本情報
- **ノード種類**: `HTTP Request`
- **ノード名**: `04_Google Gemini API`
- **入力元**: `03_Gemini 教材生成プロンプト構築` から接続
- **出力先**: `05_Supabase整形 & コスト算出` へ接続

---

## ⚙️ ノードパラメータ設定

| 設定項目 | 設定値 | 補足説明 |
| :--- | :--- | :--- |
| **Method** | `POST` | |
| **URL** | 下記の固定URL（または動的式）を入力 | 3.8固定なら直接URL入力で確実 |
| **Send Headers** | `true` (有効) | 下記ヘッダーを設定 |
| **Send Body** | `true` (有効) | |
| **Body Content Type** | `JSON` | |
| **Specify Body** | `Using JSON` | |
| **JSON** | `={{ JSON.stringify($json.gemini_request) }}` | 前のノードで生成されたリクエストペイロード |

---

### 🌐 URL入力欄（そのままコピー＆ペースト）

**【推奨：3.8固定の場合（エラーが起きず確実）】**
```text
https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent
```

**【動的に切り替える場合（バックスラッシュ不要版）】**
```text
=https://generativelanguage.googleapis.com/v1beta/models/{{ $json.model || 'gemini-3.8-flash' }}:generateContent
```

---

## 📋 Header Parameters（ヘッダー一覧）

```text
x-goog-api-key: {{ $env.GEMINI_API_KEY }}
Content-Type: application/json
```

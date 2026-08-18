# 映画DB充実（個別登録版）総合事前AI検証＆安全保存 構築ガイド

## 📌 概要
本ガイドは、映画個別登録ワークフローにおいて、「映画データ」「人物（キャスト・監督）」「サントラ（OST劇中歌）」の3系統のデータを保存直前に一括集約し、**AIによる総合整合性チェック（キメラ混入排除・無関係サントラの除外）に合格したクリーンなデータのみをSupabaseへ安全保存** するための完全構築マニュアルです。

---

## 🏗️ n8n ノードの全体配置と接続図

```text
【データ収集・整形フェーズ】
  [補完ブリッジ整形コード]
     ├─▶ [映画データ] ──▶ [補完結果整形コード] ──────────────────────────┐
     ├─▶ [キャスト・監督] ──▶ [Wikidata人物・画像取得] ──▶ [Supabase整形コード] ──┤
     └─▶ [OST劇中歌取得整形Code] ─────────────────────────────────────────┤
                                                                          │
                                                                          ▼
【総合AI検証フェーズ】                                           [総合検証集約コード]
                                                                          │
                                                                          ▼
                                                              [映画・人物・OST総合AI検証 (Gemini)]
                                                                          │
                                                                          ▼
                                                              [検証結果ディスパッチコード]
                                                                          │
                                                                          ▼
                                                                  [検証合格判定 (IF)]
                                                                    │              │
                                                       (true / 合格)│              │(false / 却下)
                                                                    ▼              ▼
【Supabase安全保存フェーズ】                           ┌────────────┴───────────┐   [保存停止 / ログ出力]
                                                      │                        │
                                                      ▼                        ▼
                                            [Supabaseへ保存 (Movies)]   [Supabase tracks保存]
                                                      │
                                                      ▼
                                            [キャスト・人物保存ノード (Persons)]
```

---

## 🛠️ 各ノードの設定と接続手順

### 1. Codeノードの追加: `総合検証集約コード`
* **ノード名**: `総合検証集約コード`
* **ノードタイプ**: `Code` (Run Once for All Items)
* **コード内容**: [総合検証集約コード.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/映画DB充実＿個別登録版/総合検証集約コード.js)
* **入力接続**: 
  * `補完結果整形コード`
  * `Supabase整形コード`
  * `OST劇中歌取得整形Code`
  の3つの出力をこのノードへ接続します。

---

### 2. Geminiノードの追加: `映画・人物・OST総合AI検証`
* **ノード名**: `映画・人物・OST総合AI検証`
* **ノードタイプ**: `Google Gemini` (または Basic LLM Chain / OpenAI)
* **Model**: `gemini-1.5-flash` または `gemini-1.5-pro`
* **プロンプト**: [映画_人物_OST_総合AI検証プロンプト.md](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/映画DB充実＿個別登録版/映画_人物_OST_総合AI検証プロンプト.md) の内容をセットします。
* **入力接続**: `総合検証集約コード` の出力に接続します。

---

### 3. Codeノードの追加: `検証結果ディスパッチコード`
* **ノード名**: `検証結果ディスパッチコード`
* **ノードタイプ**: `Code` (Run Once for All Items)
* **コード内容**: [検証結果ディスパッチコード.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/映画DB充実＿個別登録版/検証結果ディスパッチコード.js)
* **入力接続**: `映画・人物・OST総合AI検証` の出力に接続します。

---

### 4. IFノードの追加: `検証合格判定`
* **ノード名**: `検証合格判定`
* **ノードタイプ**: `If`
* **Conditions**:
  * **Value 1**: `{{ $json.is_valid }}`
  * **Operation**: `Equal`
  * **Value 2**: `true` (Boolean)
* **True分岐**: 下記のSupabase保存ノード群へ接続します。
* **False分岐**: 何も接続しない（または Discord/Slack エラー通知ノードへ接続）。

---

### 5. Supabase保存ノード群の接続

#### (A) `Supabaseへ保存` (Moviesテーブル)
* **対象データ**: `{{ $json.movie }}`
* **Operation**: `Upsert (Create or Update)`
* **Table**: `Movies`
* **Conflict Columns**: `title` または `tmdb_id`

#### (B) `Supabase tracks保存` (tracksテーブル)
* **対象データ**: `{{ $json.tracks }}`
* **Operation**: `Upsert`
* **Table**: `tracks`
* **Conflict Columns**: `track_id`

#### (C) `キャスト・人物保存ノード` (Personsテーブル)
* **対象データ**: `{{ $json.persons }}`
* **Operation**: `Upsert`
* **Table**: `Persons`
* **Conflict Columns**: `name` または `qid`

---

## 🎯 このアーキテクチャで解決される問題

1. **同名別作品・キメラ化の完全防止**:
   * 過去のドラマや同名別映画のあらすじ・キャストが混ざっていた場合、AIが保存前に検知・自動修正します。
2. **無関係サントラの混入ゼロ**:
   * 同名のアニメや無関係なJ-POP・洋楽アルバムは `REJECTED` 判定され、Supabaseには1曲も保存されません。
3. **安全で綺麗なデータベースの維持**:
   * 万が一AI判定で不合格（`is_valid: false`）となった場合は保存が自動停止するため、DBが汚染される事故が100%防止されます。

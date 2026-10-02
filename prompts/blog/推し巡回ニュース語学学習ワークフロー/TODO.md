# 📋 【推し巡回ワークフロー】やることリスト (TODO.md)

作成日: 2026-10-02  
対象リポジトリ: `n8n-prompts`  
対象フォルダ: `prompts/blog/推し巡回ニュース語学学習ワークフロー/`

---

## 🎯 目的
アプリ（K-Learner）で⭐（お気に入り）を付けた推し（現在47名）を、**手動コピペやシート手入力ゼロ（完全自動）** でスプレッドシートに自動追記し、毎日の巡回ループに自動合流させる。

---

## 🗺️ 明日つくる先頭ブロックの完成形

現在キャンバスに組んである **`Loop Over Items` から後ろ（Gemini 4段フォールバック・Waitなど）は一切触りません！**  
**キャンバス左端の先頭部分** だけを以下のように繋ぎ変えます👇

```
[ ⏰ 毎日定時実行 (Schedule Trigger) ]
        │
        ▼
★【ステップ 1】[ 📡 Supabase: お気に入り推し取得 ]（HTTP Request）
        │
        ▼
[ 📊 Google Sheets: 推しリスト全行取得 ]（※いまあるやつ）
        │
        ▼
★【ステップ 2】[ 🔍 00_新推し差分自動検知 ]（Codeノード）
        │
        ▼
★【ステップ 3】[ ❓ 新推しがあるか？ ]（Ifノード）
        ├── 【YES（差分あり）】──▶ ★【ステップ 4】[ 📝 Google Sheets: 新推し自動追加 ]（Append）
        │                                                     │
        └── 【NO（差分なし）】────────────────────────────────┴──▶ [ ⚡ 01_最優先5名選出 ]（※コード更新）
                                                                                │
                                                                                ▼
                                                                [ 🔁 Loop Over Items ... ]（※以降そのまま動く！）
```

---

## 🛠️ 明日の作業手順（7ステップ）

- [ ] **ステップ 1: 先頭に `Supabase: お気に入り推し取得`（HTTP Request）を置く**
  - **置く場所**: `毎日定時実行` と `Google Sheets: 推しリスト全行取得` の間
  - **設定内容**:
    - **Method**: `GET`
    - **URL**:
      ```text
      https://uvjpiuinsgklddzhzpio.supabase.co/rest/v1/Persons?is_favorite=eq.true&order=id.asc
      ```
    - **Send Headers**: ON
    - **Headers**:
      - Name: `apikey` ➔ Value: `sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX`
      - Name: `Authorization` ➔ Value: `Bearer sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX`
  - **確認**: 「Test step」を押して、47件のデータが取得できればOK！

---

- [ ] **ステップ 2: `Google Sheets: 推しリスト全行取得` の後ろに `00_新推し差分自動検知`（Code）を置く**
  - **置く場所**: `Google Sheets: 推しリスト全行取得` の直後
  - **ノード名**: `00_新推し差分自動検知`
  - **コード**: [00_新推し差分自動検知.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/00_新推し差分自動検知.js) の中身を貼り付け。
  - **役割**: Supabaseの47名とスプレッドシートの45名を自動突合し、シートにまだいない2名（チャ・スンウォン、DAWN）を差分として抽出する。

---

- [ ] **ステップ 3: `新推しがあるか？`（Ifノード）を置く**
  - **置く場所**: `00_新推し差分自動検知` の直後
  - **ノード名**: `新推しがあるか？`
  - **条件設定**:
    - **Type**: `Number`
    - **Value 1**: `={{ $input.all().length }}`
    - **Operation**: `Larger than`（または `>`）
    - **Value 2**: `0`

---

- [ ] **ステップ 4: IfのYES（true）側に `Google Sheets: 新推し自動追加`（Append）を置く**
  - **置く場所**: Ifノードの `true` の先
  - **ノードタイプ**: `Google Sheets`
  - **Operation**: `Append Row`（または `append`）
  - **Document**: 現在使っているスプレッドシートを選択
  - **Sheet**: `推しリスト`
  - **Columns to map**:
    - `id`: `={{ $json.id }}`
    - `name_ja`: `={{ $json.name_ja }}`
    - `name_ko`: `={{ $json.name_ko }}`
    - `last_searched_at`: `={{ $json.last_searched_at }}` （※空欄がセットされる）
    - `is_active`: `={{ $json.is_active }}` （※TRUEがセットされる）

---

- [ ] **ステップ 5: `01_最優先5名選出` への合流配線**
  - Ifノードの `false`（差分なし） ➔ `01_最優先5名選出 & RSS URL生成` に繋ぐ
  - `Google Sheets: 新推し自動追加`（追記完了後） ➔ `01_最優先5名選出 & RSS URL生成` に繋ぐ

---

- [ ] **ステップ 6: `01_最優先5名選出` のコードを最新版に更新**
  - 現在ある `01_最優先5名選出 & RSS URL生成` ノードを開き、中身のコードを [01_スプレッドシート設計と5名抽出コード.js](file:///c:/Users/shiny/.gemini/antigravity/scratch/n8n-prompts/prompts/blog/推し巡回ニュース語学学習ワークフロー/01_スプレッドシート設計と5名抽出コード.js) に貼り替える。
  - **役割**: 新メンバー（チャ・スンウォン、DAWNなど）を行番号付きで最優先枠として合流選出する。

---

- [ ] **ステップ 7: 本番47名での自動巡回テスト実行！**
  - ワークフローの「Execute Workflow」を押してテスト実行。
  - **確認ポイント**:
    1. スプレッドシートの末尾（46行目・47行目）に、**チャ・スンウォン** と **DAWN** が勝手に追記されたか？
    2. その2名が最優先で本日の5名枠に選出され、ニュース取得 ➔ Gemini（4段フォールバック） ➔ Supabase保存 ➔ シートの日時更新 ➔ Wait まで自動完走するか？

---

## 🔑 よく使う設定値メモ

| 項目 | 設定値 |
| :--- | :--- |
| **Supabase URL** | `https://uvjpiuinsgklddzhzpio.supabase.co` |
| **Supabase Key** | `sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX` |
| **Gemini Header** | `x-goog-api-key: {{ $env.GEMINI_API_KEY }}` |
| **Wait 間隔** | `15 Seconds`（無料枠 5 RPM 完全回避） |

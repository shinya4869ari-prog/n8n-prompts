# 人物用データベース充実ワークフロー 構築マニュアル

## 📌 ワークフローの概要
本ワークフローは、韓国・日本・海外の**俳優・映画監督**だけでなく、**政治家（大統領・国会議員等）、歴史上の人物（朝鮮王朝の王・偉人等）、K-POPアイドル・歌手、タレント、学者・文化人**に至るまで、あらゆる注目人物データをWikidataおよびGemini AIを活用して自動収集・高品質クレンジングし、Supabaseの `Persons` テーブルへ一括保存・更新（Upsert）するための汎用・高機能n8nワークフローです。

HistoryGallery（映画アーカイブ・人物事典）や KR-Learner（語学学習アプリ）の「推し（★お気に入り人物）」機能とも完全連動します。

---

## 🏗️ n8n ノードの全体配置と接続図

```text
[⚡ 01 人物データベース登録フォーム]
       │ （手動入力 / 映画・ドラマ連携 / ニュース連携）
       ▼
[ { } 02 入力分割コード ]
       │ （カンマ区切り人物の一括展開・カテゴリ別正規化）
       ▼
[ 🌐 03 Wikidata人物情報取得 ]
       │ （SPARQLで写真・SNS・公職・政党・TMDb ID・生没年月日を一括取得）
       ▼
[ ✦ 04 Gemini人物クレンジング ]
       │ （分野別の特性を捉えた150〜250文字の高品質bioを要約生成）
       ▼
[ { } 05 Supabase Upsert整形 ]
       │ （候補者スコアリング・画像/SNS整形・is_favorite保護・JSON化）
       ▼
[ 🌐 06 Supabase人物保存 ]
         （POST /rest/v1/Persons with merge-duplicates）
```

---

## 📂 構成ファイル一覧 (ファイリング一覧)

| 順序 | ファイル名 | ノード種別 | 役割 |
| :---: | :--- | :--- | :--- |
| **01** | [01_人物データベース登録フォーム.md](./01_人物データベース登録フォーム.md) | Form Trigger | 人物名、QID、カテゴリ選択の手動入力受付フォーム |
| **02** | [02_入力分割コード.js](./02_入力分割コード.js) | Code | カンマ区切りの複数名や映画キャスト配列を1人1アイテムに展開 |
| **03** | [03_Wikidata人物情報取得.md](./03_Wikidata人物情報取得.md) | HTTP Request | Wikidata SPARQLから写真・SNS・公職・政党・生年月日等を一括取得 |
| **04** | [04_Gemini人物クレンジング_AIプロンプト.md](./04_Gemini人物クレンジング_AIプロンプト.md) | Google Gemini | 人物の公式プロフィール紹介文（bio）を分野別に要約生成 |
| **05** | [05_Supabase_Upsert整形.js](./05_Supabase_Upsert整形.js) | Code | カテゴリ別スコアリング・クレンジング・お気に入り保護・JSON作成 |
| **06** | [06_Supabase人物保存.md](./06_Supabase人物保存.md) | HTTP Request | Supabase `Persons` テーブルへPOST (merge-duplicates) 保存 |

---

## 🌟 主な対応カテゴリと登録例

本ワークフローはフォーム入力時に「カテゴリ（人物区分）」を選択、または自動判定します：

1. **政治家・大統領・議員 (`politician`)**
   - 入力例: `尹錫悦` (Q16090635), `李在明` (Q12612760), `文在寅`
   - 特徴: 所属政党、公職（大統領、議員等）を自動判定し、政治史における役割を踏まえた紹介文を生成。
2. **歴史上の人物・偉人 (`historical`)**
   - 入力例: `世宗` (Q37682), `李舜臣` (Q50184), `安重根`
   - 特徴: 活躍した時代区分（朝鮮王朝等）や歴史的功績・後世への影響を的確に解説。
3. **俳優・映画監督 (`actor` / `director`)**
   - 入力例: `イ・ジェフン` (Q496314), `ポン・ジュノ` (Q496544)
   - 特徴: TMDb Person ID（P4985）を自動取得し、映画アーカイブと完全紐付け。
4. **K-POPアイドル・歌手 (`idol` / `singer`)**
   - 入力例: `NewJeans`, `BTS`, `カリナ`
   - 特徴: グループ判定、所属メンバー情報、代表曲・ポジションを反映。
5. **学者・作家・文化人 (`author`)**
   - 入力例: `ハン・ガン` (Q484498 - ノーベル文学賞作家), `ポン・ジュノ`

---

## 📊 Supabase Persons テーブル連携仕様

本ワークフローによって保存される主要カラム一覧：

| カラム名 | 型 | 内容 | 取得元 |
| :--- | :--- | :--- | :--- |
| `name` | text | 人物名（日本語） | フォーム入力 / Wikidata label |
| `name_en` | text | 原語表記（韓国人の場合はハングル最優先） | Wikidata `personKoLabel` / `personEnLabel` |
| `occupation` | text | 職業・公職・肩書 | Wikidata `positionLabel` / `occupationLabel` |
| `country` | text | 国コード（`KR`, `JP` 等） | Wikidata 国籍 / 入力値 |
| `profile_url` | text | 高画質顔写真URL | Wikimedia Commons 高解像度URL |
| `wikidata_id` | text | Wikidata QID | Wikidata URI (`Q...`) |
| `tmdb_id` | int | TMDb Person ID | Wikidata P4985 / 映画連携 |
| `gender` | text | 性別 (`male` / `female`) | Wikidata P21 |
| `x_id` | text | 公式 X アカウント | Wikidata P2002 |
| `instagram_id`| text | 公式 Instagram アカウント | Wikidata P2003 |
| `youtube_id` | text | 公式 YouTube チャンネル | Wikidata P2397 |
| `favorite_youtube` | text | おすすめ動画 | 手動入力 / アプリ連携 |
| `official_site`| text | 公式・議会・公報サイト | Wikidata P856 |
| `bio` | text | Geminiが生成した紹介文 | Gemini 2.0 / 1.5 Flash (150〜250文字) |
| `is_favorite` | bool | 推しフラグ（アプリ★連動） | **未指定時は既存値を保護（上書き防止）** |

---

## 💡 運用のポイントとベストプラクティス

1. **カンマ区切りの一括登録**:
   - 人物名欄に `尹錫悦, 李在明, 文在寅` や `世宗大王、李舜臣` のように入力すると、`02_入力分割コード` が自動で1人ずつに分解して並列処理します。
2. **Wikidata 429 エラー対策**:
   - `03_Wikidata人物情報取得` のヘッダーに `User-Agent: KokkanoTenbinBot/1.0 (https://kokkanotenbon.example.com; contact@example.com)` を設定することで、Wikimedia SPARQL APIのレート制限を回避できます。
3. **お気に入りスターの保護**:
   - 既存の人物データを再更新する際、アプリ側で付けた `is_favorite`（推しスター）が消えないよう、`05_Supabase_Upsert整形` で未指定時はキーを除外し、Supabaseの `Prefer: resolution=merge-duplicates` で安全にマージされます。

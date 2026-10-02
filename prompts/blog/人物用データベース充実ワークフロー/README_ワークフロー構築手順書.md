# 人物用データベース充実ワークフロー 構築マニュアル（iD教えて直結版）

## 📌 ワークフローの概要
本ワークフローは、『**iD教えて**（ID-Oshiete）』アプリの「👤 人物モード」とシームレスに直結し、韓国・日本・世界各国の**俳優・映画監督・K-POPアイドル・歌手・政治家・歴史上の人物・文化人**に至るまで、あらゆる人物データをSupabaseの `Persons` テーブルへ一括自動保存・更新（Upsert）するためのn8nワークフローです。

『iD教えて』が写真・生年月日・代表作・Wikidata Q-ID・TMDB IDの特定・確定を人間主導で確実に行うため、**同姓同名の取り違えや曖昧検索の誤爆リスクが完全にゼロ**になります。

HistoryGallery（映画アーカイブ・人物事典）や KR-Learner（語学学習アプリ）の「推し（★お気に入り人物）」機能とも完全連動します。

---

## 🏗️ n8n ノードの全体配置と接続図

```text
[ ⚡ 01 Webhook受信トリガー ]
       │ （『iD教えて』人物モードから確定データ POST）
       ▼
[ 🌐 02 Wikidata詳細取得 ]
       │ （QIDでピンポイント直引き：SNS・政党・公職・公式サイト取得）
       ▼
[ ✦ 03 Gemini人物紹介文生成 ]
       │ （代表作・役職・Wikidata詳細を統合して高品質bio要約）
       ▼
[ { } 04 Supabase Upsert整形 ]
       │ （顔写真・ID群・SNS・推し保護・JSONレコード作成）
       ▼
[ 🌐 05 Supabase人物保存 ]
         （POST /rest/v1/Persons with merge-duplicates）
```

---

## 📂 構成ファイル一覧 (ファイリング一覧)

| 順序 | ファイル名 | ノード種別 | 役割 |
| :--- :--- | :--- | :--- | :--- |
| **01** | [01_Webhook受信トリガー.md](./01_Webhook受信トリガー.md) | Webhook Trigger | 『iD教えて』からの人物確定データPOST受付（`/webhook/person-db`） |
| **02** | [02_Wikidata詳細取得.md](./02_Wikidata詳細取得.md) | HTTP Request | Q-ID直引きSPARQLでSNS（X/Insta/YT）、政党、公職、公式HPを取得 |
| **03** | [03_Gemini人物クレンジング_AIプロンプト.md](./03_Gemini人物クレンジング_AIプロンプト.md) | Google Gemini | 代表作やWikidata属性から150〜250文字の高品質bioを日本語要約 |
| **04** | [04_Supabase_Upsert整形.js](./04_Supabase_Upsert整形.js) | Code | 基本データ・SNS・bioを統合し、`is_favorite`保護フラグ付きレコード作成 |
| **05** | [05_Supabase人物保存.md](./05_Supabase人物保存.md) | HTTP Request | Supabase `Persons` テーブルへPOST (merge-duplicates) 保存 |
| **JSON** | [人物用データベース充実ワークフロー.json](./人物用データベース充実ワークフロー.json) | Workflow JSON | n8nへ一括インポート可能なワークフロー定義ファイル |

---

## 🚀 『iD教えて』アプリとの連携手順

1. **n8n側でWebhookを準備**:
   - `01_Webhook受信トリガー` ノードを開き、Production URL（または Test URL）をコピーします。
   - 例: `https://<あなたのn8nドメイン>/webhook/person-db`
2. **『iD教えて』の設定画面で登録**:
   - 右上の「⚙️ 設定」モーダルを開く、または画面下部の「👤 人物用」プリセットボタンをクリック。
   - 人物用 Webhook URL 欄に上記URLを貼り付けて保存します。
3. **人物を検索＆確定**:
   - 「👤 人物」タブで名前（日本語、ハングル、漢字、英語）を入力して「👤 iD教えて！」をクリック。
   - 候補カードから顔写真や代表作、職業を確認して「+ 選ぶ」で確定。
4. **ワークフローへ送信**:
   - 確定バーの「🚀 人物ワークフローへ送信」をクリックすると、一瞬でSupabaseへ全データ（写真、ID、SNS、AI紹介文）が登録されます。

---

## 📊 Supabase Persons テーブル連携仕様

本ワークフローによって保存される主要カラム一覧：

| カラム名 | 型 | 内容 | 取得元 |
| :--- | :--- | :--- | :--- |
| `name` | text | 人物名（日本語） | 『iD教えて』 `name` |
| `name_en` | text | 原語表記（韓国人の場合はハングル最優先） | 『iD教えて』 `original_name` |
| `occupation` | text | 職業・公職・肩書 | 『iD教えて』 / Wikidata `occupationLabel` |
| `country` | text | 2文字ISO国コード（`KR`, `JP` 等、大韓民国等を自動変換） | 『iD教えて』 / Wikidata 国籍 |
| `profile_url` | text | 高画質顔写真URL | 『iD教えて』ポスターURL / Wikimedia Commons |
| `wikidata_id` | text | Wikidata Q-ID | 『iD教えて』 `wikidata_id` (`Q...`) |
| `tmdb_id` | int | TMDb Person ID | 『iD教えて』 `tmdb_id` |
| `gender` | text | 性別 (`male` / `female`) | Wikidata P21 |
| `type` | text | 人物区分（`individual` / `group`） | 『iD教えて』 / Wikidata |
| `group_type` | text | グループ種別（ボーイズグループ / ガールズグループ / バンド等） | 『iD教えて』 / Wikidata（個人でも所属グループの種別を自動セット） |
| `parent_group` | text | 所属グループ名（例: BIGBANG、NewJeans等） | 『iD教えて』 / Wikidata P463 |
| `members` | text | メンバー一覧（カンマ区切り名） | 『iD教えて』 / Wikidata P527（個人でも所属グループの全メンバーを自動セット） |
| `x_id` | text | 公式 X (Twitter) アカウント | Wikidata P2002 |
| `instagram_id`| text | 公式 Instagram アカウント | Wikidata P2003 |
| `youtube_id` | text | 公式 YouTube チャンネル | Wikidata P2397 |
| `favorite_youtube` | text | おすすめ動画 | 将来拡張用 |
| `official_site`| text | 公式・議会・公報サイト | Wikidata P856 / Wikipedia |
| `bio` | text | Geminiが生成した紹介文 | Gemini 2.0 / 1.5 Flash (150〜250文字) |
| `is_favorite` | bool | 推しフラグ（アプリ★連動） | **未指定時は既存値を保護（上書き防止）** |

---

## 💡 改善されたポイント（旧フォーム版との違い）

1. **同姓同名の完全排除**:
   - 名前によるSPARQL検索ではなく、『iD教えて』でユーザーが目視確認した `wikidata_id`（Q-ID）をキーに検索するため、人違いが起きません。
2. **代表作を反映したリッチなAI紹介文**:
   - 『iD教えて』のTMDB Person連携によって取得した「代表作（known_for）」リストがGeminiプロンプトに渡るため、俳優・監督のbioクオリティが飛躍的に向上します。
3. **ノード数削減と安定性**:
   - 従来の複雑な「入力分割コード」や「候補者スコアリングコード」が不要となり、通信トラブルやレート制限（429）に強い堅牢な構造になりました。

---

## 📋 【即時コピペ用】全ノード設定一覧

### 01. Webhook受信トリガー
* **HTTP Method**: `POST`
* **Path**: `person-db`
（※その他はデフォルトのままでOK）

### 02. Wikidata詳細取得
* **Method**: `GET`
* **URL**:
```text
https://query.wikidata.org/sparql?query={{ encodeURIComponent(`SELECT ?person ?personLabel ?personEnLabel ?personJaLabel ?personKoLabel ?genderLabel ?birthDate ?deathDate ?countryLabel ?occupationLabel ?positionLabel ?partyLabel ?tmdbId ?image ?instagram ?twitter ?youtube ?website WHERE { ${($json.body?.wikidata_id || $json.wikidata_id) ? `BIND(wd:${$json.body?.wikidata_id || $json.wikidata_id} AS ?person) .` : `?person (rdfs:label|skos:altLabel) "${$json.body?.name || $json.name}"@ja .`} OPTIONAL { ?person wdt:P21 ?gender . } OPTIONAL { ?person wdt:P569 ?birthDate . } OPTIONAL { ?person wdt:P570 ?deathDate . } OPTIONAL { ?person (wdt:P27|wdt:P495|wdt:P17) ?country . } OPTIONAL { ?person wdt:P106 ?occupation . } OPTIONAL { ?person wdt:P39 ?position . } OPTIONAL { ?person wdt:P102 ?party . } OPTIONAL { ?person wdt:P4985 ?tmdbId . } OPTIONAL { ?person wdt:P18 ?image . } OPTIONAL { ?person wdt:P2003 ?instagram . } OPTIONAL { ?person wdt:P2002 ?twitter . } OPTIONAL { ?person wdt:P2397 ?youtube . } OPTIONAL { ?person wdt:P856 ?website . } OPTIONAL { ?person rdfs:label ?personJaLabel . FILTER(LANG(?personJaLabel) = "ja") } OPTIONAL { ?person rdfs:label ?personEnLabel . FILTER(LANG(?personEnLabel) = "en") } OPTIONAL { ?person rdfs:label ?personKoLabel . FILTER(LANG(?personKoLabel) = "ko") } SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,ko,en" . } } LIMIT 1`) }}&format=json
```
* **Headers**:
  * `User-Agent`: `KokkanoTenbinBot/1.0 (https://kokkanotenbon.example.com; contact@example.com)`
  * `Accept`: `application/sparql-results+json, application/json`

### 03. Gemini人物クレンジング (Prompt)
```text
あなたは人物データベースの専門ライター・エディターです。
提供された以下の人物データを元に、対象人物「{{ (() => { 
  let raw = {};
  for (const n of ['Webhook受信トリガー', '01_Webhook受信トリガー', 'Webhook']) {
    try { const d = $(n).first()?.json; if (d) { raw = d; break; } } catch(e) {}
  }
  const webhook = raw.body || raw;
  return webhook.name || $json.name || '';
})() }}」のプロフィール紹介文（日本語で150文字〜250文字程度）を作成してください。

分野別の執筆指針：
- 俳優・映画監督・タレント: 提供された代表作（映画・ドラマ名）を自然に文中に織り交ぜ、演技の特徴や評価、主な活躍を記述してください。
- 政治家・官僚: 主な公職（大統領、首相、議員等）、所属政党、主要な政策や政治史における役割を記述してください。
- 歴史上の人物: 活躍した時代区分（朝鮮王朝等）、主な業績や歴史的事件、後世への影響を明記してください。
- アイドル・歌手・音楽グループ: 所属グループ名（ボーイズグループ/ガールズグループ等）、メンバー構成、ポジション、代表曲やヒット作を記載してください。グループ自体の場合はグループ種別やメンバー名、個人の場合は所属グループ内での役割やソロ活動を記述してください。
- 学者・作家・文化人: 専門分野、代表的著作、学術的・文化的な功績を記載してください。

共通ルール：
- 簡潔で読みやすく、事実に基づいた自然な日本語文章にしてください。
- 挨拶や前置き（「承知いたしました」等）、見出し、注釈は絶対に含めず、本文（1段落）のみを出力してください。
- 事実に基づかない推測や不確かな噂は含めないでください。

対象人物データ：
{{ (() => {
  let raw = {};
  for (const n of ['Webhook受信トリガー', '01_Webhook受信トリガー', 'Webhook']) {
    try { const d = $(n).first()?.json; if (d) { raw = d; break; } } catch(e) {}
  }
  const webhook = raw.body || raw;

  let wikiBindings = {};
  try {
    let p = typeof $json.data === 'string' ? JSON.parse($json.data) : ($json.data || $json);
    wikiBindings = p.results?.bindings?.[0] || {};
  } catch(e) {}

  const mergedInfo = {
    name: webhook.name || wikiBindings.personJaLabel?.value || wikiBindings.personLabel?.value || '',
    original_name: webhook.original_name || wikiBindings.personKoLabel?.value || wikiBindings.personEnLabel?.value || '',
    type: webhook.type || 'individual',
    group_type: webhook.group_type || '',
    parent_group: webhook.parent_group || '',
    members: webhook.members || '',
    occupation: webhook.occupation || wikiBindings.occupationLabel?.value || wikiBindings.positionLabel?.value || '',
    country: webhook.country || wikiBindings.countryLabel?.value || '',
    birth_date: webhook.birth_date || (wikiBindings.birthDate?.value ? wikiBindings.birthDate.value.split('T')[0] : ''),
    death_date: wikiBindings.deathDate?.value ? wikiBindings.deathDate.value.split('T')[0] : '',
    position: wikiBindings.positionLabel?.value || '',
    party: wikiBindings.partyLabel?.value || '',
    known_for: webhook.known_for || [],
    description: webhook.description || ''
  };
  return JSON.stringify(mergedInfo, null, 2);
})() }}
```

### 04. Supabase Upsert整形 (Code Node: JavaScript)
コード本体は [04_Supabase_Upsert整形.js](./04_Supabase_Upsert整形.js) をそのままコピーしてください。

### 05. Supabase人物保存
* **Method**: `POST`
* **URL**: `https://<YOUR-PROJECT-ID>.supabase.co/rest/v1/Persons`
* **Headers**:
  * `apikey`: `<YOUR-KEY>`
  * `Authorization`: `Bearer <YOUR-KEY>`
  * `Content-Type`: `application/json`
  * `Prefer`: `resolution=merge-duplicates, return=minimal`
* **Body**: `{{ $json }}`


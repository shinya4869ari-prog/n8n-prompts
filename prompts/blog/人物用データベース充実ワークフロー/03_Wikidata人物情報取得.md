# 【03】Wikidata人物情報取得 (HTTP Request Node)

## 📌 ノード概要
* **ノード名**: `Wikidata人物情報取得`
* **ノードタイプ**: `n8n-nodes-base.httpRequest`
* **Method**: `GET`
* **役割**: 入力された人物名（日本語・英語・ハングル）または Wikidata QID をもとに、Wikidata SPARQLエンドポイントから公式プロフィール、高画質写真、SNSアカウント（X, Instagram, YouTube, 公式サイト）、生年月日・没年月日、性別、公職・役職（大統領・議員・提督等）、所属政党、TMDb ID、所属メンバー情報を一括取得します。
* **対象ジャンル**: 俳優・映画監督・K-POPアイドルに加え、**政治家・歴史上の人物・学者・文化人・タレント**など全人類に対応。

---

## ⚙️ HTTP Request URL 設定

n8n の URL 入力欄に以下の式（Expression）を設定してください：

```text
https://query.wikidata.org/sparql?query={{ encodeURIComponent(`SELECT ?person ?personLabel ?personEnLabel ?personJaLabel ?personKoLabel ?genderLabel ?birthDate ?deathDate ?countryLabel ?occupationLabel ?positionLabel ?partyLabel ?tmdbId ?image ?instagram ?twitter ?youtube ?website (GROUP_CONCAT(DISTINCT ?memberLabel; separator=", ") AS ?membersList) WHERE { ${$json.wikidata_id ? `BIND(wd:${$json.wikidata_id} AS ?person) .` : `{ ?person (rdfs:label|skos:altLabel) "${$json.name}"@ja . } UNION { ?person (rdfs:label|skos:altLabel) "${$json.name_en || $json.name}"@ko . } UNION { ?person (rdfs:label|skos:altLabel) "${$json.name_en || $json.name}"@en . } { ?person wdt:P31 wd:Q5 . } UNION { ?person wdt:P31/wdt:P279* wd:Q215380 . }`} OPTIONAL { ?person wdt:P21 ?gender . } OPTIONAL { ?person wdt:P569 ?birthDate . } OPTIONAL { ?person wdt:P570 ?deathDate . } OPTIONAL { ?person (wdt:P27|wdt:P495|wdt:P17) ?country . } OPTIONAL { ?person wdt:P106 ?occupation . } OPTIONAL { ?person wdt:P39 ?position . } OPTIONAL { ?person wdt:P102 ?party . } OPTIONAL { ?person wdt:P4985 ?tmdbId . } OPTIONAL { ?person wdt:P18 ?image . } OPTIONAL { ?person wdt:P2003 ?instagram . } OPTIONAL { ?person wdt:P2002 ?twitter . } OPTIONAL { ?person wdt:P2397 ?youtube . } OPTIONAL { ?person wdt:P856 ?website . } OPTIONAL { ?person wdt:P527 ?member . ?member rdfs:label ?memberLabel . FILTER(LANG(?memberLabel) = "ja") } OPTIONAL { ?person rdfs:label ?personJaLabel . FILTER(LANG(?personJaLabel) = "ja") } OPTIONAL { ?person rdfs:label ?personEnLabel . FILTER(LANG(?personEnLabel) = "en") } OPTIONAL { ?person rdfs:label ?personKoLabel . FILTER(LANG(?personKoLabel) = "ko") } SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,ko,en" . } } GROUP BY ?person ?personLabel ?personEnLabel ?personJaLabel ?personKoLabel ?genderLabel ?birthDate ?deathDate ?countryLabel ?occupationLabel ?positionLabel ?partyLabel ?tmdbId ?image ?instagram ?twitter ?youtube ?website LIMIT 5`) }}&format=json
```

---

## ⚙️ HTTP Request ヘッダー設定 (必須)

Wikimedia の SPARQL エンドポイントは、一般的な Bot UA や空の UA からのリクエストに対して `429 Too Many Requests` を返す仕様になっています。必ず以下のヘッダーを設定してください：

| Header Name | Header Value | 説明 |
| :--- | :--- | :--- |
| `User-Agent` | `KokkanoTenbinBot/1.0 (https://kokkanotenbon.example.com; contact@example.com)` | Wikidata ポリシー準拠の識別子 |
| `Accept` | `application/sparql-results+json, application/json` | JSON レスポンス指定 |

---

## 📋 取得される主なプロパティ (Wikidata Properties)

| 項目 | SPARQL変数 | Wikidata P番号 | 内容 |
| :--- | :--- | :--- | :--- |
| **QID** | `?person` | Entity ID | 例: `Q16090635`（尹錫悦）, `Q37682`（世宗） |
| **日本語名** | `?personJaLabel` | rdfs:label | 日本語表記の公式名 |
| **ハングル名** | `?personKoLabel` | rdfs:label | 原語（韓国語）表記 |
| **英語名** | `?personEnLabel` | rdfs:label | 英語（アルファベット）表記 |
| **性別** | `?genderLabel` | P21 | `男性` / `女性` (`male` / `female`) |
| **生年月日** | `?birthDate` | P569 | YYYY-MM-DD |
| **没年月日** | `?deathDate` | P570 | 歴史上の人物用 YYYY-MM-DD |
| **国籍・国家** | `?countryLabel` | P27 / P495 / P17 | 大韓民国, 朝鮮国, 日本等 |
| **職業** | `?occupationLabel` | P106 | 俳優, 弁護士, 政治家, 歌手, 学者等 |
| **公職・役職** | `?positionLabel` | P39 | 大統領, 国務総理, 国会議員, 朝鮮王等 |
| **所属政党** | `?partyLabel` | P102 | 国民の力, 共に民主党等（政治家用） |
| **TMDb ID** | `?tmdbId` | P4985 | TMDb Person ID（映画・俳優用） |
| **顔写真** | `?image` | P18 | Wikimedia Commons 画像URL |
| **X (Twitter)**| `?twitter` | P2002 | アカウントID |
| **Instagram** | `?instagram` | P2003 | アカウントID |
| **YouTube** | `?youtube` | P2397 | チャンネルID |
| **公式サイト** | `?website` | P856 | オフィシャルHP / 事務所 / 議会等のURL |

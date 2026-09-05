# 【03】Wikidata人物情報取得 (HTTP Request Node)

## 📌 ノード概要
* **ノード名**: `Wikidata人物情報取得`
* **ノードタイプ**: `n8n-nodes-base.httpRequest`
* **Method**: `GET`
* **役割**: 入力された人物名（日本語・英語・ハングル）または Wikidata QID をもとに、Wikidata SPARQLエンドポイントから公式プロフィール、高画質写真、SNSアカウント（X, Instagram, YouTube, 公式サイト）、生年月日、性別、所属メンバー情報を取得します。

---

## ⚙️ HTTP Request URL 設定

n8n の URL 入力欄に以下の式（Expression）を設定してください：

```text
https://query.wikidata.org/sparql?query={{ encodeURIComponent(`SELECT ?person ?personLabel ?personEnLabel ?personJaLabel ?personKoLabel ?genderLabel ?birthDate ?deathDate ?countryLabel ?occupationLabel ?image ?instagram ?twitter ?youtube ?website (GROUP_CONCAT(DISTINCT ?memberLabel; separator=", ") AS ?membersList) WHERE { ${$json.wikidata_id ? `BIND(wd:${$json.wikidata_id} AS ?person) .` : `{ ?person wdt:P31 wd:Q5 . } UNION { ?person wdt:P31/wdt:P279* wd:Q215380 . } ${($json.country === 'KR' || $json.country === '韓国' || ($json.occupation && $json.occupation.includes('韓国'))) ? `?person (wdt:P27|wdt:P495) wd:Q884 .` : ($json.country === 'JP' || $json.country === '日本') ? `?person (wdt:P27|wdt:P495) wd:Q17 .` : ``} { ?person (rdfs:label|skos:altLabel) "${$json.name}"@ja . } UNION { ?person (rdfs:label|skos:altLabel) "${$json.name_en || $json.name}"@ko . } UNION { ?person (rdfs:label|skos:altLabel) "${$json.name_en || $json.name}"@en . }`} OPTIONAL { ?person wdt:P21 ?gender . } OPTIONAL { ?person wdt:P569 ?birthDate . } OPTIONAL { ?person wdt:P571 ?birthDate . } OPTIONAL { ?person wdt:P570 ?deathDate . } OPTIONAL { ?person (wdt:P27|wdt:P495) ?country . } OPTIONAL { ?person wdt:P106 ?occupation . } OPTIONAL { ?person wdt:P18 ?image . } OPTIONAL { ?person wdt:P2003 ?instagram . } OPTIONAL { ?person wdt:P2002 ?twitter . } OPTIONAL { ?person wdt:P2397 ?youtube . } OPTIONAL { ?person wdt:P856 ?website . } OPTIONAL { ?person wdt:P527 ?member . ?member rdfs:label ?memberLabel . FILTER(LANG(?memberLabel) = "ja") } OPTIONAL { ?person rdfs:label ?personJaLabel . FILTER(LANG(?personJaLabel) = "ja") } OPTIONAL { ?person rdfs:label ?personEnLabel . FILTER(LANG(?personEnLabel) = "en") } OPTIONAL { ?person rdfs:label ?personKoLabel . FILTER(LANG(?personKoLabel) = "ko") } SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,ko,en" . } } GROUP BY ?person ?personLabel ?personEnLabel ?personJaLabel ?personKoLabel ?genderLabel ?birthDate ?deathDate ?countryLabel ?occupationLabel ?image ?instagram ?twitter ?youtube ?website LIMIT 5`) }}&format=json
```

---

## 📋 取得される主なプロパティ (Wikidata Properties)

| 項目 | SPARQL変数 | Wikidata P番号 | 内容 |
| :--- | :--- | :--- | :--- |
| **QID** | `?person` | Entity ID | 例: `Q496314` |
| **日本語名** | `?personJaLabel` | rdfs:label | 日本語表記の公式名 |
| **ハングル名** | `?personKoLabel` | rdfs:label | 原語（韓国語）表記 |
| **英語名** | `?personEnLabel` | rdfs:label | 英語（アルファベット）表記 |
| **性別** | `?genderLabel` | P21 | `male` / `female` |
| **生年月日** | `?birthDate` | P569 / P571 | YYYY-MM-DD |
| **国籍** | `?countryLabel` | P27 / P495 | 国籍・活動国 |
| **職業** | `?occupationLabel` | P106 | 俳優, 映画監督, 歌手など |
| **顔写真** | `?image` | P18 | Wikimedia Commons 画像URL |
| **X (Twitter)** | `?twitter` | P2002 | アカウントID |
| **Instagram** | `?instagram` | P2003 | アカウントID |
| **YouTube** | `?youtube` | P2397 | チャンネルID |
| **公式サイト** | `?website` | P856 | オフィシャルHPのURL |

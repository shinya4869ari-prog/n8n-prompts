# Wikidata 人物情報一括取得ノード (`Wikidata人物情報取得`)

QIDがある場合はQIDで直接取得し、`wikidata_id` が `null` の場合は **日本語名またはハングル名から「人間(P31=Q5)」に限定して自動検索** する安全な SPARQL HTTP Request 設定です。（兵器や地名などの誤ヒットを100%防止）

---

## 1. HTTP Request ノード設定

* **Node Name**: `Wikidata人物情報取得`
* **Method**: `GET`
* **URL**:
```text
https://query.wikidata.org/sparql?query={{ encodeURIComponent(`SELECT ?person ?personLabel ?personEnLabel ?personJaLabel ?personKoLabel ?genderLabel ?birthDate ?deathDate ?countryLabel ?occupationLabel ?image ?instagram ?twitter ?youtube ?website WHERE { ${$json.wikidata_id ? `BIND(wd:${$json.wikidata_id} AS ?person) .` : `?person wdt:P31 wd:Q5 . { ?person rdfs:label "${$json.name}"@ja . } UNION { ?person rdfs:label "${$json.name_en}"@ko . }`} OPTIONAL { ?person wdt:P21 ?gender . } OPTIONAL { ?person wdt:P569 ?birthDate . } OPTIONAL { ?person wdt:P570 ?deathDate . } OPTIONAL { ?person wdt:P27 ?country . } OPTIONAL { ?person wdt:P106 ?occupation . } OPTIONAL { ?person wdt:P18 ?image . } OPTIONAL { ?person wdt:P2003 ?instagram . } OPTIONAL { ?person wdt:P2002 ?twitter . } OPTIONAL { ?person wdt:P2397 ?youtube . } OPTIONAL { ?person wdt:P856 ?website . } OPTIONAL { ?person rdfs:label ?personJaLabel . FILTER(LANG(?personJaLabel) = "ja") } OPTIONAL { ?person rdfs:label ?personEnLabel . FILTER(LANG(?personEnLabel) = "en") } OPTIONAL { ?person rdfs:label ?personKoLabel . FILTER(LANG(?personKoLabel) = "ko") } SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,ko,en" . } } LIMIT 5`) }}&format=json
```

* **Headers**:
  * `User-Agent`: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`
  * `Accept`: `application/sparql-results+json`

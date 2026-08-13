# Supabase Personsテーブル構築 ＆ 映画キャストQID全自動取得ガイド

## 1. 映画キャスト・監督の Wikidata QID 全自動取得ノード (`Wikidata人物検索`)

映画の Wikidata ID（例: `Q27061034`）から、その映画に出演している**監督・全キャストの Wikidata QID（キム・ギドク = Q312637、リュ・スンボム = Q484011等）を全自動で1秒取得**する HTTP Request ノードの設定です。

### HTTP Request ノード設定
- **Node Name**: `Wikidata人物検索`
- **Method**: `GET`
- **URL**:
```text
https://query.wikidata.org/sparql?query=SELECT%20DISTINCT%20%3Fperson%20%3FpersonLabel%20%3FpersonEnLabel%20%3FpersonKoLabel%20WHERE%20%7B%0A%20%20%7B%20wd%3A{{ $json.wikidata_id || 'Q27061034' }}%20wdt%3AP57%20%3Fperson%20.%20%7D%0A%20%20UNION%0A%20%20%7B%20wd%3A{{ $json.wikidata_id || 'Q27061034' }}%20wdt%3AP161%20%3Fperson%20.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fperson%20rdfs%3Alabel%20%3FpersonEnLabel%20.%20FILTER(LANG(%3FpersonEnLabel)%20%3D%20%22en%22)%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fperson%20rdfs%3Alabel%20%3FpersonKoLabel%20.%20FILTER(LANG(%3FpersonKoLabel)%20%3D%20%22ko%22)%20%7D%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20bd%3AserviceParam%20wikibase%3Alanguage%20%22ja%2Cen%2Cko%22.%20%7D%0A%7D&format=json
```
- **Headers**:
  - `User-Agent`: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36`

---

## 2. Persons Supabase Upsert 整形コード (`Persons_Supabase_Upsertコード.js`)

`Wikidata人物検索` から出力された全キャストの QID を自動的に照合・結合し、`Persons` テーブルへ一括 Upsert 保存します。

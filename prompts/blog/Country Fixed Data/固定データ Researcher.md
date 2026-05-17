# 【重要】調査の絶対ルール
1. **正確性重視**: 記事の信頼性に関わるため、全ての数値データについて「最新年」「具体的な値」「出典」をセットで取得すること。
2. **優先出典の遵守**: 各項目に指定された優先出典をまず確認し、なければフォールバック用クエリで補完すること。
3. **推測禁止**: データが見つからない場合は「不明」または空欄とし、嘘の数値を捏造しないこと。
4. **World Bank API 優先項目**: 殺人率、交通事故死亡率、自殺率、失業率、貧困率、ジニ係数、女性労働参加率、女性議員比率、児童労働率は、システム側で World Bank API から自動取得を試みる。ただし、WBに最新データがない場合に備え、必ず以下の指定クエリで最新値を調査し、フォールバック用として出力に含めること。

---

# 調査項目

### 1. 治安・社会基本指標
以下の項目について、最新の統計を調査してください。

### 殺人率・交通事故死亡率・自殺率（10万人あたり）
※World Bank APIで自動取得済み。以下はWBにデータがない場合のフォールバック専用。
- 「{{ $json.countryEn }} intentional homicide rate per 100,000 UNODC latest」
- 「{{ $json.countryEn }} road traffic mortality rate per 100,000 WHO latest」
- 「{{ $json.countryEn }} suicide mortality rate per 100,000 WHO latest」

### 失業率
※World Bank APIで自動取得済み。以下はWBにデータがない場合のフォールバック専用。
- 「{{ $json.countryEn }} unemployment rate official statistics latest」

### 貧困率・ジニ係数
- 貧困率：国の貧困線（National Poverty Line）に基づく最新値
- ジニ係数：※World Bank APIで自動取得済み。以下はWBにデータがない場合のフォールバック専用。
  - 「{{ $json.countryEn }} gini index World Bank latest data」

### 刑務所データ（収容率・総数・推移）の絶対ルール
**出典は必ず「World Prison Brief」を使用すること。世界銀行、UNODC、各国統計局などのデータは一切使用禁止。**
1. **刑務所収容率（Occupancy level）**: 定員に対する収容割合を **「〇〇%」** の形式で収集すること。
   - 「World Prison Brief {{ $json.countryEn }} occupancy level latest」
2. **直近の刑務所総収容者数**: 「World Prison Brief」から最新の数値を収集すること。
   - 「World Prison Brief {{ $json.countryEn }} latest total prison population」
3. **刑務所収容推移（グラフ用・昇順）**: 
   - **2000年を起点として、最新年に向かって「古い順（昇順）」で最大10件** 抽出すること。
   - 間隔は原則 **「2年おき」**（2000, 2002, 2004...）を優先し、10件目は必ず直近の最新値にすること。
   - 「World Prison Brief {{ $json.countryEn }} historical prison population trend 2000-2026」
   - **※推移の数値には「人」などの単位を付けず、純粋な数値のみを出力すること。**

---

### 2. 治安・リスク評価
- **GPI (Global Peace Index)**: 最新のスコア、順位、年を取得。
- **外務省海外安全ホームページ**: 対象国の「危険レベル」を確認。
  - 4段階（0:白, 1:黄, 2:薄オレンジ, 3:濃オレンジ, 4:赤）で数値化。
  - 地域によってレベルが異なる場合は、最も高いレベル、または首都のレベルを採用し、注釈を入れる。

---

### 3. 犯罪種別ランキング
- 発生件数または検挙件数が多い犯罪トップ5。
- 最新年、出典（各国警察統計など）を明記。
- 具体的名称（例：窃盗、暴行、強盗、詐欺、麻薬犯罪）でリストアップ。

---

### 4. 女性・子供安全指標
優先出典：World Bank API（自動取得） → UNODC → UNICEF → WEF → 各国警察統計

- 性的暴行（Sexual violence/Rape）の届出率（10万人あたり）
- 年間性的暴行件数（Total cases）
- 人身売買（Human Trafficking）の被害者数（検挙・保護数）
- **GGI (Global Gender Gap Index)**: 最新のスコア、順位、年を取得。

### 女性労働参加率・女性議員比率・児童労働率
※World Bank APIで自動取得済み。以下はWBにデータがない場合のフォールバック専用。
- 「{{ $json.countryEn }} female labor force participation rate ILO World Bank latest」
- 「{{ $json.countryEn }} women parliament seats percentage IPU latest」
- 「{{ $json.countryEn }} child labor rate ILO UNICEF latest」

---

### 5. 物価（生活コスト）

### ビール（レストラン500ml）
「Numbeo Domestic Beer price {{ $json.capital }} latest data」

### タバコ（マルボロ1箱）
「Numbeo cigarettes Marlboro price {{ $json.capital }} latest data」

### ミネラルウォーター（500ml）
「Numbeo water bottle 0.5 liter price {{ $json.capital }} latest data」

### ビッグマック
「Big Mac price {{ $json.countryEn }} latest data official」

### ガソリン（1L）
「Numbeo gasoline price {{ $json.capital }} latest data」

### 外食（安めの店・1食）
「Numbeo inexpensive restaurant meal price {{ $json.capital }} latest data」

### 電気・水道・ガス（月額・85㎡）
「Numbeo utilities monthly cost 85m2 apartment {{ $json.capital }} latest data」

### 家賃（1LDK・首都圏市内）
「Numbeo apartment rent 1 bedroom city centre {{ $json.capital }} latest data」

### 平均月収（手取り）
「Numbeo average monthly net salary {{ $json.capital }} latest data」

### Netflix（スタンダード）
「Netflix standard plan price {{ $json.countryEn }} official latest data」

### 為替レート（対円）
「{{ $json.countryEn }} currency JPY exchange rate today」
- **※重要（絶対ルール）**: 必ず「1外貨 ＝ 〇〇円」の形式で出力すること。
- ※対象国が「Japan（日本）」の場合は、為替レートは「1」を出力してください。

---

### 6. 貿易
### 主要輸出入品目・貿易相手国（それぞれ必ず1位〜10位まで抽出すること）
表記は日本語のみ。
- 「{{ $json.countryEn }} top 10 export products site:oec.world latest」
- 「{{ $json.countryEn }} top 10 import products site:oec.world latest」
- 「{{ $json.countryEn }} top 10 trading partners share percentage latest」

---

# 出力形式 (JSON)

必ず以下のJSON構造で出力してください。

```json
{
  "国名（日本語）": "{{ $json.country }}",
  "国名（英語）": "{{ $json.countryEn }}",
  "国コード（ISO）": "{{ $json.countryCode }}",
  "治安・社会指標": {
    "殺人率": {"値": "", "年": "", "出典": ""},
    "交通事故死亡率": {"値": "", "年": "", "出典": ""},
    "自殺率": {"値": "", "年": "", "出典": ""},
    "失業率": {"値": "", "年": "", "出典": ""},
    "貧困率": {"値": "", "年": "", "出典": ""},
    "ジニ係数": {"値": "", "年": "", "出典": ""},
    "刑務所収容率": {"値": "", "年": "", "出典": ""},
    "刑務所総収容者数": {"値": "", "年": "", "出典": ""},
    "収容推移": [{"年": "", "総収容者数": ""}],
    "GPI": {"スコア": "", "順位": "", "年": "", "出典": ""},
    "外務省危険レベル": {"レベル": "", "出典": ""},
    "犯罪トップ5": {
      "年": "",
      "出典": "",
      "リスト": ["", "", "", "", ""]
    },
    "女性・子供指標": {
      "性的暴行届出率":   {"値": "", "年": "", "出典": ""},
      "年間性的暴行件数": {"値": "", "年": "", "出典": ""},
      "人身売買被害者数": {"値": "", "年": "", "出典": ""},
      "GGI": {"スコア": "", "順位": "", "年": "", "出典": ""},
      "女性労働参加率": {"値": "", "年": "", "出典": ""},
      "女性議員比率": {"値": "", "年": "", "出典": ""},
      "児童労働率": {"値": "", "年": "", "出典": ""}
    }
  },
  "物価": {
    "首都（日本語）": "{{ $json.capital }}",
    "通貨名": "{{ $json.currency }}",
    "通貨記号": "{{ $json.currencySymbol }}",
    "通貨コード": "{{ $json.currencyCode }}",
    "為替レート": "",
    "為替取得日": "{{ $now.toFormat('yyyy/MM/dd') }}",
    "各項目": {
      "ビール": {"現地通貨": ""},
      "タバコ": {"現地通貨": ""},
      "水": {"現地通貨": ""},
      "ビッグマック": {"現地通貨": "", "出典": ""},
      "ガソリン": {"現地通貨": ""},
      "外食": {"現地通貨": ""},
      "光熱費": {"現地通貨": ""},
      "家賃": {"現地通貨": ""},
      "月収": {"現地通貨": ""},
      "物価_出典": "",
      "Netflix": {"現地通貨": "", "出典": ""}
    }
  },
  "貿易": {
    "主要輸出項目": [{"順位": "1〜10", "品目": ""}],
    "主要輸入項目": [{"順位": "1〜10", "品目": ""}],
    "貿易相手国": [
      {"順位": "1〜10", "国名": "", "シェア": ""},
      {"順位": "出典", "国名": "", "シェア": "", "出典": "ここに出典名と調査年を記載"}
    ]
  }
}
```
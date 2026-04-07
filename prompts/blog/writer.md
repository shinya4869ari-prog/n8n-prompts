あなたは「国家の天秤」ブログの記事整形ライターです。
以下のJSONデータをもとに、各セクションのHTML表と説明文を生成してください。

## 絶対ルール
- JSONに存在するデータのみ使用すること
- 推測・補完・憶測禁止
- データが「欠測」の場合はそのまま「データなし」と表示
- 数値は必ず出典を明記すること
- 表は3列（項目・対象国・日本）固定
- 説明文は表の下に配置すること

## 入力データ
{{ JSON.stringify($json.data) }}

## 対象国名
{{ $json.対象国 }}

現在日時：{{ $now.toFormat('yyyy年MM月dd日 HH:mm') }}

---

## 出力構造（この順番で出力すること）

---

### ① 制度の9つの皿

以下のHTML表を出力すること：

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:25%;">項目</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:37%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:38%;">日本</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">国家の形と統治機構</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">立憲君主制（象徴天皇制）・議院内閣制・単一国家</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">行政トップ</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">内閣総理大臣：高市早苗（2025年10月就任）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">立法と選挙制度</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">二院制（衆議院・参議院）・小選挙区比例代表並立制</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">司法と法制度</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">最高裁判所を頂点とする三審制・大陸法基調</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">社会保障・医療・年金</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">国民皆保険・国民年金（自己負担原則3割・受給開始65歳）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">教育制度</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">6-3-3-4制・義務教育9年・大学進学率約57%</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">徴税・財政制度</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">消費税10%（軽減税率8%）・所得税最高45%・相続税最高55%</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">安全保障と兵役</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">自衛隊（志願制）・兵役義務なし・日米安保基軸</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">基本権と価値観</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">死刑制度維持（絞首刑・執行継続）・同性婚未承認</td></tr>
  </tbody>
</table>

表の下に各項目のCompare（対象国と日本の差分）を1〜2文で出力すること。

---

### ② 治安と地理の衡量

**治安指標表：**

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:35%;">項目</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:32%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:33%;">日本</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">殺人率（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">0.23人（UNODC 2022年）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">交通事故死亡率（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">2.1人（WHO）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">自殺率（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">16.3人（厚生労働省 2024年）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">投獄率（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">36人（World Prison Brief 2021年）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">警察官数（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">約214人（警察庁 2023年）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">強盗発生率（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">1.11件（警察庁 2024年）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">GPI（世界平和度指数）</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">1.44（12位）</td></tr>
  </tbody>
</table>

※外務省危険情報レベルが1以上の場合のみ以下を出力：
<p>⚠️ <strong>外務省危険情報：レベル【レベル番号】</strong>【詳細】</p>
エラー猫コメント：
- レベル1：「⚠️ 外務省から「十分注意」が出てるニャ。旅行前に必ず確認してほしいニャ。」
- レベル2：「⚠️ 外務省から「不要不急の渡航自粛」が出てるニャ。よほどの理由がない限り行かない方がいいニャ。」
- レベル3：「🚨 外務省から「渡航中止勧告」が出てるニャ！！絶対に行っちゃダメニャ！！」
- レベル4：「🚨 外務省から「退避勧告」が出てるニャ！！既に滞在している人はすぐ逃げてほしいニャ！！」

**死因比較表：**

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:15%;">順位</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:42%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:43%;">日本</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;">1位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">悪性新生物（がん）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">2位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">心疾患</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;">3位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">老衰</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">4位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">脳血管疾患</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;">5位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">肺炎</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">6位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">誤嚥性肺炎</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;">7位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">不慮の事故</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">8位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">新型コロナウイルス感染症</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;">9位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">腎不全</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">10位</td><td style="border:1px solid #ddd;padding:10px;">【JSONの値】</td><td style="border:1px solid #ddd;padding:10px;">アルツハイマー病</td></tr>
  </tbody>
</table>

出典：
- {{ $json.対象国 }}：【JSONの出典】
- 日本：厚生労働省 令和6年人口動態統計

**地理情報：**

| 項目 | {{ $json.対象国 }} |
以下を1文ずつ出力：
- 位置・面積
- 公用語
- 日本からの飛行距離・時間（東京〜大阪の何倍か）

---

### ③ 生活・価値の衡量（物価比較）

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:35%;">項目</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:32%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:33%;">日本</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🍺 ビール（市販500ml）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">305円</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🚬 タバコ（マルボロ1箱）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">620円</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">💧 ミネラルウォーター（500ml）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">118円</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🍔 ビッグマック（1個）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">800円</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">⛽ ガソリン（1L）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">174円</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🍜 外食（安めの店・1食）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">1,000円</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">💡 電気・水道・ガス（月額）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">24,639円</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🏠 家賃（1LDK・市内）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">86,816円</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">💴 平均月収（手取り）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">307,013円</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">📺 Netflix（スタンダード）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">1,590円</td></tr>
  </tbody>
</table>

※算出レート：1 【通貨コード】 = 【為替レート】 JPY（【取得日】現在）
出典：Numbeo, Cost of Living in {{ $json.対象国 }}, {{ $now.toFormat('yyyy年') }}更新 / 日本：Numbeo, Cost of Living in Japan, 2026年3月更新 / Netflix公式サイト

---

### ④ 貿易の衡量

**主要輸出品（トップ10）：**

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:15%;">順位</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:42%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:43%;">日本</th>
    </tr>
  </thead>
  <tbody>
    【JSONの輸出トップ10を1〜10位で出力】
    日本側は固定値：
    1位：自動車
    2位：半導体等製造装置
    3位：半導体等電子部品
    4位：自動車部品
    5位：鉄鋼
    6位：原動機
    7位：科学光学機器
    8位：プラスチック
    9位：有機化合物
    10位：船舶
  </tbody>
</table>

出典：【JSONの貿易出典】 / 日本：財務省貿易統計 2024年（確定値）

**主要輸入品（トップ10）：**

同様の形式で出力。日本側固定値：
1位：原油及び粗油 / 2位：液化天然ガス（LNG） / 3位：医薬品 / 4位：半導体等電子部品 / 5位：通信機 / 6位：衣類及び同付属品 / 7位：石炭 / 8位：非鉄金属 / 9位：鉄鋼 / 10位：肉類

出典：財務省貿易統計 2024年（確定値）

**主要貿易相手国（トップ10）：**

同様の形式で出力。日本側固定値：
1位：中国（20.2%） / 2位：アメリカ（13.9%） / 3位：オーストラリア（6.4%） / 4位：台湾（5.5%） / 5位：韓国（5.3%） / 6位：タイ（3.6%） / 7位：アラブ首長国連邦（3.3%） / 8位：サウジアラビア（2.9%） / 9位：ベトナム（2.7%） / 10位：インドネシア（2.7%）

出典：財務省貿易統計 2024年（確定値）

表の下に以下を出力：
- 対象国の貿易概況（JSONの情報をもとに200文字程度）
- 対象国と日本の二国間貿易の特徴（JSONの対日貿易情報をもとに200文字程度）

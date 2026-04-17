あなたは「国家の天秤」ブログの記事整形アシスタントです。
以下のJSONデータをもとに、ブログ記事用の構造化テキストを生成してください。

【絶対ルール】
すべての数値・人名・役職・統計は検索ツールで取得した結果のみを使用すること。
学習データは「古い・間違いの可能性がある」として扱い、一切使用しないこと。
検索結果と学習データが異なる場合は、必ず検索結果を優先すること。
検索で確認できなかった項目のみ「欠測/未確認」と記載すること。
人名は必ず漢字表記を優先すること。カタカナ表記は禁止。
グラフ・表のデータは必ずJSONデータから取得すること。学習データで補完禁止。

## 入力データ
{{ JSON.stringify($json.data) }}

## 対象国名
{{ $json.対象国 }}

現在日時：{{ $now.toFormat('yyyy年MM月dd日 HH:mm') }}

---

## データ構造の参照先（必ずこの対応で使うこと）

- ① 制度の9つの皿 → data.対象国データ.制度の9つの皿
- ② 地理 → data.対象国データ.地理
- ③ 治安指標 → data.固定データ.治安指標
- ③ 刑務所推移 → data.固定データ.刑務所推移
- ③ 死因トップ10 → data.固定データ.死因トップ10
- ④ 貿易 → data.固定データ.貿易
- ⑤ 物価 → data.固定データ.物価
- ⑥ 経済データ → data.対象国データ_経済
- ⑦ 歴史的背景 → data.対象国データ_記事.歴史的背景
- ⑧ 直近の動向 → data.対象国データ_記事.直近の動向
- ⑨ 映像作品 → data.対象国データ_記事.映像作品
- ⑩ 興行収入ランキング → data.対象国データ_記事.興行収入ランキング
- 日本の制度 → data.日本固定データ.制度の9つの皿
- 日本の治安 → data.日本固定データ.治安指標
- 日本の刑務所推移 → data.日本固定データ.刑務所推移
- 日本の死因 → data.日本固定データ.死因トップ10
- 日本の物価 → data.日本固定データ.物価
- 日本の貿易 → data.日本固定データ.貿易
- 日本の経済 → data.日本固定データ.経済データ

---

## 出力ルール
- 推測・補完・憶測は禁止。JSONに存在するデータのみ使用すること
- データが「欠測/未確認」の場合はそのまま「データなし」と記載すること
- 数値は必ず出典元を明記すること
- 文体は体言止めで書くこと
- 挨拶・説明・前置き・締めの言葉は一切出力しないこと
- ブロックごとに1行開ける

---

## 出力構造（この順番で出力すること）

### 【導入文】
1. 冒頭は必ず「あなたはこの {{ $json.対象国 }} (正式な英語名称)という国を知っていますか？」から開始すること。
2. 長さは6行〜10行程度。
3. 【光と影】【日本との対比】【興味の喚起（なぜ〜なのか？形式で2つ）】を含めること。
4. トーン：知的好奇心を刺激する、冷静かつドラマチックな文体。
5. 結びは必ず「数字と事実（Fact）から、国家の真実を紐解きます」とすること。

---

<h2>① 制度の9つの皿</h2>

data.対象国データ.制度の9つの皿 と data.日本固定データ.制度の9つの皿 を使って以下のHTML表を出力すること：

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:25%;">項目</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:37%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:38%;">日本</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">国家の形と統治機構</td><td style="border:1px solid #ddd;padding:10px;">【data.対象国データ.制度の9つの皿.国家の形と統治機構】</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.制度の9つの皿.国家の形と統治機構.値】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">行政トップ</td><td style="border:1px solid #ddd;padding:10px;">【data.対象国データ.制度の9つの皿.行政トップ】</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.制度の9つの皿.行政トップ.値】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">立法と選挙制度</td><td style="border:1px solid #ddd;padding:10px;">【data.対象国データ.制度の9つの皿.立法と選挙制度】</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.制度の9つの皿.立法と選挙制度.値】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">司法と法制度</td><td style="border:1px solid #ddd;padding:10px;">【data.対象国データ.制度の9つの皿.司法と法制度】</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.制度の9つの皿.司法と法制度.値】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">社会保障・医療・年金</td><td style="border:1px solid #ddd;padding:10px;">【data.対象国データ.制度の9つの皿.社会保障・医療・年金】</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.制度の9つの皿.社会保障・医療・年金.値】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">教育制度</td><td style="border:1px solid #ddd;padding:10px;">【data.対象国データ.制度の9つの皿.教育制度】</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.制度の9つの皿.教育制度.値】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">徴税・財政制度</td><td style="border:1px solid #ddd;padding:10px;">【data.対象国データ.制度の9つの皿.徴税・財政制度】</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.制度の9つの皿.徴税・財政制度.値】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">安全保障と兵役</td><td style="border:1px solid #ddd;padding:10px;">【data.対象国データ.制度の9つの皿.安全保障と兵役】</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.制度の9つの皿.安全保障と兵役.値】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">基本権と価値観</td><td style="border:1px solid #ddd;padding:10px;">【data.対象国データ.制度の9つの皿.基本権と価値観】</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.制度の9つの皿.基本権と価値観.値】</td></tr>
  </tbody>
</table>

表の下に、以下のルールで比較文を1000文字程度で出力すること：
- 項目を羅列しない。全体を通じた「国家の性格の違い」をストーリーとして語ること
- 最も顕著な差異を冒頭に置き、そこから派生する社会・文化への影響へと展開すること
- 「〜である一方」「〜に対し」の繰り返しを避け、読み物として面白い文体にすること
- 体言止めを適度に使い、リズムを生むこと
- 締めは両国の共通点や未来の関係性で終わること

---

<h2>② 地理と経済の衡量</h2>

data.対象国データ.地理 を使って以下のHTML表を出力すること：

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:30%;">項目</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:70%;">{{ $json.対象国 }}</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">位置</td><td style="border:1px solid #ddd;padding:10px;">【位置】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">面積</td><td style="border:1px solid #ddd;padding:10px;">【面積_km2】 km²</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">公用語</td><td style="border:1px solid #ddd;padding:10px;">【公用語】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">日本からの飛行距離</td><td style="border:1px solid #ddd;padding:10px;">【日本からの飛行距離_km】 km（フライト時間：【フライト時間】／東京〜大阪の【東京大阪比】）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">外務省危険レベル</td><td style="border:1px solid #ddd;padding:10px;">【外務省危険レベル】</td></tr>
  </tbody>
</table>

data.対象国データ_経済 と data.日本固定データ.経済データ を使って以下のHTML表を出力すること：

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:35%;">指標</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:32%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:33%;">日本</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">GDP（名目・USドル）</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】年）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.経済データ.GDP_USD.値】（【data.日本固定データ.経済データ.GDP_USD.年】年）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">GDP成長率</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】年）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.経済データ.GDP成長率.値】（【data.日本固定データ.経済データ.GDP成長率.年】年）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">一人当たりGDP</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】年）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.経済データ.一人当たりGDP_USD.値】（【data.日本固定データ.経済データ.一人当たりGDP_USD.年】年）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">インフレ率</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】年）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.経済データ.インフレ率.値】（【data.日本固定データ.経済データ.インフレ率.年】年）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">失業率</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】年）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.経済データ.失業率.値】（【data.日本固定データ.経済データ.失業率.年】年）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">貧困率</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】年）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.経済データ.貧困率.値】（【data.日本固定データ.経済データ.貧困率.年】年）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">ジニ係数</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】年）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.経済データ.ジニ係数.値】（【data.日本固定データ.経済データ.ジニ係数.年】年）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">政府債務残高（GDP比）</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】年）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.経済データ.政府債務残高_GDP比.値】（【data.日本固定データ.経済データ.政府債務残高_GDP比.年】年）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">経常収支（GDP比）</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】年）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.経済データ.経常収支_GDP比.値】（【data.日本固定データ.経済データ.経常収支_GDP比.年】年）</td></tr>
  </tbody>
</table>
<p style="font-size:12px;color:#888;">出典：World Bank / IMF（各値の年度は表内に記載）</p>

表の下にdata.対象国データ_経済.経済トレンド要約を800文字程度で出力すること。

---

<h2>③ 治安と平和の衡量</h2>

<h3>治安指標</h3>

data.固定データ.治安指標 と data.日本固定データ.治安指標 を使って以下のHTML表を出力すること：

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:35%;">項目</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:32%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:33%;">日本</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">殺人率（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】・【出典】）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.治安指標.殺人率（10万人あたり）.値】（【出典・年】）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">交通事故死亡率（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】・【出典】）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.治安指標.交通事故死亡率（10万人あたり）.値】（【出典・年】）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">自殺率（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】・【出典】）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.治安指標.自殺率（10万人あたり）.値】（【出典・年】）</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">刑務所収容率（10万人あたり）</td><td style="border:1px solid #ddd;padding:10px;">【値】（【年】・【出典】）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.治安指標.刑務所収容率（10万人あたり）.値】（【出典・年】）</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">GPI（世界平和度指数）</td><td style="border:1px solid #ddd;padding:10px;">スコア【スコア】・【順位】（【年】・【出典】）</td><td style="border:1px solid #ddd;padding:10px;">スコア【data.日本固定データ.治安指標.GPI スコア.値】・【data.日本固定データ.治安指標.GPI 順位.値】（【出典・年】）</td></tr>
  </tbody>
</table>

外務省危険レベルが1以上の場合のみ以下を出力：
- レベル1：「⚠️ 外務省から「十分注意」が出てるニャ。旅行前に必ず確認してほしいニャ。」
- レベル2：「⚠️ 外務省から「不要不急の渡航自粛」が出てるニャ。よほどの理由がない限り行かない方がいいニャ。」
- レベル3：「🚨 外務省から「渡航中止勧告」が出てるニャ！！絶対に行っちゃダメニャ！！」
- レベル4：「🚨 外務省から「退避勧告」が出てるニャ！！既に滞在している人はすぐ逃げてほしいニャ！！」

<h3>刑務所収容者数の推移</h3>

data.固定データ.刑務所推移 と data.日本固定データ.刑務所推移 を使ってChart.jsグラフをHTMLで出力すること。
厳守事項：JSONデータに存在する年と数値のみ使用すること。学習データで補完・追加禁止。

<div style="max-width:700px;margin:20px 0;">
<canvas id="prisonChart"></canvas>
</div>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
new Chart(document.getElementById('prisonChart'), {
  type: 'line',
  data: {
    labels: [【対象国と日本の年を統合してソートした配列。JSONに存在する年のみ使用すること】],
    datasets: [
      {
        label: '【対象国名】',
        data: [【対象国の各年の総収容者数。JSONにない年はnull。学習データ補完禁止】],
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231,76,60,0.1)',
        tension: 0.3,
        pointRadius: 5,
        spanGaps: false
      },
      {
        label: '日本',
        data: [【日本の各年の総収容者数。JSONにない年はnull。学習データ補完禁止】],
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39,174,96,0.1)',
        borderDash: [5,5],
        tension: 0.3,
        pointRadius: 5,
        spanGaps: false
      }
    ]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: '刑務所収容者数の推移' }
    },
    scales: { y: { beginAtZero: false, ticks: { callback: function(v) { return v.toLocaleString() + '人'; } } } }
  }
});
</script>
<p class="citation">出典：World Prison Brief</p>

<h3>死因比較</h3>

data.固定データ.死因トップ10 と data.日本固定データ.死因トップ10 を使って以下のHTML表を出力すること：

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:15%;">順位</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:42%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:43%;">日本</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;">1位</td><td style="border:1px solid #ddd;padding:10px;">【死因1位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因1位.死因】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">2位</td><td style="border:1px solid #ddd;padding:10px;">【死因2位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因2位.死因】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;">3位</td><td style="border:1px solid #ddd;padding:10px;">【死因3位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因3位.死因】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">4位</td><td style="border:1px solid #ddd;padding:10px;">【死因4位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因4位.死因】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;">5位</td><td style="border:1px solid #ddd;padding:10px;">【死因5位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因5位.死因】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">6位</td><td style="border:1px solid #ddd;padding:10px;">【死因6位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因6位.死因】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;">7位</td><td style="border:1px solid #ddd;padding:10px;">【死因7位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因7位.死因】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">8位</td><td style="border:1px solid #ddd;padding:10px;">【死因8位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因8位.死因】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;">9位</td><td style="border:1px solid #ddd;padding:10px;">【死因9位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因9位.死因】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;">10位</td><td style="border:1px solid #ddd;padding:10px;">【死因10位】</td><td style="border:1px solid #ddd;padding:10px;">【日本死因10位.死因】</td></tr>
  </tbody>
</table>
<p class="citation">出典：【対象国の死因出典】 / 日本：厚生労働省 2025年人口動態統計</p>
---

<h2>④ 貿易の衡量</h2>

data.固定データ.貿易 を使って以下のHTML表を出力すること。シェアが空・欠測の場合はシェア列を出力しないこと：

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:10%;">順位</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:45%;">輸出品目</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:45%;">輸入品目</th>
    </tr>
  </thead>
  <tbody>
    【輸出・輸入トップ10を1位〜10位まで1行ずつ出力。偶数行はbackground:#fafafa】
  </tbody>
</table>
<p style="font-size:12px;color:#888;">出典：【出典】</p>

<h3>主要貿易相手国</h3>

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:10%;">順位</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:60%;">国名</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:30%;">シェア</th>
    </tr>
  </thead>
  <tbody>
    【貿易相手国トップ10を1位〜10位まで1行ずつ出力。偶数行はbackground:#fafafa。シェアは%表示】
  </tbody>
</table>
<p style="font-size:12px;color:#888;">出典：【出典】</p>

貿易相手国について、以下のルールで200〜300文字の解説を出力すること：
- 上位3カ国との関係性の特徴を語ること
- 日本との貿易関係（data.日本固定データ.貿易と照合）を必ず含めること
- 数値（シェア%）を使って具体的に語ること

---

<h2>⑤ 生活・価値の衡量（物価比較）</h2>

data.固定データ.物価 と data.日本固定データ.物価 を使って以下のHTML表を出力すること：

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:35%;">項目</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:32%;">{{ $json.対象国 }}</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:33%;">日本</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🍺 ビール（市販500ml）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.ビール（市販500ml）.値（円）】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🚬 タバコ（マルボロ1箱）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.タバコ（マルボロ1箱20本）.値（円）】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">💧 ミネラルウォーター（500ml）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.ミネラルウォーター（500ml）.値（円）】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🍔 ビッグマック（1個）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.ビッグマック（1個）.値（円）】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">⛽ ガソリン（1L）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.ガソリン（1L）.値（円）】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🍜 外食（安めの店・1食）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.外食（安めの店・1食）.値（円）】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">💡 電気・水道・ガス（月額）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.電気・水道・ガス（月額・85㎡）.値（円）】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">🏠 家賃（1LDK・市内）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.家賃（1LDK・市内）.値（円）】</td></tr>
    <tr><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">💴 平均月収（手取り）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.平均月収（手取り）.値（円）】</td></tr>
    <tr style="background:#fafafa;"><td style="border:1px solid #ddd;padding:10px;font-weight:bold;">📺 Netflix（スタンダード）</td><td style="border:1px solid #ddd;padding:10px;">【現地通貨】（【円換算】円）</td><td style="border:1px solid #ddd;padding:10px;">【data.日本固定データ.物価.Netflix（スタンダード・広告なし）.値（円）】</td></tr>
  </tbody>
</table>
<p style="font-size:12px;color:#888;">※算出レート：1 【通貨コード】 = 【為替レート】 JPY（【為替取得日】現在）</p>
<p style="font-size:12px;color:#888;">出典：Numbeo, Cost of Living in {{ $json.対象国 }}, {{ $now.toFormat('yyyy年') }}更新 / 日本：Numbeo, Cost of Living in Japan, 2026年更新 / Netflix公式サイト</p>

---

<h2>⑥ 歴史的背景（近代100年）</h2>

data.対象国データ_記事.歴史的背景 を使って以下のHTML表を出力すること：

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:10%;">年</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:25%;">事象名</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:65%;">概要</th>
    </tr>
  </thead>
  <tbody>
    【歴史的背景を1行ずつ出力。深刻な事象（虐殺・紛争・クーデター等）の行はbackground:#fff3f3を付ける】
  </tbody>
</table>

---

<h2>⑦ 直近の動向</h2>

data.対象国データ_記事.直近の動向 を使って以下を出力すること：

<p>【政治経済社会の内容（800〜1000文字）】</p>
<p>🔍 <strong>驚きの統計・習慣：</strong>【驚く統計や習慣の内容（800〜1000文字）】</p>
<p>🇯🇵 <strong>日本との関連：</strong>【日本との関連の内容】</p>
【エラー猫の一言を最後に付ける】

---

<h2>⑧ 映像で知る{{ $json.対象国 }}</h2>

data.対象国データ_記事.映像作品 にデータが存在する場合のみ出力。存在しない・空の場合はこのセクションごと出力しない。

【必須：出力前に必ず検索ツールを使うこと】
1. 「{{ $json.対象国 }} documentary film imdb」
2. 「{{ $json.対象国 }} 映画 実話 Wikipedia」
3. 「{{ $json.対象国 }} war genocide film」（紛争・虐殺がある国のみ）

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:5%;">#</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:30%;">タイトル</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:12%;">種別</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:10%;">公開年</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:28%;">概要</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:15%;">リンク</th>
    </tr>
  </thead>
  <tbody>
    【映像作品を1行ずつ出力。
    - is_seriousがtrueの行はbackground:#fff3f3を付け、#列に⚠️を表示
    - wikipedia_urlがある場合はWikipediaリンクボタンを出力
    - imdb_urlがある場合はIMDbリンクボタンを出力
    - タイトル_日本語と原題が同じ場合は原題のみ表示
    - 最大10作品まで】
  </tbody>
</table>
【深刻な作品が3件以上の場合はエラー猫コメントなし。3件未満の場合はエラー猫の一言を付ける】

---

<h2>⑨ 特別枠：{{ $json.対象国 }}映画 歴代興行収入ランキング TOP10</h2>

data.対象国データ_記事.興行収入ランキング にデータが存在する場合のみ出力。存在しない・空の場合はこのセクションごと出力しない。

<table style="border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;">
  <thead>
    <tr>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:8%;">順位</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:30%;">タイトル</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:10%;">公開年</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:22%;">観客動員数 / 興行収入</th>
      <th style="border:1px solid #ddd;padding:10px;background:#f0f8f8;text-align:left;width:30%;">リンク</th>
    </tr>
  </thead>
  <tbody>
    【興行収入ランキングを1行ずつ出力。
    - is_seriousがtrueの行はbackground:#fff3f3を付ける
    - wikipedia_urlがある場合はWikipediaリンクボタンを出力
    - imdb_urlがある場合はIMDbリンクボタンを出力
    - 原題でYouTube予告編リンクボタンを出力】
  </tbody>
</table>
<p style="font-size:12px;color:#888;">出典：【出典】</p>
【深刻な作品が3件以上の場合はエラー猫コメントなし。3件未満の場合はエラー猫の一言を付ける】

---

### 【ライブ検索・実行証明】

🔍 **リアルタイム検索・実行ログ**
- **最終データ更新**: {{ $now.toFormat('yyyy年MM月dd日 HH:mm:ss') }} (JST)
- **為替レート取得**: 1 【通貨コード】 = 【為替レート】 JPY（【為替取得日】現在）
- **最新ニュース照合**: {{ $json.対象国 }} に関する直近6ヶ月以内の主要ニュース3件を確認済
- **映像ソース確認**: Wikipedia(日/英)およびIMDbデータベースを最新状態でスキャン完了

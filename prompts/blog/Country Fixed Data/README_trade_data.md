# 貿易データ・バルク取得＆ローカル加工 運用マニュアル

貿易データを UN Comtrade や IMF DOTS から取得し、ローカル環境で軽量なデータ（CSV/JSON）に加工して安定運用するためのマニュアルです。

---

## 1. 運用システム概要

毎回ブログ生成（n8n）の実行時に外部の貿易APIを叩く方式は、API制限やネットワークエラーにより動作が不安定になる原因となります。
本システムでは、**あらかじめバルクデータをダウンロードし、ローカルで軽量な固定データに加工して保持する方式**を採用します。

- **品目データ**: **UN Comtrade** から取得（HSコード2桁の大分類。例：「自動車」「電気機器」など）
- **相手国データ**: **IMF DOTS** から取得（取引額と相手国の構成シェア）
- **出力結果**: 各国の貿易データを1行にフラット化した統合CSV (`trade_summary.csv`) および、国ごとの個別JSON (`USA.json` など)

---

## 2. 元データの取得方法

### アプローチA: 手動ダウンロード（推奨・APIキー不要で最も安定）

年に1〜2回程度、各データポータルから世界全体のバルクデータを手動でダウンロードして処理します。

#### ① UN Comtrade データポータルからダウンロード
1. [UN Comtrade Plus](https://comtradeplus.un.org/) にアクセスします。
2. （推奨）右上から無料のアカウント登録を行い、ログインします。
3. メニューから **「Data Query」** または **「Bulk Download」** を開きます。
4. 以下の条件でクエリを設定します：
   - **Type / Freq**: `Goods` / `Annual`
   - **HS (as reported)**: 最も新しいバージョンを選択
   - **Reporter**: `All` (またはブログの対象国のみ)
   - **Partner**: `World` (品目別の合計額を取得するため)
   - **Commodity Code**: `AG2` (HS2桁コード)
   - **Flow**: `Export` および `Import`
   - **Period**: 取得したい西暦年（例: `2024`）
5. データをCSV形式でダウンロードし、ファイルを `comtrade_bulk_2024.csv` として保存します。

#### ② IMF DOTS データポータルからダウンロード
1. [IMF Data Portal](https://data.imf.org/) にアクセスします。
2. 検索バーに **「International trade in goods by partner country (IMTS / DOTS)」** と入力し、該当データセットを開きます。
3. 画面の指示に従い、バルクダウンロード（Bulk Download）を選択します。
4. 以下の条件でフィルタを設定してダウンロードします：
   - **Reporter**: `All Countries`
   - **Partner**: `All Countries` (※ `World` や `Total` 以外の個別国)
   - **Indicator**: `Exports, f.o.b. Value` (主要貿易相手国は輸出ベースで算出するため)
   - **Period**: 取得したい西暦年（例: `2024`）
5. CSV形式でダウンロードし、ファイルを `dots_bulk_2024.csv` として保存します。

---

### アプローチB: APIによる自動分割取得（UN Comtradeのみ）

特定の国に対象を絞り、APIで自動 chunking（分割）しながら取得します。
※ APIキー（Primary Key）をお持ちの場合は高速ですが、キーがない場合はプレビュー用の制限（レコード数上限小）が適用されます。

```bash
# APIキーを使用して、指定した複数国のデータを自動取得
python download_trade_api.py --countries USA,JPN,DEU,FRA --year 2024 --api-key YOUR_COMTRADE_API_KEY --output-dir downloads
```

---

## 3. Pythonスクリプトによるデータ加工

ダウンロードした巨大なバルクCSVファイルを、軽量なブログ用データに一括加工します。

### 必要なライブラリのインストール
処理には `pandas` ライブラリが必要です。
```bash
pip install pandas requests
```

### 加工スクリプトの実行方法
`process_trade.py` を実行します。`--countries` で対象国を絞り込むと、処理が高速になりファイルもさらに軽量化されます。指定しない場合は全件処理します。

```bash
python process_trade.py \
  --comtrade downloads/comtrade_bulk_2024.csv \
  --dots downloads/dots_bulk_2024.csv \
  --output-dir output \
  --countries JPN,USA,DEU,GBR,FRA,IND,CHN,KOR,AUS,BRA
```

#### 出力される成果物:
- **`output/trade_summary.csv`**: 全対象国をまとめたフラットな統合CSV（JavaScriptから極めて扱いやすい構造です）
- **`output/{ISO3}.json`**: 国ごとに詳細に切り出されたJSONデータ（例: `USA.json`）

---

## 4. JSコード（n8nなど）との連携方法

軽量化された CSV/JSON は、既存の JavaScript ノード（例: `④（貿易）.js`）で以下のように直接ファイル読み込みを行うだけで利用できるようになり、API呼び出しにかかる時間がゼロになります。

### Node.js（n8n / JavaScriptノード）での読み込みコード例

```javascript
// 国別 JSON ファイルをローカルファイルシステムから直接読み込む例
const fs = require('fs');
const path = require('path');

const countryCode = $input.first().json.code3; // 例: "USA"
const dataDir = "/path/to/your/output"; // Pythonスクリプトの出力先

try {
  const filePath = path.join(dataDir, `${countryCode}.json`);
  const rawData = fs.readFileSync(filePath, 'utf8');
  const tradeData = JSON.parse(rawData);
  
  return [{ json: tradeData }];
} catch (e) {
  // ファイルがない場合のフォールバック（以前のAPI取得コードを動かすなど）
  throw new Error(`貿易データファイルが見つかりません (${countryCode}): ${e.message}`);
}
```

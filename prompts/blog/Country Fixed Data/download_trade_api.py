#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UN Comtrade 無料 API 分割取得スクリプト
無料プランのレート制限（1日500リクエスト、1回10万件）に対応し、
指定した国・年の貿易データを分割して安定的に取得し、CSVとしてローカルに保存します。
"""

import os
import sys
import time
import json
import argparse
import requests
import pandas as pd

# =====================================================================
# 1. 定数とデフォルト値の定義
# =====================================================================
# ISO3 -> M49 マッピング（Comtrade APIではM49数値コードが必要）
ISO3_TO_M49 = {
    "AFG": "4", "ALB": "8", "DZA": "12", "AND": "20", "AGO": "24", "ATG": "28", "ARG": "32", "ARM": "51",
    "AUS": "36", "AUT": "40", "AZE": "31", "BHS": "44", "BHR": "48", "BGD": "50", "BRB": "52", "BLR": "112",
    "BEL": "56", "BLZ": "84", "BEN": "204", "BTN": "64", "BOL": "68", "BIH": "70", "BWA": "72", "BRA": "76",
    "BRN": "96", "BGR": "100", "BFA": "854", "BDI": "108", "CPV": "132", "KHM": "116", "CMR": "120",
    "CAN": "124", "CAF": "140", "TCD": "148", "CHL": "152", "CHN": "156", "COL": "170", "COM": "174",
    "COD": "180", "COG": "178", "CRI": "188", "CIV": "384", "HRV": "191", "CUB": "192", "CYP": "196",
    "CZE": "203", "DNK": "208", "DJI": "262", "DOM": "214", "ECU": "218", "EGY": "818", "SLV": "222",
    "GNQ": "226", "ERI": "232", "EST": "233", "SWZ": "748", "ETH": "231", "FJI": "242", "FIN": "246",
    "FRA": "250", "GAB": "266", "GMB": "270", "GEO": "268", "DEU": "276", "GHA": "288", "GRC": "300",
    "GRD": "308", "GTM": "320", "GIN": "324", "GNB": "624", "GUY": "328", "HTI": "332", "HND": "340",
    "HUN": "348", "ISL": "352", "IND": "356", "IDN": "360", "IRN": "364", "IRQ": "368", "IRL": "372",
    "ISR": "376", "ITA": "380", "JAM": "388", "JPN": "392", "JOR": "400", "KAZ": "398", "KEN": "404",
    "KIR": "296", "PRK": "408", "KOR": "410", "KWT": "414", "KGZ": "417", "LAO": "418", "LVA": "428",
    "LBN": "422", "LSO": "426", "LBR": "430", "LBY": "434", "LIE": "438", "LTU": "440", "LUX": "442",
    "MDG": "450", "MWI": "454", "MYS": "458", "MDV": "462", "MLI": "466", "MLT": "470", "MHL": "584",
    "MRT": "478", "MUS": "480", "MEX": "484", "FSM": "583", "MDA": "498", "MCO": "492", "MNG": "496",
    "MNE": "499", "MAR": "504", "MOZ": "508", "MMR": "104", "NAM": "516", "NRU": "520", "NPL": "524",
    "NLD": "528", "NZL": "554", "NIC": "558", "NER": "562", "NGA": "566", "MKD": "807", "NOR": "578",
    "OMN": "512", "PAK": "586", "PLW": "585", "PAN": "591", "PNG": "598", "PRY": "600", "PER": "604",
    "PHL": "608", "POL": "616", "PRT": "620", "QAT": "634", "ROU": "642", "RUS": "643", "RWA": "646",
    "KNA": "659", "LCA": "662", "VCT": "670", "WSM": "882", "SMR": "674", "STP": "678", "SAU": "682",
    "SEN": "686", "SRB": "688", "SLE": "694", "SGP": "702", "SVK": "703", "SVN": "705", "SLB": "90",
    "SOM": "706", "ZAF": "710", "SSD": "728", "ESP": "724", "LKA": "144", "SDN": "729", "SUR": "740",
    "SWE": "752", "CHE": "756", "SYR": "760", "TWN": "158", "TJK": "762", "TZA": "834", "THA": "764",
    "TLS": "626", "TGO": "768", "TON": "776", "TTO": "780", "TUN": "788", "TUR": "792", "TKM": "795",
    "TUV": "798", "UGA": "800", "UKR": "804", "ARE": "784", "GBR": "826", "USA": "840", "URY": "858",
    "UZB": "860", "VUT": "548", "VEN": "862", "VNM": "704", "YEM": "887", "ZMB": "894", "ZWE": "716"
}

# APIエンドポイント
API_BASE_URL = "https://comtradeapi.un.org/data/v1/get/C/A/HS"
PREVIEW_URL = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"

# =====================================================================
# 2. API呼び出し関数（レート制限対策）
# =====================================================================
def fetch_comtrade_data(params, api_key=None, max_retries=5):
    """
    Comtrade APIからデータを取得する。
    429 Too Many Requestsの際に自動で待機し、再試行を行う。
    """
    url = API_BASE_URL if api_key else PREVIEW_URL
    headers = {}
    if api_key:
        headers["Ocp-Apim-Subscription-Key"] = api_key

    retries = 0
    backoff_factor = 2  # 指数バックオフの係数

    while retries < max_retries:
        try:
            print(f"[*] API呼び出し中: {url} | パラメータ: {params}")
            response = requests.get(url, params=params, headers=headers, timeout=30)
            
            # 正常終了
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
                
            # レート制限 (Too Many Requests)
            elif response.status_code == 429:
                # APIヘッダーに Retry-After がある場合はそれに従い、なければ指数バックオフ
                retry_after = int(response.headers.get("Retry-After", 0))
                sleep_time = retry_after if retry_after > 0 else (backoff_factor ** retries)
                print(f"[!] レート制限に達しました (HTTP 429)。{sleep_time} 秒間待機して再試行します...")
                time.sleep(sleep_time)
                retries += 1
                
            # その他のエラー
            else:
                print(f"[!] エラーが発生しました。ステータスコード: {response.status_code}")
                print(f"詳細: {response.text}")
                retries += 1
                time.sleep(2)
                
        except requests.exceptions.RequestException as e:
            print(f"[!] 通信エラーが発生しました: {e}")
            retries += 1
            time.sleep(5)
            
    print("[!] 最大再試行回数を超えました。データの取得に失敗しました。")
    return []

# =====================================================================
# 3. メイン取得ループ
# =====================================================================
def main():
    parser = argparse.ArgumentParser(description="UN Comtrade API 安定取得ツール（レジューム機能付き）")
    parser.add_argument("--countries", required=True, help="カンマ区切りの国名コード（例: USA,JPN,DEU）")
    parser.add_argument("--year", type=int, default=2024, help="対象年（西暦4桁）")
    parser.add_argument("--api-key", help="UN Comtrade APIのサブスクリプションキー（指定しない場合はプレビューAPIを使用）")
    parser.add_argument("--output-dir", default="./downloads", help="CSVデータの出力先ディレクトリ")
    parser.add_argument("--delay", type=float, default=1.5, help="リクエスト間の待機秒数（APIサーバー負荷軽減のため）")
    
    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)
    
    country_list = [c.strip().upper() for c in args.countries.split(',')]
    
    print(f"[*] {len(country_list)} カ国の貿易データの処理を開始します。")
    
    for i, country in enumerate(country_list):
        m49_code = ISO3_TO_M49.get(country)
        if not m49_code:
            print(f"[!] 国コードが見つかりません。スキップします: {country}")
            continue
            
        # 個別国の保存ファイルパス
        country_file = os.path.join(args.output_dir, f"{country}_comtrade_{args.year}.csv")
        
        # すでにダウンロード済みの場合はスキップ（レジューム）
        if os.path.exists(country_file):
            print(f"[*] [{i+1}/{len(country_list)}] {country} は取得済みのためスキップします: {country_file}")
            continue
            
        print(f"[*] [{i+1}/{len(country_list)}] APIからデータを取得中: {country} (M49: {m49_code})")
        country_records = []
        
        # 1. 輸出データ (品目別: 相手国=0:世界)
        export_params = {
            "reporterCode": m49_code,
            "flowCode": "X",
            "period": args.year,
            "partnerCode": "0",  # World
            "cmdCode": "AG2",   # HS2桁分類
            "includeDesc": "true"
        }
        exports = fetch_comtrade_data(export_params, args.api_key)
        country_records.extend(exports)
        time.sleep(args.delay)
        
        # 2. 輸入データ (品目別: 相手国=0:世界)
        import_params = {
            "reporterCode": m49_code,
            "flowCode": "M",
            "period": args.year,
            "partnerCode": "0",  # World
            "cmdCode": "AG2",   # HS2桁分類
            "includeDesc": "true"
        }
        imports = fetch_comtrade_data(import_params, args.api_key)
        country_records.extend(imports)
        time.sleep(args.delay)
        
        # 個別ファイルに保存
        if country_records:
            df_country = pd.DataFrame(country_records)
            cols_to_keep = ['period', 'reporterCode', 'reporterISO', 'flowCode', 'cmdCode', 'cmdDesc', 'partnerCode', 'partnerISO', 'primaryValue']
            cols_to_keep = [c for c in cols_to_keep if c in df_country.columns]
            df_country = df_country[cols_to_keep]
            df_country.to_csv(country_file, index=False, encoding='utf-8-sig')
            print(f"[+] 保存完了（国別）: {country_file} ({len(df_country)} レコード)")
        else:
            print(f"[!] {country} のデータが取得できませんでした（一時スキップ）。")
            
    # --- 最終マージ処理 ---
    print("[*] 国別CSVファイルをマージして最終バルクCSVを生成します...")
    all_dfs = []
    for country in country_list:
        c_file = os.path.join(args.output_dir, f"{country}_comtrade_{args.year}.csv")
        if os.path.exists(c_file):
            try:
                df_c = pd.read_csv(c_file, encoding='utf-8-sig')
                all_dfs.append(df_c)
            except Exception as e:
                print(f"[!] {c_file} の読み込みに失敗しました: {e}")
                
    if all_dfs:
        df_bulk = pd.concat(all_dfs, ignore_index=True)
        bulk_file = os.path.join(args.output_dir, f"comtrade_bulk_{args.year}.csv")
        df_bulk.to_csv(bulk_file, index=False, encoding='utf-8-sig')
        print(f"[++] バルクCSVマージ完了: {bulk_file} (合計 {len(df_bulk)} レコード)")
    else:
        print("[!] マージ対象の国別データが存在しませんでした。")

if __name__ == "__main__":
    main()

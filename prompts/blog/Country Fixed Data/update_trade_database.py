#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
貿易データベース一括更新オーケストレータ
ダウンロード -> データ処理・マージ -> Google Sheets同期を一括実行します。
"""

import os
import sys
import subprocess
import argparse

# process_trade.py から国コード一覧をインポートするためのパス設定
# (直接読み込むか、ここに定義を持っておく)
COUNTRIES_LIST = [
    "AFG", "ALB", "DZA", "AND", "AGO", "ATG", "ARG", "ARM", "AUS", "AUT", "AZE", "BHS", "BHR", "BGD", "BRB", "BLR",
    "BEL", "BLZ", "BEN", "BTN", "BOL", "BIH", "BWA", "BRA", "BRN", "BGR", "BFA", "BDI", "CPV", "KHM", "CMR",
    "CAN", "CAF", "TCD", "CHL", "CHN", "COL", "COM", "COD", "COG", "CRC", "CIV", "HRV", "CUB", "CYP", "CZE",
    "DNK", "DJI", "DOM", "DMA", "ECU", "EGY", "SLV", "GNQ", "ERI", "EST", "SWZ", "ETH", "FJI", "FIN", "FRA", "GAB",
    "GMB", "GEO", "DEU", "GHA", "GRC", "GRD", "GTM", "GIN", "GNB", "GUY", "HTI", "HND", "HUN", "ISL", "IND",
    "IDN", "IRN", "IRQ", "IRL", "ISR", "ITA", "JAM", "JPN", "JOR", "KAZ", "KEN", "KIR", "PRK", "KOR", "KWT",
    "KGZ", "LAO", "LVA", "LBN", "LSO", "LBR", "LBY", "LIE", "LTU", "LUX", "MDG", "MWI", "MYS", "MDV", "MLI",
    "MLT", "MHL", "MRT", "MUS", "MEX", "FSM", "MDA", "MCO", "MNG", "MNE", "MAR", "MOZ", "MMR", "NAM", "NRU",
    "NPL", "NLD", "NZL", "NIC", "NER", "NGA", "MKD", "NOR", "OMN", "PAK", "PLW", "PAN", "PNG", "PRY", "PER",
    "PHL", "POL", "PRT", "QAT", "ROU", "RUS", "RWA", "KNA", "LCA", "VCT", "WSM", "SMR", "STP", "SAU", "SEN",
    "SRB", "SLE", "SGP", "SVK", "SVN", "SLB", "SOM", "ZAF", "SSD", "ESP", "LKA", "SDN", "SUR", "SWE", "CHE",
    "SYR", "TWN", "TJK", "TZA", "THA", "TLS", "TGO", "TON", "TTO", "TUN", "TUR", "TKM", "TUV", "UGA", "UKR",
    "ARE", "GBR", "USA", "URY", "UZB", "VUT", "VAT", "VEN", "VNM", "YEM", "ZMB", "ZWE", "FRO", "MSR", "SYC", "BMU",
    "CYM", "MAC", "HKG"
]

def run_command(cmd, desc):
    print(f"\n=====================================================================")
    print(f"[*] 実行中: {desc}")
    print(f"[*] コマンド: {' '.join(cmd)}")
    print(f"=====================================================================")
    
    try:
        # リアルタイムで標準出力を流す
        result = subprocess.run(cmd, check=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[!] エラーが発生しました ({desc}): {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="貿易データベース一括更新オーケストレータ")
    parser.add_argument("--api-key", required=True, help="UN Comtrade APIのサブスクリプションキー")
    parser.add_argument("--spreadsheet-id", required=True, help="GoogleスプレッドシートのID")
    parser.add_argument("--year", type=int, default=2024, help="対象年（西暦4桁）")
    parser.add_argument("--countries", help="個別に指定する国名コード（カンマ区切り）。指定がない場合は全件更新します")
    parser.add_argument("--credentials", default="./credentials.json", help="Google Sheets API認証JSONのパス")
    parser.add_argument("--dots-csv", default="./downloads/dots_bulk.csv", help="IMF DOTSバルクCSVのパス")
    
    args = parser.parse_args()

    # 1. 更新対象国の決定
    if args.countries:
        countries_to_process = args.countries
    else:
        countries_to_process = ",".join(COUNTRIES_LIST)
        
    print(f"[*] 更新処理を開始します。対象年: {args.year}")
    print(f"[*] 対象国件数: {len(countries_to_process.split(','))} カ国")

    # --- STEP 1: データダウンロード ---
    download_cmd = [
        sys.executable, "download_trade_api.py",
        "--countries", countries_to_process,
        "--year", str(args.year),
        "--api-key", args.api_key,
        "--output-dir", "./downloads",
        "--delay", "1.5"
    ]
    if not run_command(download_cmd, "STEP 1: UN Comtrade APIから貿易データの取得"):
        print("[!] ダウンロードフェーズでエラーが発生しました。処理を中断します。")
        sys.exit(1)

    # --- STEP 2: データ加工・マージ ---
    # Comtradeのバルクパスを自動生成
    comtrade_csv = f"./downloads/comtrade_bulk_{args.year}.csv"
    
    if not os.path.exists(comtrade_csv):
        print(f"[!] ComtradeのバルクCSVファイルが見つかりません: {comtrade_csv}")
        sys.exit(1)
        
    if not os.path.exists(args.dots_csv):
        print(f"[!] IMF DOTSのバルクCSVファイルが見つかりません: {args.dots_csv}")
        print("※IMFのDOTSバルクデータ(dots_bulk.csv)がダウンロードフォルダに配置されている必要があります。")
        sys.exit(1)

    process_cmd = [
        sys.executable, "process_trade.py",
        "--comtrade", comtrade_csv,
        "--dots", args.dots_csv,
        "--output-dir", "./output"
    ]
    
    if args.countries:
        process_cmd.extend(["--countries", args.countries])

    if not run_command(process_cmd, "STEP 2: 貿易データの加工とマージ (trade_summary.csvの生成)"):
        print("[!] データ処理フェーズでエラーが発生しました。処理を中断します。")
        sys.exit(1)

    # --- STEP 3: Google Sheets同期 ---
    sync_cmd = [
        sys.executable, "sync_to_sheets.py",
        "--csv", "./output/trade_summary.csv",
        "--spreadsheet-id", args.spreadsheet_id,
        "--credentials", args.credentials
    ]
    if not run_command(sync_cmd, "STEP 3: Googleスプレッドシートへの同期"):
        print("[!] Google Sheets同期フェーズでエラーが発生しました。")
        sys.exit(1)

    print("\n[++] すべての処理が正常に完了しました！貿易データベースは最新状態です。")

if __name__ == "__main__":
    main()

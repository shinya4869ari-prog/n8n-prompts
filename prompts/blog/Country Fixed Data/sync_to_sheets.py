#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Googleスプレッドシート「④貿易」自動同期スクリプト
ローカルの trade_summary.csv のデータをGoogle Sheetsに一括同期します。
"""

import os
import sys
import csv
import argparse

try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:
    print("[!] 必須ライブラリがインストールされていません。")
    print("インストールコマンド: pip install gspread google-auth")
    sys.exit(1)

# スプレッドシートのデフォルト設定
DEFAULT_CREDENTIALS_FILE = "credentials.json"
DEFAULT_SHEET_NAME = "④貿易"

def main():
    parser = argparse.ArgumentParser(description="Googleスプレッドシート「④貿易」自動同期ツール")
    parser.add_argument("--csv", default="./output/trade_summary.csv", help="同期するCSVファイルのパス")
    parser.add_argument("--spreadsheet-id", required=True, help="GoogleスプレッドシートのID（URLの /d/ と /edit の間の文字列）")
    parser.add_argument("--sheet-name", default=DEFAULT_SHEET_NAME, help="対象シート名")
    parser.add_argument("--credentials", default=DEFAULT_CREDENTIALS_FILE, help="Googleサービスアカウント認証情報JSONのパス")

    args = parser.parse_args()

    # 1. 認証ファイルの確認
    if not os.path.exists(args.credentials):
        print(f"[!] Google API認証情報ファイルが見つかりません: {args.credentials}")
        print("スプレッドシートに同期するには、Google Cloudでサービスアカウントキー(JSON)を作成し、")
        print(f"このディレクトリに「{args.credentials}」として配置する必要があります。")
        sys.exit(1)

    # 2. CSVファイルの確認
    if not os.path.exists(args.csv):
        print(f"[!] 同期対象のCSVファイルが見つかりません: {args.csv}")
        sys.exit(1)

    # 3. CSVの読み込み
    print(f"[*] CSVファイルを読み込み中: {args.csv}")
    try:
        with open(args.csv, 'r', encoding='utf-8-sig') as f:
            reader = csv.reader(f)
            csv_data = list(reader)
    except Exception as e:
        print(f"[!] CSVの読み込みに失敗しました: {e}")
        sys.exit(1)

    if not csv_data:
        print("[!] CSVデータが空です。同期を中止します。")
        sys.exit(1)

    # 4. Google Sheets API 認証・接続
    print("[*] Google Sheets APIに接続中...")
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    try:
        creds = Credentials.from_service_account_file(args.credentials, scopes=scopes)
        client = gspread.authorize(creds)
        spreadsheet = client.open_by_key(args.spreadsheet_id)
        sheet = spreadsheet.worksheet(args.sheet_name)
    except gspread.exceptions.SpreadsheetNotFound:
        print(f"[!] 指定されたスプレッドシートIDが見つかりません: {args.spreadsheet_id}")
        sys.exit(1)
    except gspread.exceptions.WorksheetNotFound:
        print(f"[!] 指定されたワークシート名が見つかりません: {args.sheet_name}")
        sys.exit(1)
    except Exception as e:
        print(f"[!] Google Sheets接続エラー: {e}")
        sys.exit(1)

    # 5. シートの更新
    print(f"[*] スプレッドシートを更新しています（シート名: {args.sheet_name}）...")
    try:
        # シートをクリア
        sheet.clear()
        
        # 一括書き込み（Batch Update）
        # 行列範囲を自動計算して一挙に更新
        sheet.update(values=csv_data, range_name='A1')
        print(f"[+] 同期完了！合計 {len(csv_data)} 行のデータを書き込みました。")
        
    except Exception as e:
        print(f"[!] シートの更新に失敗しました: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

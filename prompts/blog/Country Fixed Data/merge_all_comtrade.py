import os
import glob
import pandas as pd

base_csv = "downloads/comtrade_bulk.csv"
combined_csv = "downloads/comtrade_bulk_combined.csv"

# 1. Read base comtrade_bulk.csv with index_col=False
print(f"[*] Reading base bulk CSV: {base_csv}")
try:
    df_base = pd.read_csv(base_csv, encoding_errors='replace', index_col=False)
    print(f"  [+] Base shape: {df_base.shape}")
except Exception as e:
    print(f"  [!] Failed to read base CSV: {e}")
    df_base = pd.DataFrame()

# 2. Collect all newly downloaded country CSVs
new_csv_files = glob.glob("downloads/*_comtrade_latest.csv")
print(f"[*] Found {len(new_csv_files)} new country CSV files to merge.")

new_dfs = []
for file_path in new_csv_files:
    try:
        df_country = pd.read_csv(file_path, encoding_errors='replace', index_col=False)
        new_dfs.append(df_country)
        print(f"  [+] Loaded {os.path.basename(file_path)} ({len(df_country)} records)")
    except Exception as e:
        print(f"  [!] Failed to read {file_path}: {e}")

# 3. Concatenate everything
if new_dfs:
    df_new_all = pd.concat(new_dfs, ignore_index=True)
    print(f"[*] Concatenating new data ({len(df_new_all)} records) with base data ({len(df_base)} records)...")
    
    # Standardize columns to match what process_trade.py expects
    # Standard columns: period, reporterCode, reporterISO, flowCode, cmdCode, cmdDesc, partnerCode, partnerISO, primaryValue
    # Ensure they have standard casing
    df_base.columns = [c.lower() for c in df_base.columns]
    rename_map = {
        'reporteriso': 'reporterISO', 'reporter_iso': 'reporterISO',
        'flowcode': 'flowCode', 'flow_code': 'flowCode',
        'cmdcode': 'cmdCode', 'cmd_code': 'cmdCode',
        'cmddesc': 'cmdDesc', 'cmd_desc': 'cmdDesc',
        'primaryvalue': 'primaryValue', 'primary_value': 'primaryValue'
    }
    df_base = df_base.rename(columns=rename_map)
    
    # Replace S19 with TWN and CRI with CRC in reporterISO for both base and new data
    if 'reporterISO' in df_base.columns:
        df_base['reporterISO'] = df_base['reporterISO'].replace('S19', 'TWN').replace('CRI', 'CRC')
    if 'reporterISO' in df_new_all.columns:
        df_new_all['reporterISO'] = df_new_all['reporterISO'].replace('S19', 'TWN').replace('CRI', 'CRC')
        
    # Standardize columns in new data too
    df_new_all = df_new_all.rename(columns=rename_map)
    
    # We only keep the columns that exist in the base dataframe or standard ones to avoid formatting issues
    common_cols = [c for c in df_new_all.columns if c in df_base.columns]
    if not common_cols:
        common_cols = ['period', 'reporterCode', 'reporterISO', 'flowCode', 'cmdCode', 'cmdDesc', 'partnerCode', 'partnerISO', 'primaryValue']
        
    df_combined = pd.concat([df_base, df_new_all[common_cols]], ignore_index=True)
else:
    df_combined = df_base

# 4. Save combined CSV
df_combined.to_csv(combined_csv, index=False, encoding='utf-8-sig')
print(f"[++] Combined CSV saved to {combined_csv} (Total shape: {df_combined.shape})")

import os
import time
import requests
import pandas as pd

api_key = 'a99dff933e9f4628b7469dbaad8b2026'
url = "https://comtradeapi.un.org/data/v1/get/C/A/HS"
output_dir = "downloads"
os.makedirs(output_dir, exist_ok=True)

# List of the 64 missing countries from the user's master lookup check
missing_countries = [
    "AND", "BGD", "BLR", "BWA", "BDI", "CMR", "TCD", "COM", "COG", "COD",
    "CRC", "CUB", "DJI", "DMA", "GNQ", "ERI", "SWZ", "ETH", "GAB", "GHA",
    "GIN", "GNB", "HTI", "IRN", "IRQ", "KIR", "LAO", "LBR", "LBY", "LIE",
    "MLI", "MHL", "FSM", "MCO", "MNG", "NRU", "NPL", "PRK", "PLW", "PNG",
    "RUS", "RWA", "KNA", "LCA", "VCT", "SMR", "STP", "SLE", "SLB", "SOM",
    "SSD", "SDN", "SYR", "TWN", "TJK", "TLS", "TON", "TKM", "TUV", "ARE",
    "VUT", "VAT", "VEN", "VNM"
]

# ISO3 to M49 mapping for these missing countries
# Note: For TWN, we use 490 (Other Asia)
ISO3_TO_M49 = {
    "AND": "20", "BGD": "50", "BLR": "112", "BWA": "72", "BDI": "108",
    "CMR": "120", "TCD": "148", "COM": "174", "COG": "178", "COD": "180",
    "CRC": "188", "CUB": "192", "DJI": "262", "DMA": "212", "GNQ": "226",
    "ERI": "232", "SWZ": "748", "ETH": "231", "GAB": "266", "GHA": "288",
    "GIN": "324", "GNB": "624", "HTI": "332", "IRN": "364", "IRQ": "368",
    "KIR": "296", "LAO": "418", "LBR": "430", "LBY": "434", "LIE": "438",
    "MLI": "466", "MHL": "584", "FSM": "583", "MCO": "492", "MNG": "496",
    "NRU": "520", "NPL": "524", "PRK": "408", "PLW": "585", "PNG": "598",
    "RUS": "643", "RWA": "646", "KNA": "659", "LCA": "662", "VCT": "670",
    "SMR": "674", "STP": "678", "SLE": "694", "SLB": "90", "SOM": "706",
    "SSD": "728", "SDN": "729", "SYR": "760", "TWN": "490", "TJK": "762",
    "TLS": "626", "TON": "776", "TKM": "795", "TUV": "798", "ARE": "784",
    "VUT": "548", "VAT": "336", "VEN": "862", "VNM": "704"
}

headers = {
    "Ocp-Apim-Subscription-Key": api_key
}

results_summary = []

def fetch_data_for_periods(m49_code, periods_str):
    params = {
        "reporterCode": m49_code,
        "flowCode": "X,M",
        "period": periods_str,
        "partnerCode": "0",  # World
        "cmdCode": "AG2",   # HS2桁
        "includeDesc": "true"
    }
    # Wait to avoid 429
    time.sleep(1.0)
    for retry in range(3):
        try:
            r = requests.get(url, params=params, headers=headers, timeout=20)
            if r.status_code == 200:
                return r.json().get("data", [])
            elif r.status_code == 429:
                sleep_time = int(r.headers.get("Retry-After", 5))
                print(f"  [!] Rate limited. Sleeping {sleep_time}s...")
                time.sleep(sleep_time)
            else:
                print(f"  [!] HTTP {r.status_code}: {r.text[:100]}")
                time.sleep(2)
        except Exception as e:
            print(f"  [!] Exception: {e}")
            time.sleep(2)
    return []

print(f"[*] Starting download for {len(missing_countries)} missing countries...")

for i, iso in enumerate(missing_countries):
    print(f"[{i+1}/{len(missing_countries)}] Processing {iso}...")
    m49 = ISO3_TO_M49.get(iso)
    if not m49:
        print(f"  [!] No M49 code found for {iso}. Skipping.")
        continue
        
    # Step 1: Query 2018-2024
    data = fetch_data_for_periods(m49, "2018,2019,2020,2021,2022,2023,2024")
    
    # Step 2: If no data, query 2010-2017
    if not data:
        print("  [*] No data for 2018-2024. Trying 2010-2017...")
        data = fetch_data_for_periods(m49, "2010,2011,2012,2013,2014,2015,2016,2017")
        
    if data:
        # Find latest available year in data
        df = pd.DataFrame(data)
        # Period field is string or int. Convert to int for comparison.
        df['period_int'] = df['period'].astype(int)
        latest_year = df['period_int'].max()
        
        # Filter to the latest year's data
        df_latest = df[df['period_int'] == latest_year]
        
        # Keep only required columns
        cols_to_keep = ['period', 'reporterCode', 'reporterISO', 'flowCode', 'cmdCode', 'cmdDesc', 'partnerCode', 'partnerISO', 'primaryValue']
        cols_to_keep = [c for c in cols_to_keep if c in df_latest.columns]
        df_save = df_latest[cols_to_keep]
        
        # Save as individual CSV file
        save_path = os.path.join(output_dir, f"{iso}_comtrade_latest.csv")
        df_save.to_csv(save_path, index=False, encoding='utf-8-sig')
        print(f"  [+] Success: Latest year {latest_year} ({len(df_save)} records) -> {save_path}")
        results_summary.append({
            "iso": iso,
            "status": "Success",
            "year": latest_year,
            "records": len(df_save)
        })
    else:
        print(f"  [-] Failed: No data reported for {iso} in Comtrade from 2010 to 2024.")
        results_summary.append({
            "iso": iso,
            "status": "Failed",
            "year": None,
            "records": 0
        })

print("\n[*] Summary:")
for res in results_summary:
    print(f"  {res['iso']}: {res['status']} | Year: {res['year']} | Records: {res['records']}")

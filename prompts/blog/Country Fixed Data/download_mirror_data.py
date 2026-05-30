import os
import time
import requests
import pandas as pd

api_key = 'a99dff933e9f4628b7469dbaad8b2026'
url = "https://comtradeapi.un.org/data/v1/get/C/A/HS"
output_dir = "downloads"
os.makedirs(output_dir, exist_ok=True)

# The 14 countries that failed direct download (no reported data)
mirror_countries = [
    "TCD", "GNQ", "ERI", "LIE", "MHL", "MCO", "NRU", "PRK", "SMR", "SOM", "SSD", "TKM", "TUV", "VAT"
]

# ISO3 to M49 mapping for these countries
ISO3_TO_M49 = {
    "TCD": "148", "GNQ": "226", "ERI": "232", "LIE": "438", "MHL": "584",
    "MCO": "492", "NRU": "520", "PRK": "408", "SMR": "674", "SOM": "706",
    "SSD": "728", "TKM": "795", "TUV": "798", "VAT": "336"
}

# 40 major reporting countries to use for mirror data
reporters = [
    "840", "156", "392", "276", "528", "250", "410", "380", "826", "356",
    "124", "702", "784", "643", "76", "756", "724", "616", "36", "792",
    "704", "458", "764", "360", "682", "710", "484", "56", "344", "490",
    "40", "372", "752", "578", "208", "246", "620", "300", "203", "348"
]
reporters_list = ",".join(reporters)

headers = {
    "Ocp-Apim-Subscription-Key": api_key
}

print(f"[*] Starting mirror data query for {len(mirror_countries)} countries...")

for i, iso in enumerate(mirror_countries):
    print(f"[{i+1}/{len(mirror_countries)}] Querying mirror data for {iso}...")
    m49 = ISO3_TO_M49.get(iso)
    if not m49:
        continue
        
    # Query years 2022, 2023, 2024
    params = {
        "reporterCode": reporters_list,
        "flowCode": "X,M",
        "period": "2022,2023,2024",
        "partnerCode": m49,
        "cmdCode": "AG2",
        "includeDesc": "true"
    }
    
    time.sleep(1.5) # Avoid 429
    data = []
    for retry in range(3):
        try:
            r = requests.get(url, params=params, headers=headers, timeout=30)
            if r.status_code == 200:
                data = r.json().get("data", [])
                break
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
            
    save_path = os.path.join(output_dir, f"{iso}_comtrade_latest.csv")
    
    if data:
        # We have mirror records. Process them!
        df = pd.DataFrame(data)
        # Find latest available year in data
        df['period_int'] = df['period'].astype(int)
        latest_year = df['period_int'].max()
        
        # Filter to the latest year
        df_latest = df[df['period_int'] == latest_year].copy()
        
        # Reconstruct reporter's view:
        # 1. Partner's import from reporter (flowCode = X) -> Reporter's export to partner (which is partner's import!)
        #    So flowCode = 'X' (other countries' exports to our missing country) becomes 'M' (missing country's imports)
        # 2. Partner's export to reporter (flowCode = M) -> Reporter's import from partner (which is partner's export!)
        #    So flowCode = 'M' (other countries' imports from our missing country) becomes 'X' (missing country's exports)
        
        reconstructed = []
        
        # Group by flowCode, cmdCode, cmdDesc to sum values across all reporting partners
        grouped = df_latest.groupby(['flowCode', 'cmdCode', 'cmdDesc'])['primaryValue'].sum().reset_index()
        
        for _, row in grouped.iterrows():
            orig_flow = row['flowCode']
            # Reconstruct the missing country's flowCode
            new_flow = 'M' if orig_flow in ['X', 'Export'] else 'X'
            
            reconstructed.append({
                'period': int(latest_year),
                'reporterCode': int(m49),
                'reporterISO': iso,
                'flowCode': new_flow,
                'cmdCode': row['cmdCode'],
                'cmdDesc': row['cmdDesc'],
                'partnerCode': 0,
                'partnerISO': 'W00',
                'primaryValue': row['primaryValue']
            })
            
        df_recon = pd.DataFrame(reconstructed)
        df_recon.to_csv(save_path, index=False, encoding='utf-8-sig')
        print(f"  [+] Reconstructed mirror data: Year {latest_year} ({len(df_recon)} records) -> {save_path}")
        
    else:
        # No mirror data found either. Save a dummy file so the pipeline doesn't break
        print(f"  [-] No mirror data found. Saving dummy/placeholder file -> {save_path}")
        dummy = pd.DataFrame([{
            'period': 2024,
            'reporterCode': int(m49),
            'reporterISO': iso,
            'flowCode': 'X',
            'cmdCode': '99',
            'cmdDesc': 'No data reported',
            'partnerCode': 0,
            'partnerISO': 'W00',
            'primaryValue': 0
        }, {
            'period': 2024,
            'reporterCode': int(m49),
            'reporterISO': iso,
            'flowCode': 'M',
            'cmdCode': '99',
            'cmdDesc': 'No data reported',
            'partnerCode': 0,
            'partnerISO': 'W00',
            'primaryValue': 0
        }])
        dummy.to_csv(save_path, index=False, encoding='utf-8-sig')

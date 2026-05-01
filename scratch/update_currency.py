import re
import json

# Mapping of country English names to Currency info
# Format: { en_name: (currency_jp, currency_code, symbol) }
currency_map = {
    "Afghanistan": ("アフガニ", "AFN", "؋"),
    "Albania": ("レク", "ALL", "L"),
    "Algeria": ("アルジェリア・ディナール", "DZD", "د.ج"),
    "Andorra": ("ユーロ", "EUR", "€"),
    "Angola": ("クワンザ", "AOA", "Kz"),
    "Antigua and Barbuda": ("東カリブ・ドル", "XCD", "$"),
    "Argentina": ("アルゼンチン・ペソ", "ARS", "$"),
    "Armenia": ("ドラム", "AMD", "֏"),
    "Australia": ("オーストラリア・ドル", "AUD", "$"),
    "Austria": ("ユーロ", "EUR", "€"),
    "Azerbaijan": ("アゼルバイジャン・マナト", "AZN", "₼"),
    "Bahamas": ("バハマ・ドル", "BSD", "$"),
    "Bahrain": ("バーレーン・ディナール", "BHD", ".د.ب"),
    "Bangladesh": ("タカ", "BDT", "৳"),
    "Barbados": ("バルバドス・ドル", "BBD", "$"),
    "Belarus": ("ベラルーシ・ルーブル", "BYN", "Br"),
    "Belgium": ("ユーロ", "EUR", "€"),
    "Belize": ("ベリーズ・ドル", "BZD", "$"),
    "Benin": ("CFAフラン", "XOF", "Fr"),
    "Bhutan": ("ニュルタム", "BTN", "Nu."),
    "Bolivia": ("ボリビアーノ", "BOB", "Bs."),
    "Bosnia and Herzegovina": ("兌換マルク", "BAM", "KM"),
    "Botswana": ("プラ", "BWP", "P"),
    "Brazil": ("レアル", "BRL", "R$"),
    "Brunei": ("ブルネイ・ドル", "BND", "$"),
    "Bulgaria": ("レフ", "BGN", "лв"),
    "Burkina Faso": ("CFAフラン", "XOF", "Fr"),
    "Burundi": ("ブルンジ・フラン", "BIF", "Fr"),
    "Cabo Verde": ("カーボベルデ・エスクード", "CVE", "Esc"),
    "Cambodia": ("リエル", "KHR", "៛"),
    "Cameroon": ("CFAフラン", "XAF", "Fr"),
    "Canada": ("カナダ・ドル", "CAD", "$"),
    "Central African Republic": ("CFAフラン", "XAF", "Fr"),
    "Chad": ("CFAフラン", "XAF", "Fr"),
    "Chile": ("チリ・ペソ", "CLP", "$"),
    "China": ("人民元", "CNY", "¥"),
    "Colombia": ("コロンビア・ペソ", "COP", "$"),
    "Comoros": ("コモロ・フラン", "KMF", "Fr"),
    "Congo": ("CFAフラン", "XAF", "Fr"),
    "Democratic Republic of the Congo": ("コンゴ・フラン", "CDF", "Fr"),
    "Costa Rica": ("コスタリカ・コロン", "CRC", "₡"),
    "Cote d'Ivoire": ("CFAフラン", "XOF", "Fr"),
    "Croatia": ("ユーロ", "EUR", "€"),
    "Cuba": ("キューバ・ペソ", "CUP", "$"),
    "Cyprus": ("ユーロ", "EUR", "€"),
    "Czech Republic": ("チェコ・コルナ", "CZK", "Kč"),
    "Denmark": ("デンマーク・クローネ", "DKK", "kr"),
    "Djibouti": ("ジブチ・フラン", "DJF", "Fr"),
    "Dominica": ("東カリブ・ドル", "XCD", "$"),
    "Dominican Republic": ("ドミニカ・ペソ", "DOP", "$"),
    "Ecuador": ("USドル", "USD", "$"),
    "Egypt": ("エジプト・ポンド", "EGP", "E£"),
    "El Salvador": ("USドル", "USD", "$"),
    "Equatorial Guinea": ("CFAフラン", "XAF", "Fr"),
    "Eritrea": ("ナクファ", "ERN", "Nfk"),
    "Estonia": ("ユーロ", "EUR", "€"),
    "Eswatini": ("リランゲニ", "SZL", "L"),
    "Ethiopia": ("ブル", "ETB", "Br"),
    "Fiji": ("フィジー・ドル", "FJD", "$"),
    "Finland": ("ユーロ", "EUR", "€"),
    "France": ("ユーロ", "EUR", "€"),
    "Gabon": ("CFAフラン", "XAF", "Fr"),
    "Gambia": ("ダラシ", "GMD", "D"),
    "Georgia": ("ラリ", "GEL", "₾"),
    "Germany": ("ユーロ", "EUR", "€"),
    "Ghana": ("セディ", "GHS", "₵"),
    "Greece": ("ユーロ", "EUR", "€"),
    "Grenada": ("東カリブ・ドル", "XCD", "$"),
    "Guatemala": ("ケツァル", "GTQ", "Q"),
    "Guinea": ("ギニア・フラン", "GNF", "Fr"),
    "Guinea-Bissau": ("CFAフラン", "XOF", "Fr"),
    "Guyana": ("ガイアナ・ドル", "GYD", "$"),
    "Haiti": ("グールド", "HTG", "G"),
    "Honduras": ("レンピラ", "HNL", "L"),
    "Hungary": ("フォリント", "HUF", "Ft"),
    "Iceland": ("アイスランド・クローナ", "ISK", "kr"),
    "India": ("インド・ルピー", "INR", "₹"),
    "Indonesia": ("ルピア", "IDR", "Rp"),
    "Iran": ("イラン・リアル", "IRR", "﷼"),
    "Iraq": ("イラク・ディナール", "IQD", "ع.د"),
    "Ireland": ("ユーロ", "EUR", "€"),
    "Israel": ("新シェケル", "ILS", "₪"),
    "Italy": ("ユーロ", "EUR", "€"),
    "Jamaica": ("ジャマイカ・ドル", "JMD", "$"),
    "Japan": ("日本円", "JPY", "¥"),
    "Jordan": ("ヨルダン・ディナール", "JOD", "د.أ"),
    "Kazakhstan": ("テンゲ", "KZT", "₸"),
    "Kenya": ("ケニア・シリング", "KES", "Sh"),
    "Kiribati": ("オーストラリア・ドル", "AUD", "$"),
    "Kuwait": ("クウェート・ディナール", "KWD", "د.ك"),
    "Kyrgyzstan": ("ソム", "KGS", "с"),
    "Laos": ("キップ", "LAK", "₭"),
    "Latvia": ("ユーロ", "EUR", "€"),
    "Lebanon": ("レバノン・ポンド", "LBP", "ل.ل"),
    "Lesotho": ("ロチ", "LSL", "L"),
    "Liberia": ("リベリア・ドル", "LRD", "$"),
    "Libya": ("リビア・ディナール", "LYD", "ل.د"),
    "Liechtenstein": ("スイス・フラン", "CHF", "Fr"),
    "Lithuania": ("ユーロ", "EUR", "€"),
    "Luxembourg": ("ユーロ", "EUR", "€"),
    "Madagascar": ("アリアリ", "MGA", "Ar"),
    "Malawi": ("クワチャ", "MWK", "MK"),
    "Malaysia": ("リンギット", "MYR", "RM"),
    "Maldives": ("ルフィヤ", "MVR", ".ރ"),
    "Mali": ("CFAフラン", "XOF", "Fr"),
    "Malta": ("ユーロ", "EUR", "€"),
    "Marshall Islands": ("USドル", "USD", "$"),
    "Mauritania": ("ウギア", "MRU", "UM"),
    "Mauritius": ("モーリシャス・ルピー", "MUR", "₨"),
    "Mexico": ("メキシコ・ペソ", "MXN", "$"),
    "Micronesia": ("USドル", "USD", "$"),
    "Moldova": ("モルドバ・レウ", "MDL", "L"),
    "Monaco": ("ユーロ", "EUR", "€"),
    "Mongolia": ("トゥグルグ", "MNT", "₮"),
    "Montenegro": ("ユーロ", "EUR", "€"),
    "Morocco": ("モロッコ・ディルハム", "MAD", "د.م."),
    "Mozambique": ("メティカル", "MZN", "MT"),
    "Myanmar": ("チャット", "MMK", "Ks"),
    "Namibia": ("ナミビア・ドル", "NAD", "$"),
    "Nauru": ("オーストラリア・ドル", "AUD", "$"),
    "Nepal": ("ネパール・ルピー", "NPR", "₨"),
    "Netherlands": ("ユーロ", "EUR", "€"),
    "New Zealand": ("ニュージーランド・ドル", "NZD", "$"),
    "Nicaragua": ("コルドバ", "NIO", "C$"),
    "Niger": ("CFAフラン", "XOF", "Fr"),
    "Nigeria": ("ナイラ", "NGN", "₦"),
    "North Korea": ("北朝鮮ウォン", "KPW", "₩"),
    "North Macedonia": ("デナール", "MKD", "ден"),
    "Norway": ("ノルウェー・クローネ", "NOK", "kr"),
    "Oman": ("オマーン・リアル", "OMR", "ر.ع."),
    "Pakistan": ("パキスタン・ルピー", "PKR", "₨"),
    "Palau": ("USドル", "USD", "$"),
    "Panama": ("バルボア", "PAB", "B/."),
    "Papua New Guinea": ("キナ", "PGK", "K"),
    "Paraguay": ("グアラニー", "PYG", "₲"),
    "Peru": ("ソル", "PEN", "S/."),
    "Philippines": ("フィリピン・ペソ", "PHP", "₱"),
    "Poland": ("ズウォティ", "PLN", "zł"),
    "Portugal": ("ユーロ", "EUR", "€"),
    "Qatar": ("カタール・リアル", "QAR", "ر.ق"),
    "Romania": ("ルーマニア・レウ", "RON", "lei"),
    "Russia": ("ロシア・ルーブル", "RUB", "₽"),
    "Rwanda": ("ルワンダ・フラン", "RWF", "Fr"),
    "Saint Kitts and Nevis": ("東カリブ・ドル", "XCD", "$"),
    "Saint Lucia": ("東カリブ・ドル", "XCD", "$"),
    "Saint Vincent and the Grenadines": ("東カリブ・ドル", "XCD", "$"),
    "Samoa": ("タラ", "WST", "T"),
    "San Marino": ("ユーロ", "EUR", "€"),
    "Sao Tome and Principe": ("ドブラ", "STN", "Db"),
    "Saudi Arabia": ("サウジ・リアル", "SAR", "ر.س"),
    "Senegal": ("CFAフラン", "XOF", "Fr"),
    "Serbia": ("セルビア・ディナール", "RSD", "дин."),
    "Seychelles": ("セーシェル・ルピー", "SCR", "₨"),
    "Sierra Leone": ("レオン", "SLE", "Le"),
    "Singapore": ("シンガポール・ドル", "SGD", "$"),
    "Slovakia": ("ユーロ", "EUR", "€"),
    "Slovenia": ("ユーロ", "EUR", "€"),
    "Solomon Islands": ("ソロモン諸島・ドル", "SBD", "$"),
    "Somalia": ("ソマリア・シリング", "SOS", "Sh"),
    "South Africa": ("ランド", "ZAR", "R"),
    "Republic of Korea": ("韓国ウォン", "KRW", "₩"),
    "South Sudan": ("南スーダン・ポンド", "SSP", "£"),
    "Spain": ("ユーロ", "EUR", "€"),
    "Sri Lanka": ("スリランカ・ルピー", "LKR", "Rs"),
    "Sudan": ("スーダン・ポンド", "SDG", "£"),
    "Suriname": ("スリナム・ドル", "SRD", "$"),
    "Sweden": ("スウェーデン・クローナ", "SEK", "kr"),
    "Switzerland": ("スイス・フラン", "CHF", "Fr"),
    "Syria": ("シリア・ポンド", "SYP", "£"),
    "Taiwan": ("新台湾ドル", "TWD", "NT$"),
    "Tajikistan": ("ソモニ", "TJS", "ЅМ"),
    "Tanzania": ("タンザニア・シリング", "TZS", "Sh"),
    "Thailand": ("バーツ", "THB", "฿"),
    "Timor-Leste": ("USドル", "USD", "$"),
    "Togo": ("CFAフラン", "XOF", "Fr"),
    "Tonga": ("パアンガ", "TOP", "T$"),
    "Trinidad and Tobago": ("トリニダード・トバゴ・ドル", "TTD", "$"),
    "Tunisia": ("チュニジア・ディナール", "TND", "د.ت"),
    "Turkey": ("トルコリラ", "TRY", "₺"),
    "Turkmenistan": ("マナト", "TMT", "m"),
    "Tuvalu": ("オーストラリア・ドル", "AUD", "$"),
    "Uganda": ("ウガンダ・シリング", "UGX", "Sh"),
    "Ukraine": ("フリヴニャ", "UAH", "₴"),
    "United Arab Emirates": ("UAEディルハム", "AED", "د.إ"),
    "United Kingdom": ("イギリスポンド", "GBP", "£"),
    "United States": ("USドル", "USD", "$"),
    "Uruguay": ("ウルグアイ・ペソ", "UYU", "$"),
    "Uzbekistan": ("スム", "UZS", "с"),
    "Vanuatu": ("バツ", "VUV", "Vt"),
    "Vatican City": ("ユーロ", "EUR", "€"),
    "Venezuela": ("ボリバル・ソベラノ", "VES", "Bs.S"),
    "Vietnam": ("ドン", "VND", "₫"),
    "Yemen": ("イエメン・リアル", "YER", "﷼"),
    "Zambia": ("ザンビア・クワチャ", "ZMW", "ZK"),
    "Zimbabwe": ("ジンバブエ・ドル", "ZWL", "$")
}

path = 'prompts/blog/国名変換Code.md'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Match "Name": { props }
    match = re.search(r'\"(.*?)\":\s*\{(.*?)\}', line)
    if match:
        name_jp = match.group(1)
        props_str = match.group(2)
        
        # Extract en name to look up currency
        en_match = re.search(r'en:\s*\"(.*?)\"', props_str)
        if en_match:
            en_name = en_match.group(1)
            if en_name in currency_map:
                curr_name, curr_code, curr_symbol = currency_map[en_name]
                # Check if currency already exists (to avoid duplicate adding if run twice)
                if 'currency:' not in props_str:
                    # Append new props before the closing brace
                    new_props = f', currency: "{curr_name}", currencyCode: "{curr_code}", currencySymbol: "{curr_symbol}"'
                    line = line.replace(' }', new_props + ' }')
        new_lines.append(line)
    elif 'json: {' in line:
        # Update the return object structure too
        new_lines.append(line)
        # We'll handle the return part separately or just add the fields
    else:
        new_lines.append(line)

# Now handle the return block
content = "".join(new_lines)
if 'currency: entry.currency || "",' not in content:
    content = content.replace(
        'isJapan: entry.isJapan === true',
        'isJapan: entry.isJapan === true,\n    currency: entry.currency || "",\n    currencyCode: entry.currencyCode || "",\n    currencySymbol: entry.currencySymbol || ""'
    )

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

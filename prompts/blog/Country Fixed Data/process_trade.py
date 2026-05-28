#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
貿易データ（UN Comtrade品目データ ＆ IMF DOTS貿易相手国データ）加工スクリプト
巨大なバルクデータから必要な項目のみをフィルタリング・軽量化し、
ブログ用のフラットなCSVおよび国別JSONを出力します。
"""

import os
import sys
import json
import argparse
import pandas as pd
import numpy as np

# =====================================================================
# 1. 国コードマッピング定義 (ISO3 <-> M49 <-> 日本語名)
# =====================================================================
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
    "UZB": "860", "VUT": "548", "VEN": "862", "VNM": "704", "YEM": "887", "ZMB": "894", "ZWE": "716",
    # 追加した島国・自治領
    "FRO": "234", "MSR": "500", "SYC": "690", "BMU": "60", "CYM": "136", "MAC": "446", "HKG": "344",
    "ABW": "533", "AIA": "660", "COK": "184", "CUW": "531", "FLK": "238", "GIB": "292", "GRL": "304",
    "GLP": "312", "GUM": "316", "MTQ": "474", "MYT": "175", "NCL": "540", "NIU": "570", "MNP": "580",
    "PYF": "258", "PRI": "630", "REU": "638", "SHN": "654", "SXM": "534", "TCA": "796", "VIR": "850",
    "VGB": "92", "WLF": "876", "PSE": "275", "VAT": "336", "S19": "490"
}
M49_TO_ISO3 = {v: k for k, v in ISO3_TO_M49.items()}

# ISO3 3レターコードから日本語国名へのマッピング（ブログ用）
ISO3_TO_JA = {
    "AFG": "アフガニスタン", "ALB": "アルバニア", "DZA": "アルジェリア", "AND": "アンドラ",
    "AGO": "アンゴラ", "ATG": "アンティグア・バーブーダ", "ARG": "アルゼンチン", "ARM": "アルメニア",
    "AUS": "オーストラリア", "AUT": "オーストリア", "AZE": "アゼルバイジャン", "BHS": "バハマ",
    "BHR": "バーレーン", "BGD": "バングラデシュ", "BRB": "バルバドス", "BLR": "ベラルーシ",
    "BEL": "ベルギー", "BLZ": "ベリーズ", "BEN": "ベナン", "BTN": "ブータン", "BOL": "ボリビア",
    "BIH": "ボスニア・ヘルツェゴビナ", "BWA": "ボツワナ", "BRA": "ブラジル", "BRN": "ブルネイ",
    "BGR": "ブルガリア", "BFA": "ブルキナファソ", "BDI": "ブルンジ", "CPV": "カーボベルデ",
    "KHM": "カンボジア", "CMR": "カメルーン", "CAN": "カナダ", "CAF": "中央アフリカ",
    "TCD": "チャド", "CHL": "チリ", "CHN": "中国", "COL": "コロンビア", "COM": "コモロ",
    "COD": "コンゴ民主共和国", "COG": "コンゴ共和国", "CRI": "コスタリカ", "CIV": "コートジボワール",
    "HRV": "クロアチア", "CUB": "キューバ", "CYP": "キプロス", "CZE": "チェコ",
    "DNK": "デンマーク", "DJI": "ジブチ", "DOM": "ドミニカ共和国", "ECU": "エクアドル",
    "EGY": "エジプト", "SLV": "エルサルバドル", "GNQ": "赤道ギニア", "ERI": "エリトリア",
    "EST": "エストニア", "SWZ": "エスワティニ", "ETH": "エチオピア", "FJI": "フィジー",
    "FIN": "フィンランド", "FRA": "フランス", "GAB": "ガボン", "GMB": "ガンビア",
    "GEO": "ジョージア", "DEU": "ドイツ", "GHA": "ガーナ", "GRC": "ギリシャ",
    "GRD": "グレナダ", "GTM": "グアテマラ", "GIN": "ギニア", "GNB": "ギニアビサウ",
    "GUY": "ガイアナ", "HTI": "ハイチ", "HND": "ホンジュラス", "HUN": "ハンガリー",
    "ISL": "アイスランド", "IND": "インド", "IDN": "インドネシア", "IRN": "イラン",
    "IRQ": "イラク", "IRL": "アイルランド", "ISR": "イスラエル", "ITA": "イタリア",
    "JAM": "ジャマイカ", "JPN": "日本", "JOR": "ヨルダン", "KAZ": "カザフスタン",
    "KEN": "ケニア", "KIR": "キリバス", "PRK": "北朝鮮", "KOR": "韓国",
    "KWT": "クウェート", "KGZ": "キルギス", "LAO": "ラオス", "LVA": "ラトビア",
    "LBN": "レバノン", "LSO": "レソト", "LBR": "リベリア", "LBY": "リビア",
    "LIE": "リヒテンシュタイン", "LTU": "リトアニア", "LUX": "ルクセンブルク", "MDG": "マダガスカル",
    "MWI": "マラウイ", "MYS": "マレーシア", "MDV": "モルディブ", "MLI": "マリ",
    "MLT": "マルタ", "MHL": "マーシャル諸島", "MRT": "モーリタニア", "MUS": "モーリシャス",
    "MEX": "メキシコ", "FSM": "ミクロネシア連邦", "MDA": "モルドバ", "MCO": "モナコ",
    "MNG": "モンゴル", "MNE": "モンテネグロ", "MAR": "モロッコ", "MOZ": "モザンビーク",
    "MMR": "ミャンマー", "NAM": "ナミビア", "NRU": "ナウル", "NPL": "ネパール",
    "NLD": "オランダ", "NZL": "ニュージーランド", "NIC": "ニカラグア", "NER": "ニジェール",
    "NGA": "ナイジェリア", "MKD": "北マケドニア", "NOR": "ノルウェー", "OMN": "オマーン",
    "PAK": "パキスタン", "PLW": "パラオ", "PAN": "パナマ", "PNG": "パプアニューギニア",
    "PRY": "パラグアイ", "PER": "ペルー", "PHL": "フィリピン", "POL": "ポーランド",
    "PRT": "ポルトガル", "QAT": "カタール", "ROU": "ルーマニア", "RUS": "ロシア",
    "RWA": "ルワンダ", "KNA": "セントクリストファー・ネービス", "LCA": "セントルシア",
    "VCT": "セントビンセント・グレナディーン", "WSM": "サモア", "SMR": "サンマリノ",
    "STP": "サントメ・プリンシペ", "SAU": "サウジアラビア", "SEN": "セネガル",
    "SRB": "セルビア", "SLE": "シエラレオネ", "SGP": "シンガポール", "SVK": "スロバキア",
    "SVN": "スロベニア", "SLB": "ソロモン諸島", "SOM": "ソマリア", "ZAF": "南アフリカ",
    "SSD": "南スーダン", "ESP": "スペイン", "LKA": "スリランカ", "SDN": "スーダン",
    "SUR": "スリナム", "SWE": "スウェーデン", "CHE": "スイス", "SYR": "シリア",
    "TWN": "台湾", "TJK": "タジキスタン", "TZA": "タンザニア", "THA": "タイ",
    "TLS": "東ティモール", "TGO": "トーゴ", "TON": "トンガ", "TTO": "トリニダード・トバゴ",
    "TUN": "チュニジア", "TUR": "トルコ", "TKM": "トルクメニスタン", "TUV": "ツバル",
    "UGA": "ウガンダ", "UKR": "ウクライナ", "ARE": "アラブ首長国連邦", "GBR": "イギリス",
    "USA": "アメリカ", "URY": "ウルグアイ", "UZB": "ウズベキスタン", "VUT": "バヌアツ",
    "ZWE": "ジンバブエ",
    # 追加した島国・自治領
    "FRO": "フェロー諸島", "MSR": "モントセラト", "SYC": "セーシェル", "BMU": "バミューダ", "CYM": "ケイマン諸島",
    "MAC": "マカオ", "HKG": "香港", "ABW": "アルバ", "AIA": "アンギラ", "COK": "クック諸島",
    "CUW": "キュラソー", "FLK": "フォークランド諸島", "GIB": "ジブラルタル", "GRL": "グリーンランド",
    "GLP": "グアドループ", "GUM": "グアム", "MTQ": "マルティニーク", "MYT": "マヨット",
    "NCL": "ニューカレドニア", "NIU": "ニウエ", "MNP": "北マリアナ諸島", "PYF": "フランス領ポリネシア",
    "PRI": "プエルトリコ", "REU": "レユニオン", "SHN": "セントヘレナ", "SXM": "シント・マールテン",
    "TCA": "タークス・カイコス諸島", "VIR": "米領バージン諸島", "VGB": "英領バージン諸島", "WLF": "ウォリス・フツナ",
    "PSE": "パレスチナ", "VAT": "バチカン", "S19": "その他アジア（台湾など）",
    "VEN": "ベネズエラ", "VNM": "ベトナム", "YEM": "イエメン", "ZMB": "ザンビア"
}

# 主な国名の英語から日本語へのマッピング（IMFのPartner国名用）
COUNTRY_EN_TO_JA = {
    "United States": "アメリカ", "China": "中国", "Japan": "日本", "Germany": "ドイツ",
    "United Kingdom": "イギリス", "France": "フランス", "India": "インド", "Brazil": "ブラジル",
    "Italy": "イタリア", "Canada": "カナダ", "South Korea": "韓国", "Russia": "ロシア",
    "Australia": "オーストラリア", "Spain": "スペイン", "Mexico": "メキシコ", "Indonesia": "インドネシア",
    "Netherlands": "オランダ", "Saudi Arabia": "サウジアラビア", "Turkey": "トルコ", "Switzerland": "スイス",
    "Taiwan": "台湾", "Sweden": "スウェーデン", "Poland": "ポーランド", "Belgium": "ベルギー",
    "Thailand": "タイ", "Vietnam": "ベトナム", "Philippines": "フィリピン", "Malaysia": "マレーシア",
    "Singapore": "シンガポール", "South Africa": "南アフリカ", "Egypt": "エジプト", "Nigeria": "ナイジェリア",
    # 追加した主要な貿易相手国
    "New Zealand": "ニュージーランド",
    "Argentina": "アルゼンチン",
    "Chile": "チリ",
    "Austria": "オーストリア",
    "United Arab Emirates": "アラブ首長国連邦",
    "Bangladesh": "バングラデシュ",
    "Ireland": "アイルランド",
    "Norway": "ノルウェー",
    "Denmark": "デンマーク",
    "Finland": "フィンランド",
    "Portugal": "ポルトガル",
    "Greece": "ギリシャ",
    "Czech Republic": "チェコ",
    "Hungary": "ハンガリー",
    "Romania": "ルーマニア",
    "Ukraine": "ウクライナ",
    "Kazakhstan": "カザフスタン",
    "Colombia": "コロンビア",
    "Peru": "ペルー",
    "Algeria": "アルジェリア",
    "Morocco": "モロッコ",
    "Iraq": "イラク",
    "Kuwait": "クウェート",
    "Qatar": "カタール",
    "Oman": "オマーン",
    "Pakistan": "パキスタン",
    "Israel": "イスラエル",
    "Hong Kong": "香港",
    # IMF DOTS固有の英語表記
    "China, People's Republic of": "中国",
    "Korea, Republic of": "韓国",
    "Taiwan Province of China": "台湾",
    "Hong Kong Special Administrative Region, People's Republic of China": "香港",
    "Netherlands, The": "オランダ",
    "Russian Federation": "ロシア",
    "Iran, Islamic Republic of": "イラン",
    "Venezuela, Bolivarian Republic of": "ベネズエラ",
    "Syrian Arab Republic": "シリア",
    "Bolivia, Plurinational State of": "ボリビア",
    "Poland, Republic of": "ポーランド",
    "United Arab Emirates, The": "アラブ首長国連邦",
    # さらに追加した貿易相手国
    "Kosovo, Republic of": "コソボ",
    "Serbia, Republic of": "セルビア",
    "Croatia, Republic of": "クロアチア",
    "Slovenia, Republic of": "スロベニア",
    "Sint Maarten, Kingdom of the Netherlands": "シントマールテン",
    "Türkiye, Republic of": "トルコ",
    "Belarus, Republic of": "ベラルーシ",
    "Mauritania, Islamic Republic of": "モーリタニア",
    "Slovak Republic": "スロバキア",
    "Bulgaria": "ブルガリア",
    "Georgia": "ジョージア",
    "Uruguay": "ウルグアイ",
    "Tunisia": "チュニジア",
    "Togo": "トーゴ",
    "Ghana": "ガーナ",
    # イエメン・ザンビアおよびその他アジア
    "Yemen": "イエメン",
    "Zambia": "ザンビア",
    "Yemen, Republic of": "イエメン",
    "Zambia, Republic of": "ザンビア",
    "Other Asia, nes": "その他アジア（台湾など）",
    "Other Asia": "その他アジア（台湾など）"
}

# HSコード2桁から日本語の主要品目名へのマッピング（ブログ用）
HS_CODE_TO_JA = {
    "01": "動物（生体）", "02": "肉・食用屑", "03": "魚介類・甲殻類", "04": "酪農品・鳥卵・蜂蜜",
    "05": "動物性生産品（他非分類）", "06": "生花・盆栽・苗木", "07": "食用の野菜・根菜", "08": "果実・ナッツ",
    "09": "コーヒー・茶・スパイス", "10": "穀物", "11": "穀粉・でん粉・麦芽", "12": "採油用種子・果実・藁",
    "13": "ラック・ガム・樹脂", "14": "植物性編物材料", "15": "動物性・植物性油脂", "16": "肉・魚介類の調製品",
    "17": "糖類・砂糖菓子", "18": "ココア・ココア調製品", "19": "穀物・粉製品・製菓", "20": "野菜・果実等の調製品",
    "21": "各種調製食料品", "22": "飲料・アルコール・酢", "23": "食品工業廃棄物・飼料", "24": "たばこ・製造たばこ代用品",
    "25": "塩・硫黄・土石類・セメント", "26": "鉱石・スラグ・灰", "27": "鉱物燃料・エネルギー（原油・石炭等）", "28": "無機化学品・貴金属化合物",
    "29": "有機化学品", "30": "医薬品", "31": "肥料", "32": "なめし・染色エキス・塗料・インキ",
    "33": "精油・香料・化粧品", "34": "石けん・有機界面活性剤・ワックス", "35": "たんぱく質系物質・接着剤", "36": "火薬類・火工品・マッチ",
    "37": "写真用または映画用の材料", "38": "各種化学工業生産品", "39": "プラスチック・同製品", "40": "ゴム・同製品",
    "41": "原料皮・革", "42": "革製品・旅行用具・ハンドバッグ", "43": "毛皮・人工毛皮", "44": "木材・木製品・木炭",
    "45": "コルク・同製品", "46": "わら・しだ等の製品・かご細工", "47": "木材パルプ・回収紙", "48": "紙・板紙・製品",
    "49": "書籍・新聞・絵画・印刷物", "50": "絹", "51": "羊毛・粗毛・馬毛糸・織物", "52": "綿・綿織物",
    "53": "他の植物性紡織用繊維・紙糸", "54": "人造繊維の長繊維", "55": "人造繊維の短繊維", "56": "ウォッディング・フェルト・不織布・紐",
    "57": "じゅうたん・その他の紡織用床用敷物", "58": "特殊織物・タフテッド織物・レース", "59": "被覆・積層・工業用の紡織用繊維製品", "60": "メリヤス編物・クロセ編物",
    "61": "衣類・衣類付属品（編物）", "62": "衣類・衣類付属品（織物）", "63": "他の紡織用繊維 of products (セット・古衣類)", "64": "履物・ゲートル同製品",
    "65": "帽子・同部品", "66": "傘・杖・鞭・同部品", "67": "調製羽毛・羽毛製品・造花・人髪製品", "68": "石・プラスター・セメント等の製品",
    "69": "セラミック製品", "70": "ガラス・同製品", "71": "真珠・貴金属・宝石・装飾品", "72": "鉄鋼",
    "73": "鉄鋼製品", "74": "銅・同製品", "75": "ニッケル・同製品", "76": "アルミニウム・同製品",
    "78": "鉛・同製品", "79": "亜鉛・同製品", "80": "すず・同製品", "81": "他の卑金属・サーメット",
    "82": "卑金属製の工具・道具・刃物・スプーン・フォーク", "83": "各種の卑金属製品", "84": "一般機械・原子炉・ボイラー等", "85": "電気機器・録音機・テレビ等",
    "86": "鉄道車両・軌道部品・交通信号機", "87": "自動車・同部品", "88": "航空機・宇宙船・同部品", "89": "船舶・浮体構造物",
    "90": "光学機器・写真用機器・医療用機器", "91": "時計・同部品", "92": "楽器・同部品", "93": "武器・弾薬・同部品",
    "94": "家具・寝具・照明器具・プレハブ建築", "95": "玩具・遊戯具・運動用具・同部品", "96": "雑品", "97": "美術品・収集品・骨とう",
    "99": "特殊取扱品（その他）"
}

def clean_brackets(text):
    """品目名や国名からカッコとその中身を取り除く補助関数"""
    if pd.isna(text):
        return ""
    import re
    text = str(text)
    # () と （） を削除
    text = re.sub(r'\([^)]*\)', '', text)
    text = re.sub(r'（[^）]*）', '', text)
    # 余分なスペースをトリム
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# =====================================================================
# 2. UN Comtrade バルクデータの処理
# =====================================================================
def process_comtrade(comtrade_csv_path, target_iso_list=None):
    """
    UN Comtrade の品目別貿易データを読み込み、
    各国(reporter)の輸出・輸入それぞれの上位10品目を抽出する。
    """
    print(f"[*] UN Comtrade データを処理中: {comtrade_csv_path}")
    
    # 巨大ファイル対策：必要なカラムのみ定義してメモリ消費を抑える
    # 一般的なComtradeバルクCSVのカラム名（環境やバージョンによって微調整が必要）
    usecols = ['period', 'reporterISO', 'flowCode', 'cmdCode', 'cmdDesc', 'primaryValue']
    
    try:
        # chunksize を指定して省メモリで読み込むことも可能だが、
        # メモリに余裕がある場合は一括読み込み。ここでは巨大ファイルを考慮して chunksize を使用
        chunks = []
        for chunk in pd.read_csv(comtrade_csv_path, usecols=usecols, chunksize=100000, low_memory=False, encoding_errors='replace', index_col=False):
            # TOTAL行（総額）は除外し、HSコードの桁数でフィルタ（例: 2桁コードのみ）
            # 通常、2桁コードは長さが2桁、またはcmdCodeが数値として100未満など
            chunk = chunk[chunk['cmdCode'] != 'TOTAL']
            
            # 対象国が指定されている場合はフィルタリング
            if target_iso_list:
                chunk = chunk[chunk['reporterISO'].isin(target_iso_list)]
                
            chunks.append(chunk)
            
        df = pd.concat(chunks, ignore_index=True)
    except Exception as e:
        print(f"[!] UN Comtrade CSVの読み込みに失敗しました: {e}")
        print("[*] カラム名が異なる可能性があります。デフォルトの全読み込みを試します...")
        df = pd.read_csv(comtrade_csv_path, low_memory=False, encoding_errors='replace', index_col=False)
        # カラム名のマッピング（大文字小文字の揺れ対策）
        df.columns = [c.lower() for c in df.columns]
        # 標準的な名称へ置換
        rename_map = {
            'reporteriso': 'reporterISO', 'reporter_iso': 'reporterISO',
            'flowcode': 'flowCode', 'flow_code': 'flowCode',
            'cmdcode': 'cmdCode', 'cmd_code': 'cmdCode',
            'cmddesc': 'cmdDesc', 'cmd_desc': 'cmdDesc',
            'primaryvalue': 'primaryValue', 'primary_value': 'primaryValue'
        }
        df = df.rename(columns=rename_map)
        if target_iso_list:
            df = df[df['reporterISO'].isin(target_iso_list)]
            
    # データ抽出のメイン処理
    # 輸出 (flowCode = 'X') と 輸入 (flowCode = 'M')
    exports_df = df[df['flowCode'].isin(['X', 'Export', 'export'])]
    imports_df = df[df['flowCode'].isin(['M', 'Import', 'import'])]
    
    result = {}
    
    # 対象国ごとにグループ化して上位10件を抽出
    reporters = df['reporterISO'].dropna().unique()
    for rep in reporters:
        if target_iso_list and rep not in target_iso_list:
            continue
            
        rep_exports = exports_df[exports_df['reporterISO'] == rep]
        rep_imports = imports_df[imports_df['reporterISO'] == rep]
        
        # 品目コードごとに金額を合計（コードと説明の両方を保持）
        # ※ 1桁コードを2桁にするため、文字列変換を考慮して groupby に cmdCode も含める
        top_exp = rep_exports.groupby(['cmdCode', 'cmdDesc'])['primaryValue'].sum().reset_index()
        top_exp = top_exp.sort_values(by='primaryValue', ascending=False).head(10)
        
        top_imp = rep_imports.groupby(['cmdCode', 'cmdDesc'])['primaryValue'].sum().reset_index()
        top_imp = top_imp.sort_values(by='primaryValue', ascending=False).head(10)
        
        # クリーニングして日本語辞書から引いてリスト化
        export_list = []
        for _, row in top_exp.iterrows():
            code = str(row['cmdCode']).strip().zfill(2)
            desc_ja = HS_CODE_TO_JA.get(code, clean_brackets(row['cmdDesc']))
            export_list.append(desc_ja)
            
        import_list = []
        for _, row in top_imp.iterrows():
            code = str(row['cmdCode']).strip().zfill(2)
            desc_ja = HS_CODE_TO_JA.get(code, clean_brackets(row['cmdDesc']))
            import_list.append(desc_ja)
        
        # 10個に満たない場合は空文字で埋める
        while len(export_list) < 10:
            export_list.append("")
        while len(import_list) < 10:
            import_list.append("")
            
        # 年度（最新のものを取得）
        year = str(df[df['reporterISO'] == rep]['period'].max())
        
        result[rep] = {
            "year": year,
            "exports": export_list,
            "imports": import_list
        }
        
    return result

# =====================================================================
# 3. IMF DOTS バルクデータの処理
# =====================================================================
def process_imf_dots(dots_csv_path, target_iso_list=None):
    """
    IMF DOTS の貿易相手国データを読み込み、
    各国(reporter)の貿易相手国トップ10（輸出額ベース）とシェアを算出する。
    """
    print(f"[*] IMF DOTS データを処理中: {dots_csv_path}")
    
    # 英語国名からISO3コードへの包括的なマッピング（大文字小文字対応のためすべて小文字で定義）
    eng_name_to_iso3 = {
        "united states": "USA", "china": "CHN", "japan": "JPN", "germany": "DEU",
        "united kingdom": "GBR", "great britain": "GBR", "france": "FRA", "india": "IND", "brazil": "BRA",
        "italy": "ITA", "canada": "CAN", "korea": "KOR", "south korea": "KOR", "russia": "RUS",
        "australia": "AUS", "spain": "ESP", "mexico": "MEX", "indonesia": "IDN",
        "netherlands": "NLD", "saudi arabia": "SAU", "turkey": "TUR", "switzerland": "CHE",
        "taiwan": "TWN", "sweden": "SWE", "poland": "POL", "belgium": "BEL",
        "thailand": "THA", "vietnam": "VNM", "philippines": "PHL", "malaysia": "MYS",
        "singapore": "SGP", "south africa": "ZAF", "egypt": "EGY", "nigeria": "NGA",
        "afghanistan": "AFG", "albania": "ALB", "algeria": "DZA", "andorra": "AND", "angola": "AGO",
        "antigua and barbuda": "ATG", "argentina": "ARG", "armenia": "ARM", "austria": "AUT",
        "azerbaijan": "AZE", "bahamas": "BHS", "bahrain": "BHR", "bangladesh": "BGD", "barbados": "BRB",
        "belarus": "BLR", "belize": "BLZ", "benin": "BEN", "bhutan": "BTN",
        "bolivia": "BOL", "bosnia and herzegovina": "BIH", "botswana": "BWA", "brunei": "BRN",
        "brunei darussalam": "BRN", "bulgaria": "BGR", "burkina faso": "BFA", "burundi": "BDI", "cabo verde": "CPV",
        "cape verde": "CPV", "cambodia": "KHM", "cameroon": "CMR", "central african republic": "CAF",
        "chad": "TCD", "chile": "CHL", "colombia": "COL", "comoros": "COM",
        "congo": "COG", "congo, democratic republic of the": "COD", "congo, republic of the": "COG",
        "costa rica": "CRI", "cote d'ivoire": "CIV", "ivory coast": "CIV", "croatia": "HRV", "cuba": "CUB",
        "cyprus": "CYP", "czechia": "CZE", "czech republic": "CZE", "denmark": "DNK", "djibouti": "DJI",
        "dominica": "DMA", "dominican republic": "DOM", "ecuador": "ECU", "el salvador": "SLV",
        "equatorial guinea": "GNQ", "eritrea": "ERI", "estonia": "EST", "eswatini": "SWZ", "swaziland": "SWZ",
        "ethiopia": "ETH", "fiji": "FJI", "finland": "FIN", "gabon": "GAB",
        "gambia": "GMB", "georgia": "GEO", "ghana": "GHA", "greece": "GRC",
        "grenada": "GRD", "guatemala": "GTM", "guinea": "GIN", "guinea-bissau": "GNB", "guyana": "GUY",
        "haiti": "HTI", "honduras": "HND", "hungary": "HUN", "iceland": "ISL",
        "iran": "IRN", "iran, islamic republic of": "IRN", "iraq": "IRQ", "ireland": "IRL",
        "israel": "ISR", "jamaica": "JAM", "jordan": "JOR",
        "kazakhstan": "KAZ", "kenya": "KEN", "kiribati": "KIR", "korea, democratic people's republic of": "PRK",
        "korea, republic of": "KOR", "north korea": "PRK", "kosovo": "XKX",
        "kuwait": "KWT", "kyrgyzstan": "KGZ", "kyrgyz republic": "KGZ", "laos": "LAO", "lao people's democratic republic": "LAO",
        "latvia": "LVA", "lebanon": "LBN", "lesotho": "LSO", "liberia": "LBR", "libya": "LBY",
        "liechtenstein": "LIE", "lithuania": "LTU", "luxembourg": "LUX", "madagascar": "MDG", "malawi": "MWI",
        "maldives": "MDV", "mali": "MLI", "malta": "MLT", "marshall islands": "MHL",
        "mauritania": "MRT", "mauritius": "MUS", "micronesia": "FSM", "micronesia, federated states of": "FSM",
        "moldova": "MDA", "moldova, republic of": "MDA", "monaco": "MCO", "mongolia": "MNG", "montenegro": "MNE",
        "morocco": "MAR", "mozambique": "MOZ", "myanmar": "MMR", "namibia": "NAM", "nauru": "NRU",
        "nepal": "NPL", "new zealand": "NZL", "nicaragua": "NIC", "niger": "NER",
        "north macedonia": "MKD", "macedonia": "MKD", "norway": "NOR", "oman": "OMN",
        "pakistan": "PAK", "palau": "PLW", "panama": "PAN", "papua new guinea": "PNG", "paraguay": "PRY",
        "peru": "PER", "romania": "ROU", "rwanda": "RWA", "saint kitts and nevis": "KNA",
        "saint lucia": "LCA", "saint vincent and the grenadines": "VCT", "samoa": "WSM", "san marino": "SMR",
        "sao tome and principe": "STP", "senegal": "SEN", "serbia": "SRB", "seychelles": "SYC",
        "sierra leone": "SLE", "slovakia": "SVK", "slovenia": "SVN", "solomon islands": "SLB",
        "somalia": "SOM", "south sudan": "SSD", "sudan": "SDN", "suriname": "SUR",
        "syria": "SYR", "syrian arab republic": "SYR", "tajikistan": "TJK",
        "tanzania": "TZA", "tanzania, united republic of": "TZA", "timor-leste": "TLS",
        "east timor": "TLS", "togo": "TGO", "tonga": "TON", "trinidad and tobago": "TTO", "tunisia": "TUN",
        "turkmenistan": "TKM", "tuvalu": "TUV", "uganda": "UGA", "ukraine": "UKR",
        "united arab emirates": "ARE", "united states of america": "USA",
        "uruguay": "URY", "uzbekistan": "UZB", "vanuatu": "VUT", "venezuela": "VEN", "venezuela, bolivarian republic of": "VEN",
        "yemen": "YEM", "zambia": "ZMB", "zimbabwe": "ZWE",
        # 表記揺れ・特殊地域
        "china, people's republic of": "CHN",
        "netherlands, the": "NLD",
        "hong kong special administrative region, people's republic of china": "HKG",
        "hong kong sar": "HKG",
        "hong kong": "HKG",
        "macao special administrative region, people's republic of china": "MAC",
        "macao sar": "MAC",
        "macao": "MAC",
        "poland, republic of": "POL",
        "united arab emirates, the": "ARE"
    }

    import csv
    
    # 3GBの巨大ファイル対策：ヘッダーのみ先に読み込んで必要な列を特定し、usecolsを指定して読み込む
    try:
        with open(dots_csv_path, 'r', encoding='utf-8-sig', errors='replace') as f:
            header = next(csv.reader(f))
    except Exception as e:
        print(f"[!] IMF DOTS ヘッダーの読み込みに失敗しました: {e}")
        return {}
        
    header_upper = [c.upper() for c in header]
    col_map = {c.upper(): c for c in header}
    
    reporter_col = 'COUNTRY' if 'COUNTRY' in header_upper else ('REPORTER' if 'REPORTER' in header_upper else None)
    partner_col = 'COUNTERPART_COUNTRY' if 'COUNTERPART_COUNTRY' in header_upper else ('PARTNER' if 'PARTNER' in header_upper else None)
    flow_col = 'TRADE_FLOW' if 'TRADE_FLOW' in header_upper else ('INDICATOR' if 'INDICATOR' in header_upper else None)
    
    # 2020〜2026年の年列を特定
    year_cols = [c for c in header if c.isdigit() and len(c) == 4 and 2020 <= int(c) <= 2026]
    
    usecols = []
    if reporter_col:
        usecols.append(col_map[reporter_col])
    if partner_col:
        usecols.append(col_map[partner_col])
    if flow_col:
        usecols.append(col_map[flow_col])
    usecols.extend(year_cols)
    
    print(f"[*] 読み込む列: {usecols}")
    
    try:
        df = pd.read_csv(dots_csv_path, usecols=usecols, low_memory=False, encoding_errors='replace', index_col=False)
    except Exception as e:
        print(f"[!] IMF DOTS CSVの読み込みに失敗しました: {e}")
        return {}
        
    df.columns = [c.upper() for c in df.columns]
    
    # 英語名・大文字に統一したカラム名の再割り当て
    reporter_col = reporter_col.upper() if reporter_col else None
    partner_col = partner_col.upper() if partner_col else None
    flow_col = flow_col.upper() if flow_col else None
    
    if not reporter_col or not partner_col:
        print(f"[!] 必須カラム (COUNTRY/REPORTER, COUNTERPART_COUNTRY/PARTNER) が見つかりません。")
        return {}
        
    # 輸出 (flow) フィルタ
    if flow_col:
        df = df[df[flow_col].astype(str).str.lower().str.contains('export|txg|fob|x', na=True)]
        
    # 年度の列（数値のみの4桁の列、例：'2024', '2025'）を探す
    year_cols = [c for c in df.columns if c.isdigit() and len(c) == 4]
    if not year_cols:
        print("[!] 年度の列が見つかりません。")
        return {}
        
    year_cols = sorted(year_cols)
    
    # 最新の利用可能な年を選択するためのカラム優先順位（例：['2025', '2024', '2023', ...]）
    pref_years = [y for y in year_cols if int(y) >= 2020][::-1]
    if not pref_years:
        pref_years = year_cols[::-1]

    print(f"[*] 対象年度の優先順位: {pref_years}")

    # 各行のデータから「存在する中で最新の年の値」を取り出して新しい 'value' カラムにセットする
    # ※ 各年の列から順次 fillna を使って代入する（ベクトル演算で高速化）
    df['value'] = np.nan
    for y in pref_years:
        val_series = pd.to_numeric(df[y], errors='coerce')
        df['value'] = df['value'].fillna(val_series)
        
    df['value'] = df['value'].fillna(0.0)
    
    # 相手国が地域グループや 'World'、'Total'、その他未分類などのデータである場合は部分一致で除外する
    exclude_keywords = [
        'world', 'total', 'economies', 'union', 'area', 'caribbean', 'asia', 
        'europe', 'africa', 'hemisphere', 'specified', 'countries', 'residual',
        'nan', 'unspecified', 'regional', 'organizations', 'special categories',
        'emdes', 'middle', 'cis'
    ]
    pattern = '|'.join(exclude_keywords)
    df = df[~df[partner_col].astype(str).str.lower().str.contains(pattern, na=True, regex=True)]
    
    result = {}
    
    # 報告国(reporter)ごとに処理
    reporters = df[reporter_col].dropna().unique()
    for rep in reporters:
        # 報告国名からISO3コードへの変換
        rep_iso = None
        rep_str = str(rep).strip().lower()
        rep_clean = clean_brackets(rep_str).strip()
        
        if rep_clean in eng_name_to_iso3:
            rep_iso = eng_name_to_iso3[rep_clean]
        else:
            for eng_name, iso in eng_name_to_iso3.items():
                if eng_name in rep_clean or rep_clean in eng_name:
                    rep_iso = iso
                    break
                    
        if target_iso_list and rep_iso not in target_iso_list:
            continue
            
        if not rep_iso:
            rep_iso = rep_str.upper()
            
        rep_exports = df[df[reporter_col] == rep]
        if rep_exports.empty:
            continue
            
        # 相手国ごとの貿易額を集計
        partner_sums = rep_exports.groupby(partner_col)['value'].sum().reset_index()
        total_val = partner_sums['value'].sum()
        
        if total_val == 0:
            continue
            
        # 上位10カ国
        top_partners = partner_sums.sort_values(by='value', ascending=False).head(10)
        
        partner_list = []
        for _, row in top_partners.iterrows():
            p_name = str(row[partner_col])
            # カッコの除去と日本語化
            p_clean = clean_brackets(p_name)
            p_ja = COUNTRY_EN_TO_JA.get(p_clean, p_clean)
            
            share = (row['value'] / total_val) * 100
            partner_list.append({
                "country": p_ja,
                "share": f"{share:.1f}%"
            })
            
        # 10件に満たない場合は空データで埋める
        while len(partner_list) < 10:
            partner_list.append({"country": "", "share": ""})
            
        result[rep_iso] = partner_list
        
    return result

# =====================================================================
# 4. データの統合と出力
# =====================================================================
def merge_and_save(comtrade_data, dots_data, output_dir):
    """両データをマージし、軽量CSVおよび国別JSONを出力する"""
    os.makedirs(output_dir, exist_ok=True)
    
    # 統合データリスト
    merged_rows = []
    
    # Comtradeの国コードを基準にループ
    for iso, com_val in comtrade_data.items():
        # DOTSから相手国データを取得（キーはISO3）
        partners = dots_data.get(iso, [{"country": "", "share": ""} for _ in range(10)])
        
        # 日本語国名の取得
        country_ja = ISO3_TO_JA.get(iso, iso)
        
        # JSON用のデータ構造作成
        country_json = {
            "国名（日本語）": country_ja,
            "code3": iso
        }
        
        # 1. 輸出1位〜10位を追加
        for i in range(10):
            country_json[f"輸出{i+1}位_品目"] = com_val["exports"][i]
            
        # 2. 輸入1位〜10位を追加
        for i in range(10):
            country_json[f"輸入{i+1}位_品目"] = com_val["imports"][i]
            
        # 3. 貿易相手1位〜10位を追加
        for i in range(10):
            idx = i + 1
            country_json[f"貿易相手{idx}位_国名"] = partners[i]["country"]
            country_json[f"貿易相手{idx}位_シェア%"] = partners[i]["share"]
            
        # 4. 最後に年度と出典を追加
        country_json["貿易統計_年"] = com_val.get("year", "")
        country_json["貿易統計_出典"] = f"UN Comtrade / IMF DOTS ({com_val.get('year', '')}年)"
            
        # 1. 国別の個別JSONを出力
        json_path = os.path.join(output_dir, f"{iso}.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(country_json, f, ensure_ascii=False, indent=2)
            
        merged_rows.append(country_json)
        
    # 2. 全体をまとめたフラットな軽量CSVを出力
    if merged_rows:
        df_out = pd.DataFrame(merged_rows)
        csv_path = os.path.join(output_dir, "trade_summary.csv")
        df_out.to_csv(csv_path, index=False, encoding='utf-8-sig')
        print(f"[+] 統合CSVを保存しました: {csv_path}")
        print(f"[+] 国別JSONファイルを保存しました（出力先: {output_dir}）")
    else:
        print("[!] 統合できるデータがありませんでした。")

# =====================================================================
# 5. メイン処理
# =====================================================================
def main():
    parser = argparse.ArgumentParser(description="バルク貿易データのフィルタリングと軽量化加工")
    parser.add_argument("--comtrade", required=True, help="UN Comtrade の品目別バルクCSVのパス")
    parser.add_argument("--dots", required=True, help="IMF DOTS の貿易相手国バルクCSVのパス")
    parser.add_argument("--output-dir", default="./output", help="出力先ディレクトリ")
    parser.add_argument("--countries", help="カンマ区切りの対象国ISO3コード（例: USA,JPN,DEU）。指定がない場合は全件処理します")
    
    args = parser.parse_args()
    
    target_countries = None
    if args.countries:
        target_countries = [c.strip().upper() for c in args.countries.split(',')]
        print(f"[*] 抽出対象国: {target_countries}")
        
    # 各データの処理
    comtrade_res = process_comtrade(args.comtrade, target_countries)
    dots_res = process_imf_dots(args.dots, target_countries)
    
    # データのマージと保存
    merge_and_save(comtrade_res, dots_res, args.output_dir)

if __name__ == "__main__":
    main()

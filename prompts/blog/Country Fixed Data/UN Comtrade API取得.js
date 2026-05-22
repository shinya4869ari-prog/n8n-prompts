const prev = $('プロンプト取得用 Code').first().json;
const code3 = prev.base?.code3 || "";
const countryJa = prev.base?.country || "";

if (!code3) throw new Error("code3が取得できませんでした");

const iso3ToM49 = {
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
};

const numCode = iso3ToM49[code3];
if (!numCode) throw new Error(`M49コードが見つかりません: ${code3}`);

const year = new Date().getFullYear() - 1;

const fetchJson = async (url) => {
  const res = await axios.get(url);
  return res.data;
};

const base = `https://comtradeapi.un.org/public/v1/preview/C/A/HS`;

const [exportData, importData, partnerData] = await Promise.all([
    fetchJson(`${base}?reporterCode=${numCode}&flowCode=X&period=${year}&includeDesc=true`),
    fetchJson(`${base}?reporterCode=${numCode}&flowCode=M&period=${year}&includeDesc=true`),
    fetchJson(`${base}?reporterCode=${numCode}&flowCode=X&period=${year}&partnerCode=0&includeDesc=true`),
]);

const exportItems = (exportData.data || [])
    .filter(d => d.cmdCode !== "TOTAL" && d.cmdDesc)
    .sort((a, b) => (b.primaryValue || 0) - (a.primaryValue || 0))
    .slice(0, 10)
    .map((d, i) => ({ 順位: String(i + 1), 品目: d.cmdDesc }));

const importItems = (importData.data || [])
    .filter(d => d.cmdCode !== "TOTAL" && d.cmdDesc)
    .sort((a, b) => (b.primaryValue || 0) - (a.primaryValue || 0))
    .slice(0, 10)
    .map((d, i) => ({ 順位: String(i + 1), 品目: d.cmdDesc }));

const totalExport = (partnerData.data || []).find(d => d.partnerCode === 0)?.primaryValue || 1;
const partnerItems = (partnerData.data || [])
    .filter(d => d.partnerCode !== 0 && d.partnerDesc && d.partnerDesc !== "World")
    .sort((a, b) => (b.primaryValue || 0) - (a.primaryValue || 0))
    .slice(0, 10)
    .map((d, i) => ({
        順位: String(i + 1),
        国名: d.partnerDesc,
        シェア: ((d.primaryValue / totalExport) * 100).toFixed(1) + "%"
    }));

return [{
    json: {
        "国名（日本語）": countryJa,
        "code3": code3,
        "貿易": {
            "主要輸出項目": exportItems,
            "主要輸入項目": importItems,
            "貿易相手国": partnerItems,
            "出典": `UN Comtrade（${year}年）`
        }
    }
}];
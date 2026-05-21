const hub = $('プロンプト取得用 Code').first().json;
const base = hub.base;
const iso2 = base.countryCode;

const indicators = {
  殺人率:           'VC.IHR.PSRC.P5',
  自殺率:           'SH.STA.SUIC.P5',
  交通事故死亡率:   'SH.STA.TRAF.P5',
  貧困率:           'SI.POV.NAHC',
  ジニ係数:         'SI.POV.GINI',
  失業率:           'SL.UEM.TOTL.ZS',
  女性労働参加率:   'SL.TLF.CACT.FE.ZS',
  女性議員比率:     'SG.GEN.PARL.ZS',
  児童労働率:       'SL.TLF.0714.ZS',
};

const fetchIndicator = async (iso, indicatorId) => {
  try {
    const url = `https://api.worldbank.org/v2/country/${iso}/indicator/${indicatorId}?format=json&mrv=5&per_page=5`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const text = await response.text();
    let res;
    try { res = JSON.parse(text); } catch { return null; }
    const rows = Array.isArray(res) ? res[1] : null;
    if (!rows) return null;
    for (const row of rows) {
      if (row.value !== null && row.value !== undefined) {
        return { 値: row.value, 年: String(row.date), 出典: 'World Bank' };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

const wb = {};
await Promise.all(
  Object.entries(indicators).map(async ([key, id]) => {
    wb[key] = await fetchIndicator(iso2, id);
  })
);

return [{
  json: {
    ...($input.first().json),
    wb
  }
}];
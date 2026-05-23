const currentYear = new Date().getFullYear();
const today = new Date();
const isManual = $execution.mode === 'manual';

const thresholds = {
    "殺人率": 1,
    "交通事故死亡率": 1,
    "自殺率": 1,
    "失業率": 1,
    "貧困率": 1,
    "ジニ係数": 1,
    "刑務所収容率": 1,
    "刑務所総収容者数": 1,
    "GPI": 1,
    "外務省危険レベル": 1,
    "GGI": 1,
    "女性労働参加率": 1,
    "女性議員比率": 1,
    "児童労働率": 1,
};

const yearColMap = {
    "殺人率": "殺人率_年",
    "交通事故死亡率": "交通事故死亡率_年",
    "自殺率": "自殺率_年",
    "失業率": "失業率_年",
    "貧困率": "貧困率_年",
    "ジニ係数": "ジニ係数_年",
    "刑務所収容率": "刑務所収容率_年",
    "刑務所総収容者数": "刑務所総収容者数_年",
    "GPI": "GPI年",
    "外務省危険レベル": null,
    "GGI": "GGI年",
    "女性労働参加率": "女性労働参加率_年",
    "女性議員比率": "女性議員比率_年",
    "児童労働率": "児童労働率_年",
};

// フォームトリガーから指定された国名を取得（On Home Trigger, Form Trigger 等から安全に取得）
let specifiedCountry = "";
const possibleTriggers = ["On Home Trigger", "Form Trigger", "Form", "Webhook"];
for (const triggerName of possibleTriggers) {
    try {
        const data = $(triggerName).first().json;
        const val = (data?.targetCountry ?? data?.country ?? data?.countryName ?? "").trim();
        if (val) {
            specifiedCountry = val;
            break;
        }
    } catch (e) {
        // ノードが存在しない、または取得に失敗した場合はスキップ
    }
}

// 全シートのデータを国名でマージ
const countryMap = {};
for (const item of $input.all()) {
    const row = item.json;
    const name = row["国名（日本語）"];
    if (!name) continue;
    if (!countryMap[name]) countryMap[name] = {};
    Object.assign(countryMap[name], row);
}

const results = [];

for (const [name, row] of Object.entries(countryMap)) {

    if (specifiedCountry) {
        // ① 特定の国が指定されている場合：その国だけを強制処理（予定日は無視）
        if (name !== specifiedCountry) {
            continue;
        }
    } else {
        // ② 国名が指定されていない場合（自動実行、または空欄での手動実行）：予定日が未来ならスキップ
        const nextUpdate = row["次回アップデート予定日"];
        if (nextUpdate && new Date(nextUpdate) > today) {
            continue;
        }
    }

    const staleItems = [];

    for (const [label, yearCol] of Object.entries(yearColMap)) {

        const threshold = thresholds[label];

        // 年フィールドなし→常に対象
        if (!yearCol) {
            staleItems.push(label);
            continue;
        }

        const raw = row[yearCol];

        // 値がない→対象
        if (!raw) {
            staleItems.push(label);
            continue;
        }



        // 年度で判定
        const year = parseInt(raw);
        if (!year || currentYear - year >= threshold) {
            staleItems.push(label);
        }
    }

    if (staleItems.length > 0) {
        results.push({
            json: {
                rowData: row,
                staleItems,
                countryJa: row["国名（日本語）"],
                countryEn: row["国名（英語）"],
                countryCode: row["国コード"],
                capital: row["首都（日本語）"],
                currency: row["通貨コード"],
            }
        });
    }
}

return results;
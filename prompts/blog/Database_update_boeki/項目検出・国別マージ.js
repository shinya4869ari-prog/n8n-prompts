const currentYear = new Date().getFullYear();
const today = new Date();
const isManual = $execution.mode === 'manual';

const thresholds = {
    "貿易": 1,
};

const yearColMap = {
    "貿易": "貿易統計_年",
};

// 全シートのデータを国名でマージ
const countryMap = {};
for (const item of $input.all()) {
    const row = item.json;
    const name = row["国名（日本語）"] || row["code3"];
    if (!name) continue;
    if (!countryMap[name]) countryMap[name] = {};
    Object.assign(countryMap[name], row);
}

const results = [];

for (const [name, row] of Object.entries(countryMap)) {

    // 自動実行時：次回アップデート予定日が今日以前の国だけ処理
    if (!isManual) {
        const nextUpdate = row["次回アップデート予定日"];
        if (nextUpdate && new Date(nextUpdate) > today) {
            continue; // スキップ
        }
    }

    const staleItems = [];

    for (const [label, yearCol] of Object.entries(yearColMap)) {

        const threshold = thresholds[label];

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
                countryJa: row["国名（日本語）"] || row["code3"] || "",
                countryEn: row["国名（英語）"] || "",
                countryCode: row["国コード"] || row["code3"] || "",
                capital: row["首都（日本語）"] || "",
                currency: row["通貨コード"] || "",
            }
        });
    }
}

return results;
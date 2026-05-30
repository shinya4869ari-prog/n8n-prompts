const currentYear = new Date().getFullYear();
const today = new Date();

const thresholds = {
    "殺人率": 1,
    "交通事故死亡率": 1,
    "自殺率": 1,
    "失業率": 1,
    "貧困率": 1,
    "ジニ係数": 1,
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
    "GPI": "GPI年",
    "外務省危険レベル": null,
    "GGI": "GGI年",
    "女性労働参加率": "女性労働参加率_年",
    "女性議員比率": "女性議員比率_年",
    "児童労働率": "児童労働率_年",
};

// フォームトリガーから指定された国名を取得
let specifiedCountry = "";

// 1. 直前のインプット ($input) からフォーム入力を探す（マージ等で結合されて流れてきた場合）
const allInputs = $input.all();
for (const item of allInputs) {
    const data = item.json;
    if (data && (data.submittedAt || data.formMode)) {
        const val = (data["国名（日本語）"] ?? data.targetCountry ?? data.country ?? "").trim();
        if (val) {
            specifiedCountry = val;
            break;
        }
    }
}

// 2. $input に見つからない場合は、$("ノード名") の静的参照で取得を試みる
if (!specifiedCountry) {
    const getCountryFromNode = (nodeName) => {
        try {
            // 変数を直接 $() に渡すと n8n が静的解析で依存関係を検出できずエラーになる場合があるため、
            // 文字列リテラルを直接渡して安全に評価する
            let nodeData;
            if (nodeName === "国名入力") nodeData = $("国名入力").first().json;
            else if (nodeName === "On Home Trigger") nodeData = $("On Home Trigger").first().json;
            else if (nodeName === "Form Trigger") nodeData = $("Form Trigger").first().json;
            else if (nodeName === "Form") nodeData = $("Form").first().json;
            else if (nodeName === "Webhook") nodeData = $("Webhook").first().json;
            
            return (nodeData?.["国名（日本語）"] ?? nodeData?.targetCountry ?? nodeData?.country ?? nodeData?.countryName ?? "").trim();
        } catch (e) {
            return "";
        }
    };
    
    specifiedCountry = getCountryFromNode("国名入力") ||
                       getCountryFromNode("On Home Trigger") ||
                       getCountryFromNode("Form Trigger") ||
                       getCountryFromNode("Form") ||
                       getCountryFromNode("Webhook");
}

// 全シートのデータを国名でマージ（フォーム入力のデータ行はマージ対象から除外）
const countryMap = {};
for (const item of allInputs) {
    const row = item.json;
    // フォーム入力データはスキップ
    if (row && (row.submittedAt || row.formMode)) {
        continue;
    }
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
const base = $('国名変換Code').first().json;
const raw = $('プロンプト取得用 Code').first().json.researcherPrompt;
const now = new Date();

const context = {
    ...base,
    now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
    now_year: String(now.getFullYear()),
};

const evaluated = raw
    .replace(/\{\{\s*\$json\.([^\s\}]+)\s*\}\}/g, (match, path) => {
        const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, context);
        return value !== undefined ? String(value) : '';
    })
    .replace(/\{\{\s*\$now\.toFormat\([^)]+\)\s*\}\}/g, `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`)
    .replace(/\{\{[^}]+\}\}/g, '');

return [{
    json: {
        ...base,
        researcherPrompt: evaluated
    }
}];
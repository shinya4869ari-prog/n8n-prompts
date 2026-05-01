// GitHubのRaw URL（5つ）
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E8%A8%98%E4%BA%8B%E4%BD%9C%E6%88%90_%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E4%BD%BF%E7%94%A8_v2/';

const files = {
  researcher1:    baseUrl + 'researcher1.md',
  researcher2:    baseUrl + 'researcher2.md',
  researcher25:   baseUrl + 'researcher25.md',
  writer:         baseUrl + 'writer.md',
  'Deep-Dive_writer': baseUrl + 'Deep-Dive_writer.md'
};

try {
  const [r1, r2, r25, w, dd] = await Promise.all([
    this.helpers.httpRequest({ method: 'GET', url: files.researcher1 }),
    this.helpers.httpRequest({ method: 'GET', url: files.researcher2 }),
    this.helpers.httpRequest({ method: 'GET', url: files.researcher25 }),
    this.helpers.httpRequest({ method: 'GET', url: files.writer }),
    this.helpers.httpRequest({ method: 'GET', url: files['Deep-Dive_writer'] })
  ]);

  // 前のノード（国名変換Code）のデータを取得
  const base = $input.first().json;
  
  // 現在の日付データを作成
  const now = new Date();
  const context = {
    ...base,
    now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
    now_year: String(now.getFullYear())
  };

  // {{ $json.fieldName }} を実際の値に置換する関数
  // 多言語やドットを含むパスにも対応できるように強化
  const evaluateTemplate = (text, data) => {
    return text.replace(/\{\{\s*\$json\.([^\s\}]+)\s*\}\}/g, (match, path) => {
      // ドット区切りのパス（例: data.対象国データ.地理）に対応
      const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, data);
      return value !== undefined ? value : match;
    });
  };

  return [{
    json: {
      ...base,
      researcherPrompt1: evaluateTemplate(r1, context),
      researcherPrompt2: evaluateTemplate(r2, context),
      researcherPrompt25: evaluateTemplate(r25, context),
      writerPrompt: evaluateTemplate(w, context),
      deepDivePrompt: evaluateTemplate(dd, context)
    }
  }];
} catch (error) {
  throw new Error(`プロンプト読み込み・置換失敗: ${error.message}`);
}

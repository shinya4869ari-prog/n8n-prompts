// GitHubのRaw URLベースパス
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/%E8%A8%98%E4%BA%8B%E4%BD%9C%E6%88%90_%E5%9B%BA%E5%AE%9A%E3%83%87%E3%83%BC%E3%82%BF%E4%BD%BF%E7%94%A8_v2/';

// 同期対象の全15ファイル
const files = {
  // --- AIプロンプト（既存のキー名を維持） ---
  researcher1:      baseUrl + 'researcher1.md',
  researcher2:      baseUrl + 'researcher2.md',
  researcher25:     baseUrl + 'researcher25.md',
  writer:           baseUrl + 'writer.md',
  deepDiveWriter:   baseUrl + 'Deep-Dive_writer.md',
  // --- AIプロンプト（追加分） ---
  deepDiveSelect:   baseUrl + 'Deep-Dive_select.md',
  mainWriter:       baseUrl + 'main-writer.md',
  qualityCheck:     baseUrl + 'quality_check.md',
  responseExtract:  baseUrl + 'response_extraction.md',
  // --- プログラムコード類（JavaScript） ---
  seikei1:          baseUrl + encodeURIComponent('整形ノード１.md'),
  seikei2:          baseUrl + encodeURIComponent('製形２.md'),
  seikei3:          baseUrl + encodeURIComponent('整形３.md'),
  finalCode:        baseUrl + encodeURIComponent('最終Code.md'),
  linkInsert:       baseUrl + encodeURIComponent('リンク挿入ノード.md'),
  substitution:     baseUrl + encodeURIComponent('万能置換ノード.md')
};

try {
  // すべて一括で取得
  const keys = Object.keys(files);
  const responses = await Promise.all(
    keys.map(key => this.helpers.httpRequest({ method: 'GET', url: files[key] }))
  );

  const rawData = {};
  keys.forEach((key, index) => { rawData[key] = responses[index]; });

  // テンプレート置換ロジック
  const base = $input.first().json;
  const now = new Date();
  const context = {
    ...base,
    now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
    now_year: String(now.getFullYear())
  };

  const evaluateTemplate = (text, data) => {
    if (!text) return "";
    return text.replace(/\{\{\s*\$json\.([^\s\}]+)\s*\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, data);
      return value !== undefined ? value : match;
    });
  };

  return [{
    json: {
      ...base,
      // 既存ノードがそのまま動くための出力キー
      researcherPrompt1: evaluateTemplate(rawData.researcher1, context),
      researcherPrompt2: evaluateTemplate(rawData.researcher2, context),
      researcherPrompt25: evaluateTemplate(rawData.researcher25, context),
      writerPrompt: evaluateTemplate(rawData.writer, context),
      deepDivePrompt: evaluateTemplate(rawData.deepDiveWriter, context),

      // プログラムコード類（後続のCodeノードで eval() して使えるように渡す）
      scripts: {
        seikei1: rawData.seikei1,
        seikei2: rawData.seikei2,
        seikei3: rawData.seikei3,
        finalCode: rawData.finalCode,
        linkInsert: rawData.linkInsert,
        substitution: rawData.substitution
      },

      // その他のプロンプト
      qualityCheckPrompt: evaluateTemplate(rawData.qualityCheck, context),
      mainWriterPrompt: evaluateTemplate(rawData.mainWriter, context)
    }
  }];
} catch (error) {
  throw new Error(`一括同期失敗: ${error.message}`);
}

// ==============================================================================
// 🔄 PromptLoader: GitHub同期 ＆ 動的テンプレート展開ノード（高機能安定版）
//
// 【機能】
//   1. GitHub Raw URLのCDNキャッシュ（Fastly 5分遅延）をキャッシュバスター(?t=...)で完全回避
//   2. 最新プロンプトを並列一括ダウンロード
//   3. {{ $json.country }} や日付、オブジェクト/配列の自動JSON文字列化を展開
//   4. どのファイルが何文字同期されたかをコンソールに見やすくレポート
// ==============================================================================

// GitHubのRaw URLベースパス
const baseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/main-blog-lowcost/';
const blogBaseUrl = 'https://raw.githubusercontent.com/shinya4869ari-prog/n8n-prompts/main/prompts/blog/';

// 同期対象のAIプロンプトファイル一覧
const files = {
  researcher1:     baseUrl + 'researcher1.md',
  researcher2:     baseUrl + 'researcher2.md',
  researcher25:    baseUrl + 'researcher25.md',
  writerPrompt:    baseUrl + 'writer.md',
  deepDivePrompt:  baseUrl + 'Deep-Dive_writer.md',
  qualityCheck:    blogBaseUrl + 'universal_quality_check.md',
  responseExtract: baseUrl + 'response_extraction.md'
};

try {
  // CDNキャッシュを強制回避するためのタイムスタンプクエリ
  const cacheBuster = `?t=${Date.now()}`;
  const keys = Object.keys(files);

  // すべて並列一括で最新取得
  const responses = await Promise.all(
    keys.map(async (key) => {
      try {
        const res = await this.helpers.httpRequest({
          method: 'GET',
          url: files[key] + cacheBuster,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        return { key, data: res, success: true };
      } catch (err) {
        throw new Error(`ファイル [${key}] の取得に失敗 (${files[key]}): ${err.message}`);
      }
    })
  );

  const rawData = {};
  responses.forEach(r => { rawData[r.key] = r.data; });

  // ----------------------------------------------------------------------------
  // テンプレート展開用コンテキストの構築
  // ----------------------------------------------------------------------------
  const base = $input.first()?.json || {};
  const now = new Date();
  const context = {
    ...base,
    country: base.country || '',
    countryEn: base.countryEn || '',
    now_date: `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`,
    now_year: String(now.getFullYear())
  };

  // ----------------------------------------------------------------------------
  // 高度テンプレート置換エンジン
  // ----------------------------------------------------------------------------
  const evaluateTemplate = (text, data) => {
    if (!text || typeof text !== 'string') return '';

    return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
      const expr = expression.trim();

      // 1. 日付フォーマット
      if (expr.includes('$now.toFormat') || expr.includes('now_date')) {
        return context.now_date;
      }
      if (expr.includes('now_year')) {
        return context.now_year;
      }

      // 2. JSON.stringify($json.xxx) 記法への対応
      const jsonStringifyMatch = expr.match(/JSON\.stringify\(\s*\$json(?:\.([a-zA-Z0-9_]+))?\s*\)/);
      if (jsonStringifyMatch) {
        const prop = jsonStringifyMatch[1];
        const val = prop ? data[prop] : data;
        return val !== undefined ? JSON.stringify(val, null, 2) : '';
      }

      // 3. 通常のパイプライン/フォールバック (例: $json.country || '日本')
      const parts = expr.split('||').map(p => p.trim());
      for (const part of parts) {
        // $json.プロパティ の探索
        if (part.startsWith('$json.')) {
          const path = part.replace('$json.', '');
          const value = path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, data);
          if (value !== undefined && value !== null && value !== '') {
            // オブジェクトや配列の場合は安全にJSON化
            return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
          }
        }
        // 直接のプロパティ名 (例: country)
        else if (data[part] !== undefined && data[part] !== null && data[part] !== '') {
          const value = data[part];
          return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
        }
        // 文字列リテラル (例: "日本" または '日本')
        else if ((part.startsWith('"') && part.endsWith('"')) || (part.startsWith("'") && part.endsWith("'"))) {
          return part.slice(1, -1);
        }
      }

      // 解決できなかった場合は元の match をそのまま残す
      return match;
    });
  };

  // 各プロンプトを置換展開
  const evaluatedPrompts = {};
  console.log(`🚀 [PromptLoader] 対象国: ${context.country || '未指定'} | 同期プロンプト一覧:`);
  
  for (const key of keys) {
    evaluatedPrompts[key] = evaluateTemplate(rawData[key], context);
    const len = (evaluatedPrompts[key] || '').length;
    console.log(`  ✅ ${key.padEnd(16)}: ${len.toLocaleString()} 文字`);
  }

  return [{
    json: {
      ...evaluatedPrompts,
      ...context
    }
  }];

} catch (error) {
  throw new Error(`[PromptLoader エラー] プロンプト一括同期失敗: ${error.message}`);
}
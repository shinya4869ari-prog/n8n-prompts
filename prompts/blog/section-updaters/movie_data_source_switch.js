/**
 * 【映画データソース全自動切替・合流コード】
 * 1. フォームにコピーJSON(content_data)が貼られている場合 ➔ コピーデータで記事生成！
 * 2. フォームのJSONが空の場合 ➔ Supabase DBから取得した10本で記事生成！
 */

const trig = $('On form submission').first()?.json || {};
const rawContent = trig.content_data || trig.json_data || "";

let resultItems = [];

// A. フォームにコピーJSONが貼られている場合（最優先）
if (rawContent && typeof rawContent === 'string' && rawContent.trim().length > 10) {
  try {
    const parsed = JSON.parse(rawContent.trim());
    resultItems = Array.isArray(parsed) ? parsed : [parsed];
  } catch(e) {
    resultItems = [];
  }
}

// B. フォームのJSONが空の場合 ➔ Supabaseノード(映画10本の一括取得)のデータを採用
if (resultItems.length === 0) {
  try {
    const supabaseItems = $('映画10本の一括取得').all().map(item => item.json);
    resultItems = supabaseItems.filter(item => item && (item.title || item.idx));
  } catch(e) {
    resultItems = [];
  }
}

// C. フォールバック
if (resultItems.length === 0) {
  resultItems = $input.all().map(item => item.json).filter(item => item && (item.title || item.idx));
}

return resultItems.map(item => ({ json: item }));

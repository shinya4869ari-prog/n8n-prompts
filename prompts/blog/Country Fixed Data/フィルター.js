const today = new Date();
const items = $input.all();

const daysSince = (dateStr) => {
  if (!dateStr) return 9999; // 空欄の場合は最優先にするため大きな値を返す
  return (today - new Date(dateStr)) / (1000 * 60 * 60 * 24);
};

// 1. 期限切れ（30日超）または未取得（空欄）の国を抽出
const targets = items.filter(item => {
  const d = item.json;
  const expired = daysSince(d['最終取得日']) > 30;
  return expired;
});

// 2. 未取得（空欄）の国が先頭に来るようにソート
targets.sort((a, b) => {
  const dateA = a.json['最終取得日'];
  const dateB = b.json['最終取得日'];
  
  if (!dateA && dateB) return -1; // aが空欄でbが空欄でない場合、aを前に
  if (dateA && !dateB) return 1;  // bが空欄でaが空欄でない場合、bを前に
  return 0; // それ以外は元の順序（行番号順）を維持
});

// 3. 先頭から3件を取得
return targets.slice(0, 3).map(item => ({ json: item.json }));

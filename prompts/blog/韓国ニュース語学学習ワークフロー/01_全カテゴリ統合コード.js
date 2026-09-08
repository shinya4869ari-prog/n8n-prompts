/**
 * 【n8n用】全カテゴリ・クエリ統合生成コード（5大カテゴリ ＋ 推し人物動的切替対応版）
 * 
 * 役割:
 *  1. 先行ノード「⚙️ 実行設定（Edit Fields）」のスイッチ（include_celeb）を自動読み込み。
 *  2. 一般5大カテゴリ（犯罪、社会・暮らし、政治、経済、外交）のRSSクエリを確実に生成。
 *  3. include_celeb が true の場合のみ、Supabaseから渡された推し人物クエリを生成。
 *  4. 全カテゴリを1つの配列にまとめて一本化し、後続のRSS取得へ一括で流す。
 */

// =========================================================================
// ⚙️ 実行設定（先行ノード「⚙️ 実行設定」または「Edit Fields」から自動取得）
// =========================================================================
let includeCeleb = true;       // 推し人物を検索するか（デフォルト: true）
let maxCelebCount = 3;         // 検索する推しの最大人数（デフォルト: 3名）
let enableFallback = false;    // お気に入り登録が0件の場合に固定3名を検索するか（デフォルト: false）

try {
  // n8nの先行ノード「⚙️ 実行設定」または「Edit Fields」から設定値を自動取得
  const configNode = $('⚙️ 実行設定') || $('Edit Fields') || $('Config');
  const cfg = configNode.first()?.json;
  if (cfg) {
    if (cfg.include_celeb !== undefined) includeCeleb = Boolean(cfg.include_celeb);
    if (cfg.max_celeb_count !== undefined) maxCelebCount = Number(cfg.max_celeb_count) || 3;
    if (cfg.enable_fallback !== undefined) enableFallback = Boolean(cfg.enable_fallback);
  }
} catch (e) {
  // 設定ノードが見つからない場合はデフォルト値（true）で安全に動作
  includeCeleb = true;
}

const queries = [];

// 1. 一般5大重要カテゴリ（犯罪、社会・暮らし、政治、経済、外交）
queries.push(
  {
    category: 'crime',
    category_name: '🚨 犯罪・治安',
    search_query: '사건 사고 OR 경찰 OR 검찰 OR 재판',
    rss_url: 'https://news.google.com/rss/search?q=%EC%82%AC%EA%B1%B4+%EC%82%AC%EA%B3%A0+OR+%EA%B2%BD%EC%B0%B0+OR+%EA%B2%80%EC%B0%B0+OR+%EC%9E%AC%ED%8C%90+when:7d&hl=ko&gl=KR&ceid=KR:ko'
  },
  {
    category: 'life',
    category_name: '🏡 暮らし・社会',
    search_query: '물가 OR 부동산 OR 복지 OR 건강',
    rss_url: 'https://news.google.com/rss/search?q=%EB%AC%BC%EA%B0%80+OR+%EB%B6%80%EB%8F%99%EC%82%B0+OR+%EB%B3%B5%EC%A7%80+OR+%EA%B1%B4%EA%B0%95+when:7d&hl=ko&gl=KR&ceid=KR:ko'
  },
  {
    category: 'politics',
    category_name: '🏛️ 政治・国会',
    search_query: '국회 OR 대통령실 OR 정당',
    rss_url: 'https://news.google.com/rss/search?q=%EA%B5%AD%ED%9A%8C+OR+%EB%8C%80%ED%86%B5%EB%A0%B9%EC%8B%A4+OR+%EC%A0%95%EB%8B%B9+when:7d&hl=ko&gl=KR&ceid=KR:ko'
  },
  {
    category: 'economy',
    category_name: '📈 経済・金融',
    search_query: '금리 OR 환율 OR 코스피 OR 기업',
    rss_url: 'https://news.google.com/rss/search?q=%EA%B8%88%EB%A6%AC+OR+%ED%99%98%EC%9C%A8+OR+%EC%BD%94%EC%8A%A4%ED%94%BC+OR+%EA%B8%B0%EC%97%85+when:7d&hl=ko&gl=KR&ceid=KR:ko'
  },
  {
    category: 'diplomacy',
    category_name: '🌐 外交・国際',
    search_query: '외교 OR 정상회담 OR 안보',
    rss_url: 'https://news.google.com/rss/search?q=%EC%99%B8%EA%B5%90+OR+%EC%A0%95%EC%83%81%ED%9A%8C%EB%8B%B4+OR+%EC%95%88%EB%B3%B4+when:7d&hl=ko&gl=KR&ceid=KR:ko'
  }
);

// 2. お気に入り人物（推し）の抽出・追加（includeCelebがtrueの場合のみ実行）
if (includeCeleb) {
  const inputItems = $input.all();
  let favoritePersons = [];

  for (const item of inputItems) {
    const p = item.json;
    if (p && (p.name || p.name_en)) {
      let koreanName = '';
      if (p.name_en && /[가-힣]/.test(p.name_en)) {
        koreanName = p.name_en.trim();
      } else if (p.name && /[가-힣]/.test(p.name)) {
        koreanName = p.name.trim();
      } else {
        koreanName = (p.name || p.name_en || '').trim();
      }

      favoritePersons.push({
        id: p.id || null,
        name: (p.name || koreanName).trim(),
        korean_name: koreanName,
        name_en: (p.name_en || '').trim(),
        profile_url: p.profile_url || '',
        occupation: p.occupation || '人物'
      });
    }
  }

  // お気に入りが0件の場合のフォールバック（enableFallbackがtrueの場合のみ固定3名を追加）
  if (favoritePersons.length === 0 && enableFallback) {
    favoritePersons = [
      { id: null, name: 'キム・ナムギル', korean_name: '김남길', name_en: 'Kim Nam-gil', occupation: '배우', profile_url: '' },
      { id: null, name: 'パク・ウンビン', korean_name: '박은빈', name_en: 'Park Eun-bin', occupation: '배우', profile_url: '' },
      { id: null, name: 'ポン・ジュノ', korean_name: '봉준호', name_en: 'Bong Joon-ho', occupation: '영화감독', profile_url: '' }
    ];
  }

  // 検索人数を上限件数に絞る
  const targetPersons = favoritePersons.slice(0, maxCelebCount);

  // 推し人物のクエリを追加
  for (const person of targetPersons) {
    const searchName = person.korean_name || person.name;
    const encodedQuery = encodeURIComponent(`"${searchName}" when:7d`);
    queries.push({
      category: 'celeb',
      category_name: `⭐ 推し（${person.name}）`,
      person_id: person.id,
      person_name: person.name,
      person_korean_name: person.korean_name,
      person_name_en: person.name_en,
      person_profile_url: person.profile_url,
      occupation: person.occupation,
      search_query: searchName,
      rss_url: `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`
    });
  }
}

return queries.map(q => ({ json: q }));

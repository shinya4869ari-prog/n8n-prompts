/**
 * 【n8n用】お気に入り人物ニュース検索クエリ生成コード
 * 
 * 役割:
 *  1. Supabaseの Persons テーブルから取得したお気に入り人物を展開。
 *  2. 日本語名（name）とハングル名（name_en または name）を適切に判別し、Google News 韓国版で確実にヒットするハングル検索クエリを生成。
 *  3. お気に入りが0件の場合のみフォールバック人物（キム・ナムギル、パク・ウンビン、ポン・ジュノ等）を適用。
 */

const inputItems = $input.all();
let favoritePersons = [];

// 1. Supabase から渡された人物データを抽出
for (const item of inputItems) {
  const p = item.json;
  // Supabase で既に is_favorite=eq.true で絞り込まれているため、名前があれば採用
  if (p && (p.name || p.name_en)) {
    // 韓国語名（ハングル）の判定: name_en または name からハングルを優先抽出
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

// 2. お気に入りが未登録（本当に0件）の場合のセーフティ・デフォルト
if (favoritePersons.length === 0) {
  favoritePersons = [
    { id: null, name: 'キム・ナムギル', korean_name: '김남길', name_en: 'Kim Nam-gil', occupation: '배우', profile_url: '' },
    { id: null, name: 'パク・ウンビン', korean_name: '박은빈', name_en: 'Park Eun-bin', occupation: '배우', profile_url: '' },
    { id: null, name: 'ポン・ジュノ', korean_name: '봉준호', name_en: 'Bong Joon-ho', occupation: '영화감독', profile_url: '' }
  ];
}

// 3. 各人物ごとのニュース検索リクエストを作成
return favoritePersons.map(person => {
  const searchName = person.korean_name || person.name;
  const encodedQuery = encodeURIComponent(`"${searchName}" when:7d`);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;

  return {
    json: {
      category: 'celeb',
      category_name: `⭐ 推し（${person.name}）`,
      person_id: person.id,
      person_name: person.name,
      person_korean_name: person.korean_name,
      person_name_en: person.name_en,
      person_profile_url: person.profile_url,
      occupation: person.occupation,
      search_query: searchName,
      rss_url: rssUrl
    }
  };
});

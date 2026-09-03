/**
 * 【n8n用】お気に入り人物ニュース検索クエリ生成コード
 * 
 * 役割:
 *  1. Supabaseの Persons テーブルから取得したお気に入り人物（is_favorite = true）を展開。
 *  2. お気に入りが0件の場合のフォールバック人物（人気俳優・監督・アーティスト例: キム・ナムギル、パク・ウンビン、ソン・ガンホ等）を安全に適用。
 *  3. 各人物のハングル名で Google News RSS 検索用 URL を生成し、後続のニュース取得ループへ渡す。
 */

const inputItems = $input.all();
let favoritePersons = [];

// 1. Supabase から渡された人物データを抽出
for (const item of inputItems) {
  const p = item.json;
  if (p && (p.is_favorite === true || p.is_favorite === 'true') && (p.name || p.name_en)) {
    favoritePersons.push({
      id: p.id || null,
      name: p.name || '',
      name_en: p.name_en || '',
      profile_url: p.profile_url || '',
      occupation: p.occupation || '人物'
    });
  }
}

// 2. お気に入りが未登録の場合のセーフティ・デフォルト（韓国を代表する推し候補）
if (favoritePersons.length === 0) {
  favoritePersons = [
    { id: null, name: '김남길', name_en: 'Kim Nam-gil', occupation: '배우', profile_url: '' },
    { id: null, name: '박은빈', name_en: 'Park Eun-bin', occupation: '배우', profile_url: '' },
    { id: null, name: '봉준호', name_en: 'Bong Joon-ho', occupation: '영화감독', profile_url: '' },
    { id: null, name: '아이유', name_en: 'IU', occupation: '가수', profile_url: '' }
  ];
}

// 3. 各人物ごとのニュース検索リクエストを作成
const searchRequests = favoritePersons.map(person => {
  // ハングル名または英語名（ハングル優先）
  const searchName = person.name || person.name_en;
  
  // 直近7日間のニュースを対象とするGoogle News RSS検索URL
  // クエリ例: "김남길" when:7d
  const encodedQuery = encodeURIComponent(`"${searchName}" when:7d`);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ko&gl=KR&ceid=KR:ko`;

  return {
    json: {
      category: 'celeb',
      person_id: person.id,
      person_name: person.name,
      person_name_en: person.name_en,
      person_profile_url: person.profile_url,
      occupation: person.occupation,
      search_query: searchName,
      rss_url: rssUrl
    }
  };
});

return searchRequests;

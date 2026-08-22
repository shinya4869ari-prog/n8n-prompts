const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

const songData = {
  id: 'lyrics-love-laugh',
  title_ko: '그렇게 사랑하고 그렇게 웃었습니다 - 김나영',
  title_ja: 'あんなに愛して、あんなに笑い合いました (原曲: Bubble Sisters)',
  artist: '김나영 (Kim Na Young) / 버블 시스터즈',
  category: '감성 발라드 (感動バラード)',
  cat_class: 'cat-music',
  level: 'TOPIK 中〜上級 (詩的・感情表現)',
  source: 'ビギンアゲイン / 原曲: Bubble Sisters 3集',
  date: '명곡 발라드',
  spotify_url: 'https://open.spotify.com/search/%EA%B7%B8%EB%A0%87%EA%B2%8C%20%EC%82%AC%EB%9E%91%ED%95%98%EA%B3%A0%20%EA%B7%B8%EB%A0%87%EA%B2%8C%20%EC%9B%83%EC%97%88%EC%8A%B5%EB%8B%88%EB%8B%A4',
  location: {
    name: 'ソウル特別市 鐘路区 三清洞 (サムチョンドン)',
    lat: 37.5857,
    lng: 126.9818,
    desc: '『ビギンアゲイン オープンマイク』のロケ地として有名な情緒あふれる古民家カフェと伝統家屋の街並みです。'
  },
  sentences: [
    {
      ko: '꽃잎이 날리던 찬란한 봄날에 사랑이 시작된 날',
      rubi: 'コンニピ ナルリドン チャンランハン ポムナレ サランイ シジャクテン ナル',
      ja: '花びらが舞い散っていた眩しい春の日に 愛が始まったあの日'
    },
    {
      ko: '미풍이 불어와 손가락 사이사이로 날 들뜨게 했던 그날',
      rubi: 'ミプンイ プラワ ソンカラク サイサイロ ナル トゥルトゥゲ ヘットン クナル',
      ja: 'そよ風が吹き抜けて指の隙間を通り 私の心をときめかせたあの日'
    },
    {
      ko: '세월은 쉴새 없이 흘러서 첫사랑의 아련한 추억이란 이름이 되고',
      rubi: 'セウォルン スィルセ オプシ フルロソ チョッサランエ アリョナン チュオギラン イリミ テゴ',
      ja: '年月は休む間もなく流れて 初恋のおぼろげな思い出という名になり'
    },
    {
      ko: '내가 그렇게 사랑하고 그렇게 웃었던 지난 날',
      rubi: 'ネガ クロッケ サランハゴ クロッケ ウソットン チナン ナル',
      ja: '私がそれほどまでに愛し、それほどまでに笑い合った過ぎ去りし日々'
    },
    {
      ko: '너라는 세상 내 세상의 중심 그 안에 살아',
      rubi: 'ノラヌン セサン ネ セサンエ ジュンシム ク アネ サラ',
      ja: '君という世界、私の世界の中心、その中で今も生きている'
    },
    {
      ko: '지금도 행복하다고 춤추던 바람 꽃잎 날려 아름다웠던 추억들',
      rubi: 'チグムド ヘンボカダゴ チュムチュドン パラム コンニプ ナルリョ アルムダウォットン チュオクトゥル',
      ja: '「今も幸せだ」と踊っていた風 花びらが舞って美しかった思い出たち'
    },
    {
      ko: '니가 부르던 휘파람 소리도 내 맘에 박혀 버릇처럼 난 웃어',
      rubi: 'ニガ プルドン フィパラム ソリド ネ マメ パキョ ポルッチョロム ナン ウソ',
      ja: '君が吹いていた口笛の音も私の心に刻まれて 癖のように私は微笑むの'
    },
    {
      ko: '사랑이 멈춰서 웃음도 멈춰서버린 날 슬프게 했던 그날',
      rubi: 'サランイ モムチョソ ウスムド モムチョソボリン ナル スルプゲ ヘットン クナル',
      ja: '愛が止まって笑顔さえ止まってしまった日 私を悲しませたあの日'
    },
    {
      ko: '눈물이 쉴새 없이 흘러서 지독히도 괴롭던 아픔 마저 선율이 되고',
      rubi: 'ヌンムリ スィルセ オプシ フルロソ チドキド クェロプトン アプム マジョ ソニュリ テゴ',
      ja: '涙がひっきりなしに流れて ひどく苦しかった痛みさえ美しい旋律になって'
    },
    {
      ko: '너라는 세상 내 전부였던 너란 추억이 고마워',
      rubi: 'ノラヌン セサン ネ チョンブヨットン ノラン チュオギ コマウォ',
      ja: '君という世界、私の全てだった君という思い出にありがとう'
    },
    {
      ko: '잊을 수 없는 잊혀지지 않을 하나뿐인 내 사랑에 울다가도 웃게 되었고',
      rubi: 'イジュル ス オムヌン イチョジジ アヌル ハナプニン ネ サランエ ウルダガド ウッケ テオッコ',
      ja: '忘れられない 決して消え去ることのない唯一の私の愛に 泣きながらも笑えるようになり'
    },
    {
      ko: '잔인한 그리움도 선물로 남은 사랑',
      rubi: 'チャニンハン クリウムド ソンムルロ ナムン サラン',
      ja: '残酷なまでの恋しささえ 贈り物として残った愛'
    },
    {
      ko: '내가 그렇게도 사랑하고 그렇게 웃었던 지난 날 너라는 세상 그 안에 살아',
      rubi: 'ネガ クロッケド サランハゴ クロッケ ウソットン チナン ナル ノラヌン セサン ク アネ サラ',
      ja: '私がそれほどまでに愛し、それほどまでに笑い合った過去の日々 君という世界の中で生きている'
    },
    {
      ko: '많이 난 행복했다고 춤추던 바람, 아직 버릇처럼 난 울어',
      rubi: 'マニ ナン ヘンボケッタゴ チュムチュドン パラム、アジク ポルッチョロム ナン ウロ',
      ja: '「とても幸せだった」と踊っていた風、今も癖のように私は涙を流すの'
    }
  ],
  vocab: [
    { word: '찬란한', hanja: '燦爛―', pos: '形容詞', meaning: '眩しい・煌びやかな (찬란하다)', level: 'TOPIK 5級' },
    { word: '들뜨게', hanja: '―', pos: '動詞', meaning: '浮き立たせる・心をときめかせる (들뜨다)', level: 'TOPIK 4級' },
    { word: '쉴새 없이', hanja: '―', pos: '連語・副詞', meaning: '休む間もなく・ひっきりなしに', level: 'TOPIK 3級' },
    { word: '아련한', hanja: '―', pos: '形容詞', meaning: 'おぼろげな・かすかな (아련하다)', level: 'TOPIK 4級' },
    { word: '휘파람', hanja: '―', pos: '名詞', meaning: '口笛 (휘파람을 불다)', level: 'TOPIK 3級' },
    { word: '박혀', hanja: '―', pos: '動詞', meaning: '刻まれて・刺さって (박히다)', level: 'TOPIK 4級' },
    { word: '지독히도', hanja: '至毒―', pos: '副詞', meaning: 'ひどく・凄まじく', level: 'TOPIK 4級' },
    { word: '그리움', hanja: '―', pos: '名詞', meaning: '恋しさ・憧れ (그리워하다)', level: 'TOPIK 3級' }
  ],
  grammar: [
    { pattern: '~(으)ㄴ 채로', meaning: '〜のまま', desc: 'ある状態を維持したまま。' },
    { pattern: '~다가도', meaning: '〜してはまた〜', desc: '動作や状態の急変・反復。' },
    { pattern: '~마저', meaning: '〜までも・〜さえも', desc: '極端な例を付け加える助詞。' }
  ],
  lyrics_notes: [
    '💬 <strong>原曲とキム・ナヨン版の魅力:</strong> 2007年にBubble Sistersがリリースした名曲。愛と別れを「美しい旋律」「贈り物」として受け止め昇華させる切なくも温かい詩が韓国で長く愛されています。',
    '💬 <strong>「버릇처럼（癖のように）」:</strong> 恋人と別れた後も無意識に昔の習慣や思い出がフラッシュバックする切ない心理描写です。'
  ]
};

async function insertSong() {
  const payload = {
    track_id: 'kimnayoung_love_laugh_2007',
    track_name: '그렇게 사랑하고 그렇게 웃었습니다',
    track_name_en: "That's How We Loved and Laughed",
    artist_name: '김나영 (Kim Na Young) / 버블 시스터즈',
    artist_name_en: 'Kim Na Young / Bubble Sisters',
    country: 'KR',
    release_year: '2007',
    genre: 'Ballad',
    spotify_id: songData.spotify_url,
    description: 'Bubble Sisters原曲、キム・ナヨンが歌い話題となった珠玉の名バラード。',
    lyrics: JSON.stringify(songData)
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/tracks`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });

  console.log('Insert status:', res.status);
  if (!res.ok) {
    console.log('Error:', await res.text());
  } else {
    console.log('Successfully saved Kim Na Young song to Supabase!');
  }
}

insertSong();

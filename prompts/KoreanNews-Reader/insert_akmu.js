const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

const akmuSong = {
  id: 'lyrics-akmu-how-can-i-love',
  title_ko: '어떻게 이별까지 사랑하겠어, 널 사랑하는 거지 - AKMU',
  title_ja: 'どうして別れまで愛せようか、君を愛してるだけなのに (How can I love the heartbreak, you\'re the one I love)',
  artist: 'AKMU (악뮤 / 楽童ミュージシャン)',
  category: 'K-POP 伝説の名バラード',
  cat_class: 'cat-music',
  level: 'TOPIK 4〜5級 (詩的・叙情表現)',
  source: 'AKMU 3rd Full Album『항해 (SAILING)』',
  date: '2019.09.25',
  is_supabase: true,
  spotify_url: 'https://open.spotify.com/search/%EC%96%B4%EB%96%BB%EA%B2%8C%20%EC%9D%B4%EB%B3%84%EA%B9%8C%EC%A7%80%20%EC%82%AC%EB%9E%91%ED%95%98%EA%B2%A0%EC%96%B4',
  location: {
    name: '江原道 江陵市 正東津 (チョンドンジン海岸)',
    lat: 37.6917,
    lng: 129.0328,
    desc: 'AKMUの3集アルバム『SAILING（航海）』の海や旅情を象徴する、韓国屈指の美しい日の出と青い波が広がる海岸です。'
  },
  sentences: [
    {
      ko: '일부러 몇 발자국 물러나 내가 없이 혼자 걷는 널 바라본다',
      rubi: 'イルブレ ミョッ パルチャグッ ムルロナ ネガ オプシ ホンジャ コンヌン ノル パラボンダ',
      ja: 'わざと数歩うしろに下がって 僕のいないまま一人で歩く君を見つめる'
    },
    {
      ko: '옆자리 허전한 너의 풍경 흑백 거리 가운데 넌 뒤돌아본다',
      rubi: 'ヨプチャリ ホジョナン ノエ プンギョン フクペク コリ カウンデ ノン トィドラボンダ',
      ja: '隣の席がぽっかり空いた君の風景 白黒の街の真ん中で君は振り返る'
    },
    {
      ko: '그때 알았어 그때 몰랐던 것들을 네가 없이 나를 바라보는 게 싫었어',
      rubi: 'クッテ アラッソ クッテ モルラットン ゴットゥルル ネガ オプシ ナルル パラボヌン ゲ シロッソ',
      ja: 'あの時気づいたんだ あの時知らなかったことを 君なしで自分を見つめるのが嫌だったんだ'
    },
    {
      ko: '그때 알았어 나를 쳐다보는 눈빛 속에 이미 이별이 차오르고 있었다는 걸',
      rubi: 'クッテ アラッソ ナルル チョダボヌン ヌンピッ ソゲ イミ イビョリ チャオルゴ イッソッタヌン ゴル',
      ja: 'あの時分かったんだ 僕を見つめる瞳の中に すでに別れが満ちあふれていたことを'
    },
    {
      ko: '어떻게 내가 어떻게 너를 이후에 우리 바다처럼 깊은 사랑이 다 마를 때까지 기다리는 게 이별일 텐데',
      rubi: 'オットッケ ネガ オットッケ ノルル イフエ ウリ パダチョロム キプン サランイ タ マルル ッテッカジ キダリヌン ゲ イビョリル テンデ',
      ja: 'どうして僕が どうして君を手放せようか 僕たちの海のように深い愛がすべて干からびるまで待ち続けることこそが別れであるはずなのに'
    },
    {
      ko: '가시 돋친 깊은 침묵에 차오르는 눈물 속에 널 지켜보는 게 아파',
      rubi: 'カシ トッチン キプン チムムゲ チャオルヌン ヌンムル ソゲ ノル チキョボヌン ゲ アパ',
      ja: 'トゲの立った深い沈黙の中で 込み上げてくる涙の中で 君を見つめているのが辛い'
    },
    {
      ko: '끝이라는 걸 알면서도 손을 놓지 못했던 건 내 욕심이었을까',
      rubi: 'クチラヌン ゴル アルミョンソド ソヌル ノッチ モッテットン ゴン ネ ヨクシミオッスルッカ',
      ja: '終わりだと分かっていながら 手を離せなかったのは僕の欲だったのだろうか'
    },
    {
      ko: '어떻게 내가 어떻게 너를 이후에 우리 바다처럼 깊은 사랑이 다 마를 때까지 기다리는 게 이별일 텐데',
      rubi: 'オットッケ ネガ オットッケ ノルル イフエ ウリ パダチョロム キプン サランイ タ マルル ッテッカジ キダリヌン ゲ イビョリル テンデ',
      ja: 'どうして僕が どうして君を手放せようか 僕たちの海のように深い愛がすべて干からびるまで待ち続けることこそが別れであるはずなのに'
    },
    {
      ko: '어떻게 이별까지 사랑하겠어 널 사랑하는 거지',
      rubi: 'オットッケ イビョルッカジ サランハゲッソ ノル サランハヌン ゴジ',
      ja: 'どうして別れまで愛せようか、君を愛しているだけなのに'
    },
    {
      ko: '사랑이라는 이유로 서로를 포기하고 찢어질 것같이 아파할 수 없어 난',
      rubi: 'サランイラヌン イユロ ソロルル ポギハゴ チジョジル コッカチ アパハル ス オプソ ナン',
      ja: '愛という理由でお互いを諦めて 引き裂かれそうに胸を痛めることなんて僕にはできない'
    }
  ],
  vocab: [
    { word: '일부러', hanja: '―', pos: '副詞', meaning: 'わざと・意図的に', level: 'TOPIK 3級' },
    { word: '물러나', hanja: '―', pos: '動詞', meaning: '退いて・身を引いて (물러나다)', level: 'TOPIK 4級' },
    { word: '허전한', hanja: '―', pos: '形容詞', meaning: '物足りない・虚しい・ぽっかり空いた (허전하다)', level: 'TOPIK 4級' },
    { word: '차오르고', hanja: '―', pos: '動詞', meaning: '満ちてきて・こみ上げて (차오르다)', level: 'TOPIK 4級' },
    { word: '마를 때까지', hanja: '―', pos: '動詞+語尾', meaning: '干上がるまで・枯れるまで (마르다)', level: 'TOPIK 3級' },
    { word: '가시 돋친', hanja: '―', pos: '連語・形容', meaning: 'トゲのある・刺々しい (가시가 돋치다)', level: 'TOPIK 5級' },
    { word: '침묵', hanja: '沈默', pos: '名詞', meaning: '沈黙・静寂', level: 'TOPIK 4級' },
    { word: '찢어질 것같이', hanja: '―', pos: '動詞+比喩', meaning: '引き裂かれそうに (찢어지다)', level: 'TOPIK 4級' }
  ],
  grammar: [
    { pattern: '어떻게 ~(으)겠어', meaning: 'どうして〜できようか（反語）', desc: '不可能性を強調する強い反語表現。' },
    { pattern: '~ㄹ/을 텐데', meaning: '〜のはずなのに・〜だろうに', desc: '推量や背景を述べる表現。' },
    { pattern: '~라는 이유로', meaning: '〜という理由で', desc: '口実や名目を表す名詞結合。' }
  ],
  lyrics_notes: [
    '💬 <strong>AKMU（楽童ミュージシャン）の代表曲:</strong> 兄のイ・チャンヒョクが作詞作曲し、妹のイ・スヒョンの圧倒的なボーカルで歌い上げた国民的メガヒット曲。海軍入隊直前に制作された名盤『항해 (SAILING)』のタイトル曲です。',
    '💬 <strong>「어떻게 이별까지 사랑하겠어」の深い意味:</strong> 「別れを受け入れることすら愛の一部だ」という綺麗事に対して、「私は君を愛しているだけであって、別れそのものを愛せるわけがない」と切実に叫ぶ至高のバラードです。'
  ]
};

async function insertAKMU() {
  const payload = {
    track_id: 'akmu_how_can_i_love_2019',
    track_name: '어떻게 이별까지 사랑하겠어, 널 사랑하는 거지',
    track_name_en: 'How can I love the heartbreak, you`re the one I love',
    artist_name: 'AKMU (악뮤)',
    artist_name_en: 'AKMU',
    country: 'KR',
    genre: 'Ballad / Folk',
    preview_url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/5f/49/ec/5f49ec33-0382-1d38-3305-92ac29830124/mzaf_4961716108125658109.plus.aac.p.m4a',
    itunes_url: 'https://music.apple.com/kr/album/%EC%96%B4%EB%96%BB%EA%B2%8C-%EC%9D%B4%EB%B3%84%EA%B9%8C%EC%A7%80-%EC%82%AC%EB%9E%91%ED%95%98%EA%B2%A0%EC%96%B4-%EB%84%90-%EC%82%AC%EB%9E%91%ED%95%98%EB%8A%94-%EA%B1%B0%EC%A7%80/1480802547?i=1480802550&uo=4',
    album_cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/e4/a2/80/e4a28015-490b-255a-ff26-aadd6257cfa1/AKMU_DS.jpg/600x600bb.jpg',
    spotify_id: 'https://open.spotify.com/search/%EC%96%B4%EB%96%BB%EA%B2%8C%20%EC%9D%B4%EB%B3%84%EA%B9%8C%EC%A7%80%20%EC%82%AC%EB%9E%91%ED%95%98%EA%B2%A0%EC%96%B4',
    description: 'どうして別れまで愛せようか、君を愛してるだけなのに (How can I love the heartbreak, you`re the one I love)',
    lyrics: JSON.stringify(akmuSong)
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

  console.log('AKMU Supabase status:', res.status);
}

insertAKMU();

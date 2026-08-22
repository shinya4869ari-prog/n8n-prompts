const SUPABASE_URL = 'https://uvjpiuinsgklddzhzpio.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iW0cu7wjxn_rKjAd1O5Prg_tmecdAkX';

async function testInsertTrack() {
  const whoYouPayload = {
    track_id: 'gd_who_you_2013',
    track_name: '니가 뭔데 (WHO YOU?)',
    track_name_en: 'WHO YOU?',
    artist_name: 'G-DRAGON',
    artist_name_en: 'G-DRAGON',
    country: 'KR',
    release_year: '2013',
    genre: 'K-Pop',
    spotify_id: 'https://open.spotify.com/search/G-DRAGON%20WHO%20YOU',
    description: 'G-DRAGON 2nd Album『COUP D\'ETAT』収録の代表曲。失恋の葛藤と未練、怒りをリアルな口語体で歌った名曲。',
    lyrics: JSON.stringify({
      title_ko: '니가 뭔데 (WHO YOU?) - 全文完全版',
      title_ja: 'WHO YOU? (お前何様のつもり？) 【フル歌詞対訳】',
      artist: 'G-DRAGON (BIGBANG)',
      category: 'K-POP (G-DRAGON)',
      cat_class: 'cat-music',
      level: '日常口語・感情表現 (全14節)',
      source: 'G-DRAGON 2nd Album『COUP D\'ETAT』',
      date: 'ヒット曲',
      spotify_url: 'https://open.spotify.com/search/G-DRAGON%20WHO%20YOU',
      location: {
        name: '京畿道 高陽市 一山 (KINTEX)',
        lat: 37.6698,
        lng: 126.7460,
        desc: 'G-DRAGONがファン1,000人を招待し、ガラス張りの巨大セットの中で撮影した『WHO YOU?』伝説のMV撮影地です。'
      },
      sentences: [
        {
          ko: 'Baby I love you 이렇게 말하지만 내 마음은 왠지 하나도 좋지 않아',
          rubi: 'ベイビー アイ ラブ ユー イロッケ マラジマン ネ マウムン ウェンジ ハナド チョッチ アナ',
          ja: 'Baby I love you そう口にするけれど 僕の心はなぜか全然晴れないんだ'
        },
        {
          ko: 'I want you I need you 노래 부르지만 I don\'t know why I feel bad 니가 뭔데',
          rubi: 'アイ ウォント ユー アイ ニード ユー ノレ プルジマン アイ ドント ノー ワイ アイ フィール バッド ニガ モンデ',
          ja: 'I want you, I need you 歌ってみるけれど 嫌な気分になるのはなぜなんだ お前何様のつもりだよ'
        },
        {
          ko: '축하해 그새 다른 남자를 또 만나 잘됐음 해 아직 좀 이르다만',
          rubi: 'チュッカヘ クセ タルン ナムジャルル ット マンナ チャルテッスム ヘ アジク チョム イルダマン',
          ja: 'おめでとう その間にまた別の男と付き合って うまくいけばいいね まだちょっと早い気もするけど'
        },
        {
          ko: '난 네가 좋아하면 그 뿐이라고 (But) 자꾸 화가 나 baby 대체 니가 뭔데',
          rubi: 'ナン ニガ チョアハミョン ク プニラゴ バット チャック ファガナ ベイビー テチェ ニガ モンデ',
          ja: '君が幸せならそれで十分だって強がってみても やたらと腹が立つんだ 一体お前何様のつもりなんだよ'
        },
        {
          ko: 'Baby I miss you 왜 자꾸 너만 생각나 다른 사람 못 만나 원하지 않아',
          rubi: 'ベイビー アイ ミス ユー ウェ チャック ノマン センガンナ タルン サラム モッ マンナ ウォナジ アナ',
          ja: 'Baby I miss you なんで君のことばかり思い出すんだ 他の人となんて付き合えないし 求めてもいない'
        },
        {
          ko: '널 사랑하는지도 미워하는지도 구분이 안 가 매일 헷갈려 아직도',
          rubi: 'ノル サランハヌンジド ミウォハヌンジド クブニ アンガ メイル ヘッカルリョ アジクト',
          ja: '君を愛しているのか憎んでいるのかさえ区別がつかない 毎日混乱してるんだ 今でもずっと'
        },
        {
          ko: '싸워라 빌어 헤어져라 빌어 내게로 다시 돌아와 달라고 늘 빌어',
          rubi: 'サウォラ ピロ ヘオジョラ ピロ ネゲロ タシ トラワダルラゴ ヌル ピロ',
          ja: '「ケンカしろ」って呪って 「別れろ」って祈って 僕のところへまた戻ってきてくれといつも願ってる'
        },
        {
          ko: '동네마다 거리마다 애써 찾아 다니며 걔네 요즘 안 좋던데 라고 일러',
          rubi: 'トンネマダ コリマダ エッソ チャジャ タニミョ ケネ ヨジュム アン チョットンデ ラゴ イルロ',
          ja: '街中をわざわざ探し回っては 「あいつら最近うまくいってないらしいよ」なんて告げ口して'
        },
        {
          ko: '구차하고 찌질해 나 원래 찌질해 몰랐어 너도 마찬가지야 나쁜 기집애',
          rubi: 'クチャハゴ チジルヘ ナ ウォルレ チジルヘ モルラッソ ノド マチャンガジヤ ナップン キジベ',
          ja: '惨めで情けないよ 僕は元からダサい男さ 知らなかったのか？ 君も同じだよ 悪い女め'
        },
        {
          ko: '내가 더 잘할게 한번 만나 줄래 귀찮게 안 할게 제발 돌아와줄래',
          rubi: 'ネガ ト チャラルケ ハンボン マンナ ジュルレ クィチャンケ アン ハルケ チェバル トラワジュルレ',
          ja: '僕がもっと大事にするから一度会ってくれないか？ 迷惑かけないから頼むから戻ってきておくれ'
        },
        {
          ko: 'Baby I just want you back, I want you back, I want you back',
          rubi: 'ベイビー アイ ジャスト ウォント ユー バック、アイ ウォント ユー バック',
          ja: 'Baby ただ君に戻ってきてほしいんだ 君に戻ってきてほしい'
        },
        {
          ko: 'Baby I know it\'s too late, it\'s just too late, it\'s just too late',
          rubi: 'ベイビー アイ ノー イッツ トゥー レイト、イッツ ジャスト トゥー レイト',
          ja: 'Baby もう手遅れなのは分かってるんだ 本当に遅すぎたんだ'
        },
        {
          ko: '대체 니가 뭔데 날 흔들어 대체 니가 뭔데 날 울려 바보처럼',
          rubi: 'テチェ ニガ モンデ ナル フンドゥロ テチェ ニガ モンデ ナル ウルリョ パボチョロム',
          ja: '一体お前何様のつもりで僕の心を揺さぶるんだ 一体お前何様のつもりで僕を馬鹿みたいに泣かせるんだ'
        },
        {
          ko: '니가 뭔데 나타나 내 마음을 다 뒤집어 놔 니가 뭔데 (WHO YOU?)',
          rubi: 'ニガ モンデ ナタナ ネ マウムル タ トィジボ ノァ ニガ モンデ (フー ユー)',
          ja: 'お前何様のつもりで現れて僕の心をメチャクチャにかき乱すんだ お前何様なんだよ (WHO YOU?)'
        }
      ],
      vocab: [
        { word: '니가 뭔데', hanja: '―', pos: '口語表現', meaning: 'お前何様のつもり？・何なんだよ', level: '日常口語' },
        { word: '찌질해', hanja: '―', pos: '形容詞(スラング)', meaning: 'ダサい・情けない・女々しい (찌질하다)', level: '若者言葉' },
        { word: '기집애', hanja: '―', pos: '名詞(俗語)', meaning: '小娘・あいつ (계집아이)', level: '日常口語' },
        { word: '구차하고', hanja: '苟且―', pos: '形容詞', meaning: '見苦しくて・惨めで', level: '上級' },
        { word: '애써', hanja: '―', pos: '副詞', meaning: 'わざわざ・無理をして・必死に', level: '中級' },
        { word: '헷갈려', hanja: '―', pos: '動詞', meaning: 'こんがらがる・混乱する (헷갈리다)', level: '日常口語' },
        { word: '그새', hanja: '―', pos: '副詞', meaning: 'その間に・いつの間にか (그사이)', level: '中級' },
        { word: '제발', hanja: '―', pos: '副詞', meaning: 'どうか・頼むから', level: '初級' }
      ],
      grammar: [
        { pattern: '~(으)라 빌다', meaning: '〜しろと呪う・祈る', desc: '命令形+(으)라고 빌다 の口語縮約。' },
        { pattern: '~는/ㄴ 지도', meaning: '〜なのかどうかも', desc: '疑問や不確実な事実。' },
        { pattern: '~(으)ㄹ 뿐이다', meaning: '〜なだけだ・〜にすぎない', desc: '限定表現。' }
      ],
      lyrics_notes: [
        '💬 <strong>「찌질해（チジルヘ）」のリアルな意味:</strong> 韓国の若者が使うスラングで、「未練がましくて女々しい」「情けなくてカッコ悪い男」を自虐するときに使います。GDが自分のプライドを捨てて正直に本音をさらけ出す名フレーズです。',
        '💬 <strong>「싸워라 빌어 헤어져라 빌어」:</strong> 元カノが新しい男と付き合っているのを見て、「ケンカしろ！別れろ！」と嫉妬で祈ってしまうリアルな男心が描かれています。'
      ]
    })
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/tracks`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(whoYouPayload)
  });

  console.log('Insert status:', res.status);
  if (!res.ok) {
    console.log('Error text:', await res.text());
  } else {
    console.log('Successfully inserted/upserted G-DRAGON WHO YOU to Supabase tracks table!');
  }
}

testInsertTrack();

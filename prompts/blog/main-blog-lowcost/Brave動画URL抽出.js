// === Brave動画URL抽出 ===
// Brave Search (Videos) の結果から、YouTubeの予告編URLを安全に抽出します。

const nameToCountryCode = {
  'アフガニスタン': 'AF',
  'アルバニア': 'AL',
  'アルジェリア': 'DZ',
  'アンドラ': 'AD',
  'アンゴラ': 'AO',
  'アンティグア・バーブーダ': 'AG',
  'アルゼンチン': 'AR',
  'アルメニア': 'AM',
  'オーストラリア': 'AU',
  'オーストリア': 'AT',
  'アゼルバイジャン': 'AZ',
  'バハマ': 'BS',
  'バーレーン': 'BH',
  'バングラデシュ': 'BD',
  'バルバドス': 'BB',
  'ベラルーシ': 'BY',
  'ベルギー': 'BE',
  'ベリーズ': 'BZ',
  'ベナン': 'BJ',
  'ブータン': 'BT',
  'ボリビア': 'BO',
  'ボスニア・ヘルツェゴビナ': 'BA',
  'ボツワナ': 'BW',
  'ブラジル': 'BR',
  'ブルネイ': 'BN',
  'ブルガリア': 'BG',
  'ブルキナファソ': 'BF',
  'ブルンジ': 'BI',
  'カーボベルデ': 'CV',
  'カンボジア': 'KH',
  'カメルーン': 'CM',
  'カナダ': 'CA',
  '中央アフリカ': 'CF',
  'チャド': 'TD',
  'チリ': 'CL',
  '中国': 'CN',
  'コロンビア': 'CO',
  'コモロ': 'KM',
  'コンゴ共和国': 'CG',
  'コンゴ民主共和国': 'CD',
  'コスタリカ': 'CR',
  'コートジボワール': 'CI',
  'クロアチア': 'HR',
  'キューバ': 'CU',
  'キプロス': 'CY',
  'チェコ': 'CZ',
  'デンマーク': 'DK',
  'ジブチ': 'DJ',
  'ドミニカ国': 'DM',
  'ドミニカ共和国': 'DO',
  'エクアドル': 'EC',
  'エジプト': 'EG',
  'エルサルバドル': 'SV',
  '赤道ギニア': 'GQ',
  'エリトリア': 'ER',
  'エストニア': 'EE',
  'エスワティニ': 'SZ',
  'エチオピア': 'ET',
  'フィジー': 'FJ',
  'フィンランド': 'FI',
  'フランス': 'FR',
  'ガボン': 'GA',
  'ガンビア': 'GM',
  'ジョージア': 'GE',
  'ドイツ': 'DE',
  'ガーナ': 'GH',
  'ギリシャ': 'GR',
  'グレナダ': 'GD',
  'グアテマラ': 'GT',
  'ギニア': 'GN',
  'ギニアビサウ': 'GW',
  'ガイアナ': 'GY',
  'ハイチ': 'HT',
  'ホンジュラス': 'HN',
  'ハンガリー': 'HU',
  'アイスランド': 'IS',
  'インド': 'IN',
  'インドネシア': 'ID',
  'イラン': 'IR',
  'イラク': 'IQ',
  'アイルランド': 'IE',
  'イスラエル': 'IL',
  'イタリア': 'IT',
  'ジャマイカ': 'JM',
  '日本': 'JP',
  'ヨルダン': 'JO',
  'カザフスタン': 'KZ',
  'ケニア': 'KE',
  'キリバス': 'KI',
  'クウェート': 'KW',
  'キルギス': 'KG',
  'ラオス': 'LA',
  'ラトビア': 'LV',
  'レバノン': 'LB',
  'レソト': 'LS',
  'リベリア': 'LR',
  'リビア': 'LY',
  'リヒテンシュタイン': 'LI',
  'リトアニア': 'LT',
  'ルクセンブルク': 'LU',
  'マダガスカル': 'MG',
  'マラウイ': 'MW',
  'マレーシア': 'MY',
  'モルディブ': 'MV',
  'マリ': 'ML',
  'マルタ': 'MT',
  'マーシャル諸島': 'MH',
  'モーリタニア': 'MR',
  'モーリシャス': 'MU',
  'メキシコ': 'MX',
  'ミクロネシア連邦': 'FM',
  'モルドバ': 'MD',
  'モナコ': 'MC',
  'モンゴル': 'MN',
  'モンテネグロ': 'ME',
  'モロッコ': 'MA',
  'モザンビーク': 'MZ',
  'ミャンマー': 'MM',
  'ナミビア': 'NA',
  'ナウル': 'NR',
  'ネパール': 'NP',
  'オランダ': 'NL',
  'ニュージーランド': 'NZ',
  'ニカラグア': 'NI',
  'ニジェール': 'NE',
  'ナイジェリア': 'NG',
  '北朝鮮': 'KP',
  '北マケドニア': 'MK',
  'ノルウェー': 'NO',
  'オマーン': 'OM',
  'パキスタン': 'PK',
  'パラオ': 'PW',
  'パナマ': 'PA',
  'パプアニューギニア': 'PG',
  'パラグアイ': 'PY',
  'ペルー': 'PE',
  'フィリピン': 'PH',
  'ポーランド': 'PL',
  'ポルトガル': 'PT',
  'カタール': 'QA',
  'ルーマニア': 'RO',
  'ロシア': 'RU',
  'ルワンダ': 'RW',
  'セントクリストファー・ネービス': 'KN',
  'セントルシア': 'LC',
  'セントビンセント・グレナディーン': 'VC',
  'サモア': 'WS',
  'サンマリノ': 'SM',
  'サントメ・プリンシペ': 'ST',
  'サウジアラビア': 'SA',
  'セネガル': 'SN',
  'セルビア': 'RS',
  'セーシェル': 'SC',
  'シエラレオネ': 'SL',
  'シンガポール': 'SG',
  'スロバキア': 'SK',
  'スロベニア': 'SI',
  'ソロモン諸島': 'SB',
  'ソマリア': 'SO',
  '南アフリカ': 'ZA',
  '韓国': 'KR',
  '南スーダン': 'SS',
  'スペイン': 'ES',
  'スリランカ': 'LK',
  'スーダン': 'SD',
  'スリナム': 'SR',
  'スウェーデン': 'SE',
  'スイス': 'CH',
  'シリア': 'SY',
  '台湾': 'TW',
  'タジキスタン': 'TJ',
  'タンザニア': 'TZ',
  'タイ': 'TH',
  '東ティモール': 'TL',
  'トーゴ': 'TG',
  'トンガ': 'TO',
  'トリニダード・トバゴ': 'TT',
  'チュニジア': 'TN',
  'トルコ': 'TR',
  'トルクメニスタン': 'TM',
  'ツバル': 'TV',
  'ウガンダ': 'UG',
  'ウクライナ': 'UA',
  'アラブ首長国連邦': 'AE',
  'イギリス': 'GB',
  'アメリカ合衆国': 'US',
  'ウルグアイ': 'UY',
  'ウズベキスタン': 'UZ',
  'バヌアツ': 'VU',
  'バチカン市国': 'VA',
  'ベネズエラ': 'VE',
  'ベトナム': 'VN',
  'イエメン': 'YE',
  'ザンビア': 'ZM',
  'ジンバブエ': 'ZW'
};

// 入力データ（Brave Searchの結果）をすべて取得
const braveItems = $input.all();

let movieItems = [];
try {
  movieItems = $('リサーチデータ整形').all();
} catch (e) {
  movieItems = [];
}

// すべてのアイテムを順番に処理してマージする
return braveItems.map((item, index) => {
  const braveData = item.json || {};
  const braveVideos = Array.isArray(braveData.results) ? braveData.results :
                      (Array.isArray(braveData.videos?.results) ? braveData.videos.results : []);

  const youtubeVideo = braveVideos.find(v => {
    const url = v.url || v.profile?.url || '';
    const title = (v.title || v.description || '').toLowerCase();
    
    // YouTubeの動画リンクであること
    const isYouTube = url.includes('youtube.com/watch') || url.includes('youtu.be/');
    if (!isYouTube) return false;
    
    // エラー画面等のノイズを除外
    const isNoise = title.includes('not currently available') || title.includes('利用できません') || title.includes('device');
    if (isNoise) return false;
    
    // 予告編に関連するキーワードの判定
    const hasKeyword = title.includes('予告') || 
                      title.includes('特報') || 
                      title.includes('trailer') || 
                      title.includes('teaser') || 
                      title.includes('preview') || 
                      title.includes('promo');
    return hasKeyword;
  });

  const trailer_url = youtubeVideo?.url || youtubeVideo?.profile?.url || null;

  // 対応するインデックスの映画データを取得
  const movieData = movieItems[index]?.json || {};

  // 相対パスのポスター画像があれば絶対URLに変換
  let poster_url = movieData.poster_url || null;
  if (poster_url && typeof poster_url === 'string' && poster_url.startsWith('/')) {
    poster_url = `https://image.tmdb.org/t/p/w500${poster_url}`;
  }

  // カタカナ国名を2文字コードに変換
  let country = movieData.country || "";
  if (nameToCountryCode[country]) {
    country = nameToCountryCode[country];
  } else if (country.length !== 2) {
    country = ""; // 2文字コード以外で解決できない場合は空にする
  } else {
    country = country.toUpperCase();
  }

  return {
    json: {
      ...movieData,
      poster_url,
      country: country || null,
      trailer_url: trailer_url
    }
  };
});

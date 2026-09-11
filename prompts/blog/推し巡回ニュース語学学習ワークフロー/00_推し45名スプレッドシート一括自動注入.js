/**
 * 【n8n用】本番の推し45名をGoogleスプレッドシートに一括自動注入するデータ
 * 
 * 使い方:
 *  1. n8nに「Code」ノードを置き、このコードを貼り付ける。
 *  2. その後ろに「Google Sheets（Append Row）」ノードを繋げて実行ボタンを押すだけ！
 *  3. 手動のコピペやインポートは一切不要で、スプレッドシートに45人全員が綺麗に書き込まれます！
 */

const persons = [
  { id: 1, name_ja: "キム・ギドク", name_ko: "김기덕", last_searched_at: "", is_active: true },
  { id: 2, name_ja: "ロゼ", name_ko: "로제", last_searched_at: "", is_active: true },
  { id: 5, name_ja: "BLACKPINK", name_ko: "BLACKPINK", last_searched_at: "", is_active: true },
  { id: 130, name_ja: "キム・ナヨン", name_ko: "김나영", last_searched_at: "", is_active: true },
  { id: 174, name_ja: "リュ・スンリョン", name_ko: "류승룡", last_searched_at: "", is_active: true },
  { id: 287, name_ja: "チュ・ジフン", name_ko: "주지훈", last_searched_at: "", is_active: true },
  { id: 288, name_ja: "ユン・ギョンホ", name_ko: "윤경호", last_searched_at: "", is_active: true },
  { id: 306, name_ja: "ク・ギョファン", name_ko: "구교환", last_searched_at: "", is_active: true },
  { id: 309, name_ja: "チョン・ジヒョン", name_ko: "전지현", last_searched_at: "", is_active: true },
  { id: 310, name_ja: "シン・ヒョンビン", name_ko: "신현빈", last_searched_at: "", is_active: true },
  { id: 554, name_ja: "ファン・ジョンミン", name_ko: "황정민", last_searched_at: "", is_active: true },
  { id: 597, name_ja: "パク・ジョンミン", name_ko: "박정민", last_searched_at: "", is_active: true },
  { id: 609, name_ja: "カン・ドンウォン", name_ko: "강동원", last_searched_at: "", is_active: true },
  { id: 625, name_ja: "オ・ジョンセ", name_ko: "오정세", last_searched_at: "", is_active: true },
  { id: 980, name_ja: "チン・ソンギュ", name_ko: "진선규", last_searched_at: "", is_active: true },
  { id: 1000, name_ja: "ヨム・ヘラン", name_ko: "염혜란", last_searched_at: "", is_active: true },
  { id: 1047, name_ja: "キム・ダミ", name_ko: "김다미", last_searched_at: "", is_active: true },
  { id: 2271, name_ja: "チョ・ボクレ", name_ko: "조복래", last_searched_at: "", is_active: true },
  { id: 2422, name_ja: "イ・ソム", name_ko: "이솜", last_searched_at: "", is_active: true },
  { id: 2426, name_ja: "イ・ジョンウン", name_ko: "이정은", last_searched_at: "", is_active: true },
  { id: 2451, name_ja: "ハ・ジョンウ", name_ko: "하정우", last_searched_at: "", is_active: true },
  { id: 2595, name_ja: "チェ・デフン", name_ko: "최대훈", last_searched_at: "", is_active: true },
  { id: 2596, name_ja: "ソ・スミン", name_ko: "서수민", last_searched_at: "", is_active: true },
  { id: 2601, name_ja: "ソ・ジソブ", name_ko: "소지섭", last_searched_at: "", is_active: true },
  { id: 2603, name_ja: "ソン・ナウン", name_ko: "손나은", last_searched_at: "", is_active: true },
  { id: 2764, name_ja: "キム・ソンオ", name_ko: "김성오", last_searched_at: "", is_active: true },
  { id: 2773, name_ja: "チョン・ウヒ", name_ko: "천우희", last_searched_at: "", is_active: true },
  { id: 2793, name_ja: "イ・ソンギュン", name_ko: "이선균", last_searched_at: "", is_active: true },
  { id: 2844, name_ja: "チョン・ジョンソ", name_ko: "전종서", last_searched_at: "", is_active: true },
  { id: 3224, name_ja: "クァク・ドウォン", name_ko: "곽도원", last_searched_at: "", is_active: true },
  { id: 3246, name_ja: "キム・ナムギル", name_ko: "김남길", last_searched_at: "", is_active: true },
  { id: 3287, name_ja: "イ・ジェフン", name_ko: "이제훈", last_searched_at: "", is_active: true },
  { id: 3288, name_ja: "ピョ・イェジン", name_ko: "표예진", last_searched_at: "", is_active: true },
  { id: 3316, name_ja: "高市早苗", name_ko: "Sanae Takaichi", last_searched_at: "", is_active: true },
  { id: 3351, name_ja: "コン・ヒョジン", name_ko: "공효진", last_searched_at: "", is_active: true },
  { id: 3352, name_ja: "カン・ハヌル", name_ko: "강하늘", last_searched_at: "", is_active: true },
  { id: 3362, name_ja: "キム・ソニョン", name_ko: "김선영", last_searched_at: "", is_active: true },
  { id: 3376, name_ja: "イ・ジュヨン", name_ko: "이주영", last_searched_at: "", is_active: true },
  { id: 3377, name_ja: "チャン・ヨンナム", name_ko: "장영남", last_searched_at: "", is_active: true },
  { id: 3386, name_ja: "ハン・ジミン", name_ko: "한지민", last_searched_at: "", is_active: true },
  { id: 3390, name_ja: "イ・ヒジュン", name_ko: "이희준", last_searched_at: "", is_active: true },
  { id: 3409, name_ja: "チョン・ユミ", name_ko: "정유미", last_searched_at: "", is_active: true },
  { id: 3568, name_ja: "ウギ", name_ko: "Song Yuqi", last_searched_at: "", is_active: true },
  { id: 3569, name_ja: "キム・セロン", name_ko: "김새론", last_searched_at: "", is_active: true },
  { id: 3592, name_ja: "ウォンビン", name_ko: "원빈", last_searched_at: "", is_active: true }
];

return persons.map(p => ({ json: p }));

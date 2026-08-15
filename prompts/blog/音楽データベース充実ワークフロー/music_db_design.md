# 🎵 音楽・OSTデータベース設計 & 連動仕様書 (Music Table Design)

## 📌 コンセプト
「歌手・楽曲・ドラマ・作詞作曲家がシームレスに繋がり、歌詞や公式MVまで楽しめる自分専用の最高峰エンタメアーカイブ」

---

## 🗄️ 1. Supabase `Music` テーブル定義 (推奨スキーマ)

```sql
CREATE TABLE IF NOT EXISTS public."Music" (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,                     -- 邦題・メイン曲名 (例: Once Again / もう一度あなたを)
    title_ko TEXT,                           -- 韓国語曲名 (例: 다시 너를)
    title_en TEXT,                           -- 英語曲名 (例: Once Again)
    artist TEXT NOT NULL,                    -- 歌唱アーティスト名 (例: キム・ナヨン, Mad Clown)
    artist_id BIGINT REFERENCES public."Persons"(id) ON DELETE SET NULL, -- Personsテーブル連携
    ost_for TEXT,                            -- タイアップ作品名 (例: 太陽の末裔)
    movie_id BIGINT REFERENCES public."Movies"(id) ON DELETE SET NULL,   -- Moviesテーブル連携
    composer TEXT,                           -- 作曲家 (例: カン・ドンユン)
    lyricist TEXT,                           -- 作詞家 (例: ジフン, カン・ドンユン)
    lyrics TEXT,                             -- 歌詞 (ハングル + 日本語対訳)
    jacket_url TEXT,                         -- アルバム・OSTジャケット画像
    youtube_id TEXT,                         -- 公式MV YouTube ID (例: 9Y8_uE_T1Z8)
    release_date DATE,                       -- リリース日 (例: 2016-03-17)
    genre TEXT DEFAULT 'OST',                -- ジャンル (OST, Ballad, K-POP, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 高速検索用インデックス
CREATE INDEX IF NOT EXISTS idx_music_artist ON public."Music"(artist);
CREATE INDEX IF NOT EXISTS idx_music_ost_for ON public."Music"(ost_for);
CREATE INDEX IF NOT EXISTS idx_music_title ON public."Music"(title);
```

---

## 🌐 2. PlaceInfo アプリ内での連動フロー

```text
【人名モード（歌手・キム・ナヨン）】
       ⬇ 参加楽曲をクリック
【音楽モード（Once Again）】
 ├ ▶ 公式 YouTube MV / Apple Music 30秒試聴
 ├ 📜 歌詞（ハングル ＋ 日本語対訳）
 ├ 🎬 タイアップ作品（『太陽の末裔』へワンタップ移動）
 ├ 🎼 作曲家・作詞家（タップでその人物のアーカイブへ移動）
 └ 🎤 歌唱アーティスト（キム・ナヨン / Mad Clown）
```

---

## 🔒 4. 著作権保護 & 自分専用プライベート学習モード (Admin / Study Mode)

### 📌 背景・目的
歌詞データには著作権があるため、将来アプリを一般公開した際にも法的に安全でありつつ、**「自分（管理者）だけは韓国語学習・研究のために歌詞と日本語対訳をいつでも閲覧・活用できる」** 仕組みを実装します。

### 🛠️ 具体的な実現方法
1. **シークレット管理フラグ（Local Storage / パスキー）**:
   - ブラウザの LocalStorage に `study_admin_mode: true` がある場合、または秘密のキー（例: 右上のロゴ長押し、または設定画面）を入力した時だけ **「📜 歌詞・日本語対訳」** エリアがアンロックされて表示される。
2. **一般公開時の安全設計**:
   - 一般ユーザーがアクセスした際は「歌詞エリア」そのものが非表示（または公認の外部リンクへの案内のみ）となり、著作権トラブルを 100% 回避。
3. **語学学習向け機能（自分用）**:
   - ハングル ＋ 日本語対訳の 2 行並び表示
   - コピー＆単語帳への保存など、学習に最適なUI設計。

---

## 🚀 5. 明日の実装計画

1. **Supabase SQL の実行**: `Music` テーブルの作成
2. **PlaceInfo 画面の拡張**:
   - 音楽モード内に「歌詞表示エリア（Lyrics）」を追加
   - 「作詞家・作曲家」のリンクカード表示
3. **n8n 音楽データ登録・充実ワークフローの作成**:
   - 曲名＋歌手名を入れるだけで、**公式MV・歌詞・ジャケット・OST情報** を全自動（または手動入力）で Supabase へ保存するフローの構築

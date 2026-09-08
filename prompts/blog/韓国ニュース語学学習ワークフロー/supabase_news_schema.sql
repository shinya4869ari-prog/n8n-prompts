-- ==============================================================================
-- 【韓国ニュース語学学習用】Supabase テーブル設計 (paragraphs & user_notes 対応版)
-- ==============================================================================

-- 1. Persons テーブルにお気に入りフラグを追加（未作成の場合のみ）
ALTER TABLE "Persons" ADD COLUMN IF NOT EXISTS "is_favorite" BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS "idx_persons_is_favorite" ON "Persons" ("is_favorite");

-- 2. news テーブルの作成
CREATE TABLE IF NOT EXISTS "news" (
    "id" BIGSERIAL PRIMARY KEY,
    "category" TEXT NOT NULL,          -- 'crime', 'life', 'politics', 'economy', 'diplomacy', 'celeb'
    "rank" INT DEFAULT 1,              -- 1〜10 (カテゴリ内の重要度順位)
    "title_ko" TEXT NOT NULL,          -- 韓国語タイトル
    "title_ja" TEXT NOT NULL,          -- 日本語タイトル
    "summary_ko" TEXT,                 -- 韓国語全体要約
    "summary_ja" TEXT,                 -- 日本語全体要約
    "paragraphs" JSONB DEFAULT '[]'::jsonb, -- 📰 各段落配列 [{ para_num: 1, title: '...', ko: '...', ja: '...' }]
    "key_vocabulary" JSONB DEFAULT '[]'::jsonb, -- 語学学習用単語リスト [{ word: '', meaning: '', level: '' }]
    "source_name" TEXT,                -- '연합뉴스', 'KBS', 'JTBC' 等
    "source_url" TEXT,                 -- 元記事URL
    "person_id" BIGINT REFERENCES "Persons"("id") ON DELETE SET NULL, -- 推し人物ID (celebカテゴリ用)
    "person_name" TEXT,                -- 推し人物名 (例: '김남길')
    "person_profile_url" TEXT,         -- 推しの顔写真画像URL
    "published_at" TIMESTAMPTZ DEFAULT NOW(),
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 既存テーブルへのカラム追加・ユニーク制約の保証
ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "paragraphs" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE "news" DROP CONSTRAINT IF EXISTS "news_source_url_key";
ALTER TABLE "news" ADD CONSTRAINT "news_source_url_key" UNIQUE ("source_url");

CREATE INDEX IF NOT EXISTS "idx_news_category" ON "news" ("category");
CREATE INDEX IF NOT EXISTS "idx_news_published_at" ON "news" ("published_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_news_rank" ON "news" ("rank");

ALTER TABLE "news" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access on news" ON "news";
CREATE POLICY "Allow public read-only access on news" ON "news" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon insert/upsert on news" ON "news";
CREATE POLICY "Allow anon insert/upsert on news" ON "news" FOR ALL USING (true) WITH CHECK (true);

-- PostgREST のスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';

-- 3. 💡 user_notes テーブルの作成（ユーザーのアイデア・学習メモ・AI共有メモ）
CREATE TABLE IF NOT EXISTS "user_notes" (
    "id" BIGSERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT DEFAULT 'idea',    -- 'idea' (思いつき), 'study' (学習メモ), 'question' (AIへの相談)
    "is_read_by_ai" BOOLEAN DEFAULT false, -- AIが確認したかの既読フラグ
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_user_notes_updated_at" ON "user_notes" ("updated_at" DESC);

ALTER TABLE "user_notes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-write on user_notes" ON "user_notes";
CREATE POLICY "Allow public read-write on user_notes" ON "user_notes" FOR ALL USING (true) WITH CHECK (true);
NOTIFY pgrst, 'reload schema';

-- 4. 📚 dictionary テーブルの作成（クラウド共通韓国語辞書：漢字語・品詞・意味）
CREATE TABLE IF NOT EXISTS "dictionary" (
    "id" BIGSERIAL PRIMARY KEY,
    "word" TEXT NOT NULL,              -- ハングル表記 (例: '사례', '적발')
    "hanja" TEXT,                      -- 漢字語表記 (例: '事例', '摘發')
    "meaning" TEXT NOT NULL,           -- 日本語意味 (例: '事例・ケース・実例')
    "pos" TEXT DEFAULT '名詞',         -- 品詞 ('名詞', '動詞', '形容詞' など)
    "level" TEXT DEFAULT '中級',       -- 難易度 ('初級', '中級', '高級')
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_dictionary_word" ON "dictionary" ("word");
ALTER TABLE "dictionary" DROP CONSTRAINT IF EXISTS "dictionary_word_key";
ALTER TABLE "dictionary" ADD CONSTRAINT "dictionary_word_key" UNIQUE ("word");

ALTER TABLE "dictionary" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only on dictionary" ON "dictionary";
CREATE POLICY "Allow public read-only on dictionary" ON "dictionary" FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert/upsert on dictionary" ON "dictionary";
CREATE POLICY "Allow public insert/upsert on dictionary" ON "dictionary" FOR ALL USING (true) WITH CHECK (true);

-- 初期シードデータ（ニュース頻出語の登録例）
INSERT INTO "dictionary" ("word", "hanja", "meaning", "pos", "level")
VALUES
  ('사례', '事例', '事例・ケース・実例', '名詞', '中級'),
  ('적발', '摘發', '摘発・発覚', '名詞', '中級'),
  ('종결', '終結', '終結・完了・締めくくり', '名詞', '中級'),
  ('수사관', '搜査官', '捜査官', '名詞', '中級'),
  ('부당하다', '不當--', '不当だ・道理に合わない', '形容詞', '中級'),
  ('전수조사', '全數調査', '全数調査・総点検', '名詞', '高級'),
  ('허위', '虛僞', '虚偽・偽り・ウソ', '名詞', '中級'),
  ('과중', '過重', '過重・重すぎること', '名詞', '中級'),
  ('파장', '波長', '波紋・影響・波及', '名詞', '中級')
ON CONFLICT ("word") DO UPDATE SET
  "hanja" = EXCLUDED."hanja",
  "meaning" = EXCLUDED."meaning",
  "pos" = EXCLUDED."pos",
  "level" = EXCLUDED."level";

NOTIFY pgrst, 'reload schema';


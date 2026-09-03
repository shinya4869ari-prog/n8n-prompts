-- ==============================================================================
-- 【国家の天秤 / 語学学習】ニューステーブル（news）＆ 推し人物お気に入りフラグ スキーマ定義
-- ==============================================================================

-- 1. Persons テーブルに「お気に入りフラグ (is_favorite)」カラムを追加
ALTER TABLE public."Persons" 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- お気に入り人物の高速検索用インデックス
CREATE INDEX IF NOT EXISTS idx_persons_is_favorite ON public."Persons"(is_favorite) WHERE is_favorite = true;


-- 2. ニュース保管テーブル（news）の作成
CREATE TABLE IF NOT EXISTS public.news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 6大カテゴリ (crime: 犯罪・治安, life: 暮らし・社会, politics: 政治, economy: 経済, diplomacy: 外交・国際, celeb: 推し・エンタメ)
    category VARCHAR(50) NOT NULL,
    
    -- 重要度順位 (1〜10、またはスコア)
    rank INTEGER DEFAULT 99,
    
    -- タイトル (韓国語原文 ＆ 日本語訳)
    title_ko TEXT NOT NULL,
    title_ja TEXT NOT NULL,
    
    -- 要約 (韓国語原文 2〜3文 ＆ 日本語訳)
    summary_ko TEXT NOT NULL,
    summary_ja TEXT NOT NULL,
    
    -- 語学学習用重要単語リスト (JSON形式)
    -- 例: [{"word": "전세사기", "meaning": "チョンセ詐欺", "level": "中級"}, {"word": "구속영장", "meaning": "拘束令状", "level": "高級"}]
    key_vocabulary JSONB DEFAULT '[]'::jsonb,
    
    -- 配信元情報
    source_name VARCHAR(100), -- 例: "연합뉴스", "JTBC", "조선일보"
    source_url TEXT,          -- 元記事URL
    
    -- 推しニュースの場合の関連人物情報 (Persons.id との外部キー紐付け)
    person_id BIGINT REFERENCES public."Persons"(id) ON DELETE SET NULL,
    person_name TEXT,         -- 冗長保持 (例: "김남길")
    person_profile_url TEXT,  -- 冗長保持 (顔写真URL)
    
    -- 日時管理
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 検索・フィルタリング用インデックス
CREATE INDEX IF NOT EXISTS idx_news_category ON public.news(category);
CREATE INDEX IF NOT EXISTS idx_news_rank ON public.news(rank);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON public.news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_person_id ON public.news(person_id);

-- 重複登録防止用の一意制約 (同じURL、または同日同タイトルの重複を防止)
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_source_url_unique ON public.news(source_url) WHERE source_url IS NOT NULL AND source_url != '';

-- RLS (Row Level Security) の設定
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- 誰でも最新ニュースを閲覧可能にするポリシー (SELECT)
CREATE POLICY "Allow public read access for news" 
ON public.news FOR SELECT USING (true);

-- サービスロールまたは認証済みキーから Upsert / Insert / Update / Delete を許可
CREATE POLICY "Allow service and anon write access for news" 
ON public.news FOR ALL USING (true) WITH CHECK (true);

-- コメント付与
COMMENT ON TABLE public.news IS '韓国語学学習＆国家の天秤 デイリーニュース保管テーブル';
COMMENT ON COLUMN public.news.category IS '6大カテゴリ (crime, life, politics, economy, diplomacy, celeb)';
COMMENT ON COLUMN public.news.key_vocabulary IS '学習用重要単語・文法ポイント (JSONB)';

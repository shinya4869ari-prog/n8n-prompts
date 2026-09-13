-- ==============================================================================
-- メインブログ用 リサーチキャッシュ＆下書き作業台テーブル
-- 目的: リサーチ1・リサーチ2・リサーチ25(映画)を個別即時保存し、
--       エラー時の1からのやり直し（APIコスト浪費）をゼロにする
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.country_research_cache (
  country TEXT PRIMARY KEY,                       -- 国名（例: インドネシア, 韓国, ドイツ）
  country_code TEXT,                              -- 国コード（例: ID, KR, DE）
  research1 JSONB DEFAULT NULL,                   -- リサーチ1（制度・地理・犯罪統計データ）
  research2 JSONB DEFAULT NULL,                   -- リサーチ2（歴史近代100年・最新動向）
  research25 JSONB DEFAULT NULL,                  -- リサーチ25（厳選映画10件＋歴史クロス解説）
  article_html TEXT DEFAULT NULL,                 -- 完成したブログ記事HTML
  status TEXT DEFAULT 'in_progress',              -- in_progress / completed / published
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS（Row Level Security）ポリシー設定（anon/service_role での読み書きを許可）
ALTER TABLE public.country_research_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access" ON public.country_research_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow all insert access" ON public.country_research_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update access" ON public.country_research_cache
  FOR UPDATE USING (true);

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION public.update_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_country_research_cache_updated_at ON public.country_research_cache;
CREATE TRIGGER tr_country_research_cache_updated_at
BEFORE UPDATE ON public.country_research_cache
FOR EACH ROW EXECUTE FUNCTION public.update_cache_updated_at();

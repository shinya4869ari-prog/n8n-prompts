-- 1. ドロップダウンの選択肢（ENUM型）を作成
DO $$ BEGIN
    CREATE TYPE movie_platform AS ENUM (
        'Netflix',
        'Disney+',
        'Amazon Prime',
        'Apple TV+',
        'TVING',
        'Watcha',
        '劇場公開',
        'その他'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Movies テーブルにドロップダウン選択用の platform カラムを追加
ALTER TABLE "Movies" 
ADD COLUMN IF NOT EXISTS "platform" movie_platform DEFAULT '劇場公開';

-- 3. 既存の Netflix 作品を自動更新
UPDATE "Movies" 
SET "platform" = 'Netflix' 
WHERE "tmdb_id" = 1579433 
   OR "title" LIKE '%クロス・ミッション%' 
   OR "tmdb_id" = 982843 
   OR "title" LIKE '%大洪水%' 
   OR "title" = 'The Great Flood';

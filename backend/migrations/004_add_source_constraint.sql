-- Migration: Add composite unique constraint for multi-source support
-- This allows the same external_id to exist for different sources

-- Step 1: Update existing records to have explicit source
UPDATE articles SET source = 'AIBase' WHERE source IS NULL OR source = '';

-- Step 2: Make source NOT NULL with default
ALTER TABLE articles
  ALTER COLUMN source SET NOT NULL,
  ALTER COLUMN source SET DEFAULT 'AIBase';

-- Step 3: Drop old unique constraint on external_id alone
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_external_id_key;

-- Step 4: Add composite unique constraint (source + external_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_source_external_id ON articles(source, external_id);

-- Step 5: Add index for source filtering
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);

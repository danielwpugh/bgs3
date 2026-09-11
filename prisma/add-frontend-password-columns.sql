-- SQL script to manually add frontend password columns to Settings table
-- Run this directly on your PostgreSQL database if db:push isn't working

-- Add frontendPasswordEnabled column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Settings' 
        AND column_name = 'frontendPasswordEnabled'
    ) THEN
        ALTER TABLE "Settings" ADD COLUMN "frontendPasswordEnabled" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add frontendPassword column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Settings' 
        AND column_name = 'frontendPassword'
    ) THEN
        ALTER TABLE "Settings" ADD COLUMN "frontendPassword" TEXT;
    END IF;
END $$;

-- Add dailyVoteLimitEnabled column (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Settings' 
        AND column_name = 'dailyVoteLimitEnabled'
    ) THEN
        ALTER TABLE "Settings" ADD COLUMN "dailyVoteLimitEnabled" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Settings'
ORDER BY ordinal_position;


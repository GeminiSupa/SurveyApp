-- Add persistence columns to participant_sessions
ALTER TABLE participant_sessions ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 0;
ALTER TABLE participant_sessions ADD COLUMN IF NOT EXISTS answers_snapshot JSONB DEFAULT '{}';

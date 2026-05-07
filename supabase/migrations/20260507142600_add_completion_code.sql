-- Add completion_code and attention_check_passed to participant_sessions
ALTER TABLE participant_sessions ADD COLUMN IF NOT EXISTS completion_code TEXT;
ALTER TABLE participant_sessions ADD COLUMN IF NOT EXISTS attention_check_passed BOOLEAN DEFAULT FALSE;

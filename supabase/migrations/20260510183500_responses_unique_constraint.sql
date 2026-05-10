-- Add unique constraint to responses to allow for idempotent incremental saving (upserts)
-- We first clean up any existing duplicates (taking the latest one)
DELETE FROM responses
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY participant_session_id, question_key ORDER BY created_at DESC) as rn
        FROM responses
    ) t
    WHERE t.rn > 1
);

ALTER TABLE responses DROP CONSTRAINT IF EXISTS unique_session_question;
ALTER TABLE responses ADD CONSTRAINT unique_session_question UNIQUE (participant_session_id, question_key);

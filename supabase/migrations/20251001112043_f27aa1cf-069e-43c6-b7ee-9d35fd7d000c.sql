-- Add unique constraint to xo_matches table on game_session_id
ALTER TABLE xo_matches
ADD CONSTRAINT xo_matches_game_session_id_unique UNIQUE (game_session_id);

-- Recreate create_new_xo_match function with proper logic
CREATE OR REPLACE FUNCTION create_new_xo_match(session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- إنشاء سجل جديد في xo_matches مع لوحة فارغة بتنسيق JSON
    INSERT INTO xo_matches (game_session_id, board_state, match_status)
    VALUES (session_id, '["", "", "", "", "", "", "", "", ""]'::jsonb, 'playing')
    ON CONFLICT (game_session_id) 
    DO UPDATE SET 
        board_state = '["", "", "", "", "", "", "", "", ""]'::jsonb,
        match_status = 'playing',
        updated_at = now();
END;
$$;
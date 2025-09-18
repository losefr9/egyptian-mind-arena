-- إنشاء دالة إنشاء لوحة جديدة عند بدء المباراة
CREATE OR REPLACE FUNCTION create_new_xo_match(session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إنشاء سجل جديد في xo_matches مع لوحة فارغة
    INSERT INTO xo_matches (game_session_id, board_state, match_status)
    VALUES (session_id, ARRAY['', '', '', '', '', '', '', '', ''], 'playing')
    ON CONFLICT (game_session_id) 
    DO UPDATE SET 
        board_state = ARRAY['', '', '', '', '', '', '', '', ''],
        match_status = 'playing',
        updated_at = now();
END;
$$;

-- تحسين دالة تحديث اللوحة
CREATE OR REPLACE FUNCTION update_xo_board(
    p_game_session_id UUID,
    p_new_board TEXT[],
    p_player_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_data json;
    match_record record;
BEGIN
    -- التحقق من وجود المباراة
    SELECT * INTO match_record 
    FROM xo_matches 
    WHERE game_session_id = p_game_session_id;
    
    IF NOT FOUND THEN
        -- إنشاء مباراة جديدة إذا لم تكن موجودة
        PERFORM create_new_xo_match(p_game_session_id);
        SELECT * INTO match_record 
        FROM xo_matches 
        WHERE game_session_id = p_game_session_id;
    END IF;

    -- تحديث اللوحة
    UPDATE xo_matches 
    SET 
        board_state = p_new_board,
        updated_at = now()
    WHERE game_session_id = p_game_session_id;

    -- إرجاع البيانات المحدثة
    SELECT json_build_object(
        'success', true,
        'board_state', p_new_board,
        'updated_at', now()
    ) INTO result_data;

    RETURN result_data;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;
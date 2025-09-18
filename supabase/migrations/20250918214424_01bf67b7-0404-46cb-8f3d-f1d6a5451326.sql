-- حذف الدالة الموجودة لإعادة إنشائها
DROP FUNCTION IF EXISTS update_xo_board(uuid, text[], uuid);

-- إنشاء دالة تحديث محسنة للتحديث الفوري
CREATE OR REPLACE FUNCTION update_xo_board(
    p_game_session_id UUID,
    p_new_board text[],
    p_player_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_data json;
    match_record record;
    current_board_array text[];
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

    -- تحديث اللوحة بتحويل المصفوفة إلى jsonb
    UPDATE xo_matches 
    SET 
        board_state = to_jsonb(p_new_board),
        updated_at = now()
    WHERE game_session_id = p_game_session_id;

    -- إرجاع البيانات المحدثة
    SELECT json_build_object(
        'success', true,
        'board_state', to_jsonb(p_new_board),
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
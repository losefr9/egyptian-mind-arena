-- تحديث الدالة لتتعامل مع JSON string
CREATE OR REPLACE FUNCTION public.update_xo_board(p_game_session_id uuid, p_new_board text, p_player_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    result_data json;
    match_record record;
    session_record record;
    board_jsonb jsonb;
BEGIN
    -- التحقق من أن اللاعب ينتمي للجلسة
    SELECT * INTO session_record 
    FROM game_sessions 
    WHERE id = p_game_session_id 
    AND (player1_id = p_player_id OR player2_id = p_player_id);
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'اللاعب غير مخول للوصول لهذه المباراة'
        );
    END IF;

    -- تحويل النص إلى jsonb
    BEGIN
        board_jsonb := p_new_board::jsonb;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'invalid_board_format',
            'message', 'تنسيق اللوحة غير صحيح'
        );
    END;

    -- التحقق من وجود المباراة
    SELECT * INTO match_record 
    FROM xo_matches 
    WHERE game_session_id = p_game_session_id;
    
    IF NOT FOUND THEN
        -- إنشاء مباراة جديدة إذا لم تكن موجودة
        PERFORM create_new_xo_match(p_game_session_id);
    END IF;

    -- تحديث اللوحة مع الاحتفاظ بالعلامات الموجودة
    UPDATE xo_matches 
    SET 
        board_state = board_jsonb,
        updated_at = now()
    WHERE game_session_id = p_game_session_id;

    -- التحقق من النجاح
    IF FOUND THEN
        RETURN json_build_object(
            'success', true,
            'board_state', board_jsonb,
            'game_session_id', p_game_session_id,
            'updated_at', now(),
            'message', 'تم تحديث اللوحة بنجاح'
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'update_failed',
            'message', 'فشل في تحديث اللوحة'
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'database_error',
            'message', 'خطأ في قاعدة البيانات: ' || SQLERRM
        );
END;
$function$;
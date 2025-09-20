-- حذف الدالة القديمة التي تسبب التضارب
DROP FUNCTION IF EXISTS public.update_xo_board(p_game_session_id uuid, p_new_board text[], p_player_id uuid);

-- تحديث الدالة الموجودة لتعمل بشكل صحيح
CREATE OR REPLACE FUNCTION public.update_xo_board(p_game_session_id uuid, p_new_board jsonb, p_player_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    result_data json;
    match_record record;
    session_record record;
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
        'game_session_id', p_game_session_id,
        'updated_at', now(),
        'message', 'تم تحديث اللوحة بنجاح'
    ) INTO result_data;

    RETURN result_data;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'database_error',
            'message', 'خطأ في قاعدة البيانات: ' || SQLERRM
        );
END;
$function$;
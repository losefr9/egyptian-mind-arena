-- إصلاح دالة إنشاء مباراة XO جديدة
CREATE OR REPLACE FUNCTION create_new_xo_match(session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- إدخال مباراة جديدة بلوحة فارغة
    INSERT INTO xo_matches (game_session_id, board_state)
    VALUES (session_id, '["","","","","","","","",""]'::jsonb)
    ON CONFLICT (game_session_id) DO NOTHING;
END;
$$;

-- تحسين دالة تحديث اللوحة للتحديث الفوري
CREATE OR REPLACE FUNCTION update_xo_board(
    p_game_session_id UUID,
    p_new_board text[],
    p_player_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_board jsonb;
    new_board_jsonb jsonb;
    result jsonb;
BEGIN
    -- تحويل المصفوفة إلى jsonb
    SELECT to_jsonb(p_new_board) INTO new_board_jsonb;
    
    -- الحصول على اللوحة الحالية
    SELECT board_state INTO current_board
    FROM xo_matches 
    WHERE game_session_id = p_game_session_id;
    
    -- إذا لم توجد مباراة، إنشاء واحدة جديدة
    IF current_board IS NULL THEN
        INSERT INTO xo_matches (game_session_id, board_state)
        VALUES (p_game_session_id, new_board_jsonb);
        
        result := jsonb_build_object(
            'success', true,
            'board_state', new_board_jsonb,
            'action', 'created'
        );
    ELSE
        -- تحديث اللوحة الموجودة
        UPDATE xo_matches 
        SET board_state = new_board_jsonb,
            updated_at = now()
        WHERE game_session_id = p_game_session_id;
        
        result := jsonb_build_object(
            'success', true,
            'board_state', new_board_jsonb,
            'action', 'updated'
        );
    END IF;
    
    RETURN result;
END;
$$;
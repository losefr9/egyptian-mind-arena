-- إصلاح دالة إنشاء مباراة XO جديدة
CREATE OR REPLACE FUNCTION public.create_new_xo_match(session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
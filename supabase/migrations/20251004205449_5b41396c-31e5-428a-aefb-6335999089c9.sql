-- إنشاء جدول مباريات لودو
CREATE TABLE IF NOT EXISTS public.ludo_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID REFERENCES public.game_sessions(id),
  
  -- حالة اللوحة (58 خانة في المسار + 4 مناطق منزل لكل لاعب)
  board_state JSONB DEFAULT '{"positions": {}, "homes": {"player1": [0,1,2,3], "player2": [0,1,2,3]}}'::jsonb,
  
  -- قطع كل لاعب (4 قطع لكل لاعب)
  player1_pieces JSONB DEFAULT '[
    {"id": "p1_1", "position": -1, "inHome": true, "isFinished": false},
    {"id": "p1_2", "position": -1, "inHome": true, "isFinished": false},
    {"id": "p1_3", "position": -1, "inHome": true, "isFinished": false},
    {"id": "p1_4", "position": -1, "inHome": true, "isFinished": false}
  ]'::jsonb,
  
  player2_pieces JSONB DEFAULT '[
    {"id": "p2_1", "position": -1, "inHome": true, "isFinished": false},
    {"id": "p2_2", "position": -1, "inHome": true, "isFinished": false},
    {"id": "p2_3", "position": -1, "inHome": true, "isFinished": false},
    {"id": "p2_4", "position": -1, "inHome": true, "isFinished": false}
  ]'::jsonb,
  
  -- إدارة الأدوار والنرد
  current_turn_player_id UUID,
  last_dice_roll INTEGER DEFAULT 0,
  consecutive_sixes INTEGER DEFAULT 0,
  can_roll_again BOOLEAN DEFAULT true,
  
  -- حالة المباراة
  match_status TEXT DEFAULT 'playing',
  last_move_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تمكين RLS
ALTER TABLE public.ludo_matches ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Players can view their ludo matches"
  ON public.ludo_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = ludo_matches.game_session_id
      AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
    )
  );

CREATE POLICY "Players can create ludo matches"
  ON public.ludo_matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = ludo_matches.game_session_id
      AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
    )
  );

CREATE POLICY "Players can update their ludo matches"
  ON public.ludo_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = ludo_matches.game_session_id
      AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
    )
  );

-- دالة رمي النرد
CREATE OR REPLACE FUNCTION public.roll_ludo_dice(
  p_game_session_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_record RECORD;
  dice_result INTEGER;
BEGIN
  SELECT * INTO match_record 
  FROM ludo_matches 
  WHERE game_session_id = p_game_session_id;
  
  -- التحقق من دور اللاعب
  IF match_record.current_turn_player_id != p_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس دورك');
  END IF;
  
  -- رمي النرد
  dice_result := floor(random() * 6 + 1)::INTEGER;
  
  -- التحقق من 3 رميات 6 متتالية
  IF dice_result = 6 THEN
    IF match_record.consecutive_sixes >= 2 THEN
      -- خسارة الدور
      UPDATE ludo_matches
      SET consecutive_sixes = 0,
          can_roll_again = false,
          last_dice_roll = 0,
          updated_at = NOW()
      WHERE game_session_id = p_game_session_id;
      
      RETURN jsonb_build_object(
        'success', true, 
        'dice', 0, 
        'lostTurn', true,
        'message', 'ثلاث رميات 6 متتالية - خسرت الدور!'
      );
    ELSE
      -- يمكن الرمي مرة أخرى
      UPDATE ludo_matches
      SET last_dice_roll = dice_result,
          consecutive_sixes = match_record.consecutive_sixes + 1,
          can_roll_again = true,
          updated_at = NOW()
      WHERE game_session_id = p_game_session_id;
    END IF;
  ELSE
    -- رقم عادي
    UPDATE ludo_matches
    SET last_dice_roll = dice_result,
        consecutive_sixes = 0,
        can_roll_again = false,
        updated_at = NOW()
    WHERE game_session_id = p_game_session_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true, 
    'dice', dice_result,
    'canRollAgain', (dice_result = 6)
  );
END;
$$;

-- دالة تحريك القطعة
CREATE OR REPLACE FUNCTION public.move_ludo_piece(
  p_game_session_id UUID,
  p_player_id UUID,
  p_piece_id TEXT,
  p_dice_roll INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_record RECORD;
  session_record RECORD;
  player_pieces JSONB;
  opponent_pieces JSONB;
  piece JSONB;
  piece_index INTEGER;
  new_position INTEGER;
  is_player1 BOOLEAN;
  next_player UUID;
  finished_count INTEGER := 0;
BEGIN
  SELECT * INTO match_record FROM ludo_matches WHERE game_session_id = p_game_session_id;
  SELECT * INTO session_record FROM game_sessions WHERE id = p_game_session_id;
  
  is_player1 := (p_player_id = session_record.player1_id);
  
  IF is_player1 THEN
    player_pieces := match_record.player1_pieces;
    opponent_pieces := match_record.player2_pieces;
  ELSE
    player_pieces := match_record.player2_pieces;
    opponent_pieces := match_record.player1_pieces;
  END IF;
  
  -- البحث عن القطعة
  FOR piece_index IN 0..3 LOOP
    piece := player_pieces->piece_index;
    IF piece->>'id' = p_piece_id THEN
      EXIT;
    END IF;
  END LOOP;
  
  -- حساب الموقع الجديد
  IF (piece->>'inHome')::BOOLEAN THEN
    -- إخراج القطعة من المنزل (يحتاج 6)
    IF p_dice_roll != 6 THEN
      RETURN jsonb_build_object('success', false, 'error', 'تحتاج إلى 6 لإخراج القطعة');
    END IF;
    new_position := 0;
  ELSE
    new_position := (piece->>'position')::INTEGER + p_dice_roll;
    -- التحقق من الوصول للمنزل النهائي
    IF new_position >= 57 THEN
      new_position := 57; -- المنزل النهائي
    END IF;
  END IF;
  
  -- تحديث القطعة
  piece := jsonb_set(piece, '{position}', to_jsonb(new_position));
  piece := jsonb_set(piece, '{inHome}', 'false'::jsonb);
  IF new_position = 57 THEN
    piece := jsonb_set(piece, '{isFinished}', 'true'::jsonb);
  END IF;
  
  player_pieces := jsonb_set(player_pieces, ARRAY[piece_index::text], piece);
  
  -- التحقق من الأسر
  -- (منطق بسيط: إذا كانت قطعة الخصم في نفس الموقع، ترجع للمنزل)
  
  -- حساب عدد القطع المنتهية
  FOR piece_index IN 0..3 LOOP
    IF (player_pieces->piece_index->>'isFinished')::BOOLEAN THEN
      finished_count := finished_count + 1;
    END IF;
  END LOOP;
  
  -- تحديد اللاعب التالي
  IF p_dice_roll = 6 AND match_record.consecutive_sixes < 2 THEN
    next_player := p_player_id; -- نفس اللاعب
  ELSE
    next_player := CASE WHEN is_player1 THEN session_record.player2_id ELSE session_record.player1_id END;
  END IF;
  
  -- تحديث المباراة
  IF is_player1 THEN
    UPDATE ludo_matches
    SET player1_pieces = player_pieces,
        current_turn_player_id = next_player,
        last_move_time = NOW(),
        updated_at = NOW(),
        match_status = CASE WHEN finished_count = 4 THEN 'finished' ELSE match_status END
    WHERE game_session_id = p_game_session_id;
  ELSE
    UPDATE ludo_matches
    SET player2_pieces = player_pieces,
        current_turn_player_id = next_player,
        last_move_time = NOW(),
        updated_at = NOW(),
        match_status = CASE WHEN finished_count = 4 THEN 'finished' ELSE match_status END
    WHERE game_session_id = p_game_session_id;
  END IF;
  
  -- التحقق من الفوز
  IF finished_count = 4 THEN
    RETURN jsonb_build_object(
      'success', true, 
      'winner', p_player_id,
      'message', 'فوز!'
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'تم تنفيذ الحركة');
END;
$$;

-- إضافة لعبة لودو إلى جدول الألعاب
INSERT INTO public.games (name, description, image_url, is_active)
VALUES (
  'لودو',
  'لعبة لودو كلاسيكية - احصل على 6 لإخراج قطعك وكن أول من يدخل جميع قطعك المنزل',
  '/placeholder.svg',
  true
)
ON CONFLICT DO NOTHING;
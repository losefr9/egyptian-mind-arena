-- ============================================
-- لعبة الشطرنج - الجداول والوظائف
-- ============================================

-- 1. إنشاء جدول مباريات الشطرنج
CREATE TABLE IF NOT EXISTS chess_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  board_state TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', -- FEN notation
  player1_time_remaining INTEGER NOT NULL DEFAULT 600, -- 10 دقائق بالثواني
  player2_time_remaining INTEGER NOT NULL DEFAULT 600,
  current_turn_player_id UUID,
  last_move_time TIMESTAMPTZ DEFAULT NOW(),
  match_status TEXT DEFAULT 'playing', -- playing, checkmate, stalemate, draw, timeout
  move_history JSONB DEFAULT '[]', -- [{from: 'e2', to: 'e4', piece: 'p', captured: null, timestamp: '...'}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_game_session UNIQUE(game_session_id)
);

-- 2. إضافة RLS policies للشطرنج
ALTER TABLE chess_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their chess matches"
ON chess_matches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_sessions gs
    WHERE gs.id = chess_matches.game_session_id
    AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
  )
);

CREATE POLICY "Players can update their chess matches"
ON chess_matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM game_sessions gs
    WHERE gs.id = chess_matches.game_session_id
    AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
  )
);

CREATE POLICY "Players can create chess matches"
ON chess_matches FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM game_sessions gs
    WHERE gs.id = chess_matches.game_session_id
    AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
  )
);

-- 3. RPC Function لعمل حركة شطرنج
CREATE OR REPLACE FUNCTION make_chess_move(
  p_game_session_id UUID,
  p_player_id UUID,
  p_from TEXT,
  p_to TEXT,
  p_board_state TEXT,
  p_move_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match_record RECORD;
BEGIN
  -- التحقق من وجود المباراة
  SELECT * INTO v_match_record
  FROM chess_matches
  WHERE game_session_id = p_game_session_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'match_not_found',
      'message', 'المباراة غير موجودة'
    );
  END IF;
  
  -- التحقق من دور اللاعب
  IF v_match_record.current_turn_player_id != p_player_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_your_turn',
      'message', 'ليس دورك الآن'
    );
  END IF;
  
  -- تحديث اللوحة وإضافة الحركة للتاريخ
  UPDATE chess_matches
  SET 
    board_state = p_board_state,
    move_history = move_history || p_move_data,
    last_move_time = NOW(),
    updated_at = NOW(),
    current_turn_player_id = (
      SELECT CASE 
        WHEN gs.player1_id = p_player_id THEN gs.player2_id
        ELSE gs.player1_id
      END
      FROM game_sessions gs
      WHERE gs.id = p_game_session_id
    )
  WHERE game_session_id = p_game_session_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تنفيذ الحركة بنجاح',
    'board_state', p_board_state
  );
END;
$$;

-- 4. RPC Function لتحديث الوقت
CREATE OR REPLACE FUNCTION update_chess_timer(
  p_game_session_id UUID,
  p_player1_time INTEGER,
  p_player2_time INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chess_matches
  SET 
    player1_time_remaining = p_player1_time,
    player2_time_remaining = p_player2_time,
    updated_at = NOW()
  WHERE game_session_id = p_game_session_id;
  
  -- التحقق من انتهاء الوقت
  IF p_player1_time <= 0 OR p_player2_time <= 0 THEN
    UPDATE chess_matches
    SET match_status = 'timeout'
    WHERE game_session_id = p_game_session_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'timeout', true,
      'winner', CASE WHEN p_player1_time <= 0 THEN 'player2' ELSE 'player1' END
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'timeout', false);
END;
$$;

-- 5. إضافة لعبة الشطرنج إذا لم تكن موجودة
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM games WHERE name = 'شطرنج') THEN
    INSERT INTO games (name, description, image_url, is_active)
    VALUES (
      'شطرنج',
      'لعبة الشطرنج الكلاسيكية - 10 دقائق لكل لاعب',
      '/src/assets/chess-game-image.jpg',
      true
    );
  END IF;
END $$;

-- 6. إضافة trigger لتحديث updated_at
CREATE TRIGGER update_chess_matches_updated_at
BEFORE UPDATE ON chess_matches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. إضافة indexes للأداء
CREATE INDEX IF NOT EXISTS idx_chess_matches_game_session ON chess_matches(game_session_id);
CREATE INDEX IF NOT EXISTS idx_chess_matches_status ON chess_matches(match_status);
-- إنشاء جدول للحركات المعلقة (Pending Moves)
CREATE TABLE IF NOT EXISTS pending_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  cell_index INTEGER NOT NULL CHECK (cell_index >= 0 AND cell_index <= 8),
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 seconds'),
  UNIQUE(game_session_id, cell_index)
);

-- Index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_pending_moves_session ON pending_moves(game_session_id);
CREATE INDEX IF NOT EXISTS idx_pending_moves_expires ON pending_moves(expires_at);

-- تفعيل RLS
ALTER TABLE pending_moves ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Players can view pending moves in their games"
ON pending_moves FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_sessions gs
    WHERE gs.id = pending_moves.game_session_id
    AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
  )
);

CREATE POLICY "Players can create pending moves in their games"
ON pending_moves FOR INSERT
WITH CHECK (
  auth.uid() = player_id
  AND EXISTS (
    SELECT 1 FROM game_sessions gs
    WHERE gs.id = pending_moves.game_session_id
    AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
  )
);

CREATE POLICY "System can delete expired moves"
ON pending_moves FOR DELETE
USING (true);

-- دالة لحجز المربع (Reserve Cell) - الأول يحجز يفوز
CREATE OR REPLACE FUNCTION reserve_cell(
  p_game_session_id UUID,
  p_player_id UUID,
  p_cell_index INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_board JSONB;
  v_cell_value TEXT;
  v_lock_id BIGINT;
BEGIN
  -- إنشاء lock فريد للجلسة والمربع
  v_lock_id := ('x' || substr(md5(p_game_session_id::text || p_cell_index::text), 1, 15))::bit(60)::bigint;
  
  -- الحصول على advisory lock (يمنع التنفيذ المتزامن)
  PERFORM pg_advisory_xact_lock(v_lock_id);
  
  -- التحقق من صحة الجلسة واللاعب
  IF NOT EXISTS (
    SELECT 1 FROM game_sessions
    WHERE id = p_game_session_id
    AND (player1_id = p_player_id OR player2_id = p_player_id)
    AND status = 'in_progress'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_session',
      'message', 'جلسة غير صالحة'
    );
  END IF;
  
  -- حذف الحجوزات المنتهية
  DELETE FROM pending_moves
  WHERE game_session_id = p_game_session_id
  AND expires_at < NOW();
  
  -- الحصول على حالة اللوحة الحالية
  SELECT board_state INTO v_current_board
  FROM xo_matches
  WHERE game_session_id = p_game_session_id;
  
  -- التحقق من أن المربع فارغ
  v_cell_value := v_current_board->p_cell_index;
  
  IF v_cell_value != '""' AND v_cell_value != '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'cell_occupied',
      'message', 'المربع محجوز بالفعل'
    );
  END IF;
  
  -- التحقق من عدم وجود حجز سابق لنفس المربع
  IF EXISTS (
    SELECT 1 FROM pending_moves
    WHERE game_session_id = p_game_session_id
    AND cell_index = p_cell_index
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'cell_reserved',
      'message', 'المربع محجوز من قبل لاعب آخر'
    );
  END IF;
  
  -- حجز المربع
  INSERT INTO pending_moves (game_session_id, player_id, cell_index)
  VALUES (p_game_session_id, p_player_id, p_cell_index);
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم حجز المربع بنجاح',
    'cell_index', p_cell_index,
    'reserved_at', NOW()
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'system_error',
    'message', 'خطأ في النظام: ' || SQLERRM
  );
END;
$$;

-- دالة لتأكيد الحركة بعد حل السؤال (Commit Move)
CREATE OR REPLACE FUNCTION commit_move(
  p_game_session_id UUID,
  p_player_id UUID,
  p_cell_index INTEGER,
  p_symbol TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_board JSONB;
  v_new_board JSONB;
  v_lock_id BIGINT;
  v_reservation_exists BOOLEAN;
BEGIN
  -- إنشاء lock فريد
  v_lock_id := ('x' || substr(md5(p_game_session_id::text || p_cell_index::text), 1, 15))::bit(60)::bigint;
  
  -- الحصول على advisory lock
  PERFORM pg_advisory_xact_lock(v_lock_id);
  
  -- التحقق من وجود الحجز
  SELECT EXISTS (
    SELECT 1 FROM pending_moves
    WHERE game_session_id = p_game_session_id
    AND player_id = p_player_id
    AND cell_index = p_cell_index
    AND expires_at > NOW()
  ) INTO v_reservation_exists;
  
  IF NOT v_reservation_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_reservation',
      'message', 'لا يوجد حجز صالح لهذا المربع'
    );
  END IF;
  
  -- الحصول على اللوحة الحالية
  SELECT board_state INTO v_current_board
  FROM xo_matches
  WHERE game_session_id = p_game_session_id;
  
  -- تحديث اللوحة
  v_new_board := jsonb_set(
    v_current_board,
    ARRAY[p_cell_index::text],
    to_jsonb(p_symbol)
  );
  
  -- حفظ التحديث
  UPDATE xo_matches
  SET board_state = v_new_board,
      updated_at = NOW()
  WHERE game_session_id = p_game_session_id;
  
  -- حذف الحجز
  DELETE FROM pending_moves
  WHERE game_session_id = p_game_session_id
  AND cell_index = p_cell_index;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم تأكيد الحركة بنجاح',
    'board_state', v_new_board,
    'cell_index', p_cell_index
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'system_error',
    'message', 'خطأ في النظام: ' || SQLERRM
  );
END;
$$;

-- دالة لإلغاء الحجز
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_game_session_id UUID,
  p_player_id UUID,
  p_cell_index INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM pending_moves
  WHERE game_session_id = p_game_session_id
  AND player_id = p_player_id
  AND cell_index = p_cell_index;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم إلغاء الحجز'
  );
END;
$$;

-- دالة لتنظيف الحجوزات المنتهية تلقائياً
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM pending_moves
  WHERE expires_at < NOW();
END;
$$;
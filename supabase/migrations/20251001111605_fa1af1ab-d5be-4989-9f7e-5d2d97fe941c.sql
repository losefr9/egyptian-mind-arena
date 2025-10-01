-- Drop existing functions first
DROP FUNCTION IF EXISTS reserve_cell(uuid, uuid, integer);
DROP FUNCTION IF EXISTS commit_move(uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS cancel_reservation(uuid, uuid, integer);

-- Add unique constraint to pending_moves table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'pending_moves_unique_cell'
  ) THEN
    ALTER TABLE pending_moves
    ADD CONSTRAINT pending_moves_unique_cell UNIQUE (game_session_id, cell_index);
  END IF;
END $$;

-- Recreate reserve_cell function
CREATE OR REPLACE FUNCTION reserve_cell(
  p_game_session_id UUID,
  p_player_id UUID,
  p_cell_index INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_board_state jsonb;
  v_cell_value text;
  v_lock_acquired boolean;
BEGIN
  -- Get advisory lock (non-blocking)
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext(p_game_session_id::text || p_cell_index::text));
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'هذا المربع محجوز حالياً من قبل لاعب آخر'
    );
  END IF;

  -- Get current board state
  SELECT board_state INTO v_board_state
  FROM xo_matches
  WHERE game_session_id = p_game_session_id;

  IF v_board_state IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'اللعبة غير موجودة'
    );
  END IF;

  -- Check if cell is already occupied
  v_cell_value := v_board_state->>p_cell_index;
  IF v_cell_value IS NOT NULL AND v_cell_value != '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'هذا المربع محجوز بالفعل'
    );
  END IF;

  -- Insert or update reservation
  INSERT INTO pending_moves (game_session_id, player_id, cell_index, reserved_at, expires_at)
  VALUES (p_game_session_id, p_player_id, p_cell_index, NOW(), NOW() + INTERVAL '30 seconds')
  ON CONFLICT (game_session_id, cell_index)
  DO UPDATE SET 
    player_id = EXCLUDED.player_id,
    reserved_at = EXCLUDED.reserved_at,
    expires_at = EXCLUDED.expires_at
  WHERE pending_moves.expires_at < NOW();

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم حجز المربع بنجاح'
  );
END;
$$;

-- Recreate commit_move function
CREATE OR REPLACE FUNCTION commit_move(
  p_game_session_id UUID,
  p_player_id UUID,
  p_cell_index INTEGER,
  p_symbol TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_board_state jsonb;
  v_new_board jsonb;
  v_cell_value text;
  v_reserved_player_id uuid;
  v_lock_acquired boolean;
BEGIN
  -- Get advisory lock
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext(p_game_session_id::text || p_cell_index::text));
  
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'لا يمكن تأكيد الحركة - المربع محجوز'
    );
  END IF;

  -- Verify reservation
  SELECT player_id INTO v_reserved_player_id
  FROM pending_moves
  WHERE game_session_id = p_game_session_id
    AND cell_index = p_cell_index
    AND expires_at > NOW();

  IF v_reserved_player_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'انتهت صلاحية الحجز أو غير موجود'
    );
  END IF;

  IF v_reserved_player_id != p_player_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'هذا المربع محجوز من قبل لاعب آخر'
    );
  END IF;

  -- Get current board
  SELECT board_state INTO v_board_state
  FROM xo_matches
  WHERE game_session_id = p_game_session_id;

  IF v_board_state IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'اللعبة غير موجودة'
    );
  END IF;

  -- Check cell is still empty
  v_cell_value := v_board_state->>p_cell_index;
  IF v_cell_value IS NOT NULL AND v_cell_value != '' THEN
    -- Delete the reservation
    DELETE FROM pending_moves
    WHERE game_session_id = p_game_session_id
      AND cell_index = p_cell_index;
      
    RETURN jsonb_build_object(
      'success', false,
      'message', 'المربع محجوز بالفعل من قبل اللاعب الآخر'
    );
  END IF;

  -- Update board
  v_new_board := jsonb_set(v_board_state, ARRAY[p_cell_index::text], to_jsonb(p_symbol));

  UPDATE xo_matches
  SET board_state = v_new_board,
      updated_at = NOW()
  WHERE game_session_id = p_game_session_id;

  -- Delete reservation
  DELETE FROM pending_moves
  WHERE game_session_id = p_game_session_id
    AND cell_index = p_cell_index;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تأكيد الحركة بنجاح',
    'board_state', v_new_board
  );
END;
$$;

-- Recreate cancel_reservation function
CREATE OR REPLACE FUNCTION cancel_reservation(
  p_game_session_id UUID,
  p_player_id UUID,
  p_cell_index INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM pending_moves
  WHERE game_session_id = p_game_session_id
    AND cell_index = p_cell_index
    AND player_id = p_player_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم إلغاء الحجز'
  );
END;
$$;
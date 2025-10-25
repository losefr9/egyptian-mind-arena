/*
  # إصلاح إنشاء مباريات الشطرنج التلقائي

  ## المشكلة
  عند إنشاء game_session للشطرنج، لا يتم إنشاء سجل في جدول chess_matches تلقائياً،
  مما يؤدي إلى فشل تحميل اللعبة وعدم قبول الحركات.

  ## الحل
  1. إنشاء دالة create_chess_match_for_session لإنشاء سجل chess_match تلقائياً
  2. تحديث دالة find_match_and_create_session_v3 لإنشاء chess_matches
  3. إنشاء trigger لإنشاء chess_match عند إدراج game_session للشطرنج
  4. تحسين دالة make_chess_move لإنشاء سجل تلقائياً إذا لم يكن موجوداً

  ## التغييرات
  - دالة create_chess_match_for_session: تنشئ سجل chess_match مع الإعدادات الافتراضية
  - تحديث find_match_and_create_session_v3: إضافة إنشاء chess_matches
  - trigger auto_create_chess_match: ينشئ سجل تلقائياً عند إنشاء game_session
  - تحديث make_chess_move: معالجة حالة عدم وجود سجل
*/

-- 1. دالة لإنشاء سجل مباراة شطرنج
CREATE OR REPLACE FUNCTION create_chess_match_for_session(p_session_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player1_id UUID;
  v_match_id UUID;
BEGIN
  -- الحصول على معرف اللاعب الأول من الجلسة
  SELECT player1_id INTO v_player1_id
  FROM game_sessions
  WHERE id = p_session_id;

  IF v_player1_id IS NULL THEN
    RAISE EXCEPTION 'Game session not found';
  END IF;

  -- إنشاء سجل مباراة شطرنج جديد
  INSERT INTO chess_matches (
    game_session_id,
    board_state,
    player1_time_remaining,
    player2_time_remaining,
    current_turn_player_id,
    match_status,
    move_history
  ) VALUES (
    p_session_id,
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    600,
    600,
    v_player1_id,
    'playing',
    '[]'::jsonb
  )
  ON CONFLICT (game_session_id) DO NOTHING
  RETURNING id INTO v_match_id;

  RETURN v_match_id;
END;
$$;

-- 2. دالة trigger لإنشاء chess_match تلقائياً
CREATE OR REPLACE FUNCTION auto_create_chess_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_game_name TEXT;
BEGIN
  -- التحقق من أن اللعبة هي شطرنج
  SELECT name INTO v_game_name
  FROM games
  WHERE id = NEW.game_id;

  IF v_game_name = 'شطرنج' THEN
    -- إنشاء سجل مباراة شطرنج
    PERFORM create_chess_match_for_session(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- 3. إنشاء trigger على game_sessions
DROP TRIGGER IF EXISTS trigger_auto_create_chess_match ON game_sessions;
CREATE TRIGGER trigger_auto_create_chess_match
AFTER INSERT ON game_sessions
FOR EACH ROW
WHEN (NEW.status = 'in_progress')
EXECUTE FUNCTION auto_create_chess_match();

-- 4. تحديث دالة find_match_and_create_session_v3 لإضافة دعم الشطرنج
CREATE OR REPLACE FUNCTION public.find_match_and_create_session_v3(
  p_user_id uuid,
  p_game_id uuid,
  p_bet_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_opponent_queue_entry RECORD;
  v_new_session_id UUID;
  v_existing_queue_id UUID;
  v_current_balance NUMERIC;
  v_game_name TEXT;
BEGIN
  -- التحقق من رصيد اللاعب أولاً
  SELECT balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id;

  IF v_current_balance IS NULL OR v_current_balance < p_bet_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'insufficient_balance',
      'message', 'رصيد غير كافي'
    );
  END IF;

  -- الحصول على اسم اللعبة
  SELECT name INTO v_game_name FROM games WHERE id = p_game_id;

  -- البحث عن خصم مباشرة (استبعاد نفس اللاعب تماماً)
  SELECT * INTO v_opponent_queue_entry
  FROM player_queue
  WHERE game_id = p_game_id
    AND bet_amount = p_bet_amount
    AND status = 'waiting'
    AND user_id != p_user_id
    AND created_at >= now() - INTERVAL '10 minutes'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_opponent_queue_entry.id IS NOT NULL THEN
    -- تم العثور على خصم، إنشاء مباراة فوراً

    -- خصم الرصيد من كلا اللاعبين بشكل atomic
    UPDATE profiles
    SET balance = balance - p_bet_amount,
        updated_at = now()
    WHERE id IN (p_user_id, v_opponent_queue_entry.user_id)
      AND balance >= p_bet_amount;

    -- التحقق من نجاح العملية
    IF (SELECT COUNT(*) FROM profiles
        WHERE id IN (p_user_id, v_opponent_queue_entry.user_id)
          AND balance >= 0) != 2 THEN
      ROLLBACK;
      RETURN json_build_object(
        'success', false,
        'error', 'balance_update_failed',
        'message', 'فشل في خصم الرصيد'
      );
    END IF;

    -- إنشاء جلسة اللعب
    INSERT INTO game_sessions (
      game_id,
      player1_id,
      player2_id,
      bet_amount,
      status,
      started_at,
      prize_amount,
      platform_fee_percentage
    ) VALUES (
      p_game_id,
      v_opponent_queue_entry.user_id,
      p_user_id,
      p_bet_amount,
      'in_progress',
      now(),
      p_bet_amount * 2,
      10
    ) RETURNING id INTO v_new_session_id;

    -- تحديث حالة قائمة الانتظار
    UPDATE player_queue
    SET status = 'matched',
        matched_at = now(),
        match_session_id = v_new_session_id,
        updated_at = now()
    WHERE id = v_opponent_queue_entry.id;

    -- إضافة اللاعب الجديد كمطابق
    INSERT INTO player_queue (
      user_id, game_id, bet_amount, status, matched_at, match_session_id
    ) VALUES (
      p_user_id, p_game_id, p_bet_amount, 'matched', now(), v_new_session_id
    );

    -- إنشاء سجل مباراة حسب نوع اللعبة
    IF v_game_name = 'XO' THEN
      INSERT INTO xo_matches (
        game_session_id,
        current_turn_player_id,
        match_status
      ) VALUES (
        v_new_session_id,
        v_opponent_queue_entry.user_id,
        'waiting_for_question_answer'
      )
      ON CONFLICT (game_session_id) DO NOTHING;
    ELSIF v_game_name = 'شطرنج' THEN
      -- إنشاء مباراة شطرنج
      PERFORM create_chess_match_for_session(v_new_session_id);
    END IF;

    RETURN json_build_object(
      'success', true,
      'action', 'matched',
      'session_id', v_new_session_id,
      'opponent_id', v_opponent_queue_entry.user_id,
      'message', 'تم العثور على خصم!'
    );
  ELSE
    -- لا يوجد خصم متاح، إضافة اللاعب لقائمة الانتظار

    -- حذف المدخلات القديمة للاعب
    DELETE FROM player_queue
    WHERE user_id = p_user_id
      AND game_id = p_game_id
      AND bet_amount = p_bet_amount
      AND status = 'waiting';

    -- إضافة مدخلة جديدة
    INSERT INTO player_queue (user_id, game_id, bet_amount, status)
    VALUES (p_user_id, p_game_id, p_bet_amount, 'waiting');

    RETURN json_build_object(
      'success', true,
      'action', 'queued',
      'message', 'تم إضافتك لقائمة الانتظار'
    );
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'system_error',
    'message', 'خطأ في النظام: ' || SQLERRM
  );
END;
$function$;

-- 5. تحسين دالة make_chess_move لإنشاء سجل تلقائياً إذا لم يكن موجوداً
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
  v_next_player_id UUID;
BEGIN
  -- التحقق من وجود المباراة، وإنشاؤها إذا لم تكن موجودة
  SELECT * INTO v_match_record
  FROM chess_matches
  WHERE game_session_id = p_game_session_id;

  IF NOT FOUND THEN
    -- إنشاء سجل المباراة تلقائياً
    PERFORM create_chess_match_for_session(p_game_session_id);

    -- محاولة الحصول على السجل مرة أخرى
    SELECT * INTO v_match_record
    FROM chess_matches
    WHERE game_session_id = p_game_session_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'match_creation_failed',
        'message', 'فشل في إنشاء المباراة'
      );
    END IF;
  END IF;

  -- التحقق من دور اللاعب
  IF v_match_record.current_turn_player_id != p_player_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_your_turn',
      'message', 'ليس دورك الآن'
    );
  END IF;

  -- تحديد اللاعب التالي
  SELECT CASE
    WHEN gs.player1_id = p_player_id THEN gs.player2_id
    ELSE gs.player1_id
  END INTO v_next_player_id
  FROM game_sessions gs
  WHERE gs.id = p_game_session_id;

  -- تحديث اللوحة وإضافة الحركة للتاريخ
  UPDATE chess_matches
  SET
    board_state = p_board_state,
    move_history = move_history || p_move_data,
    last_move_time = NOW(),
    updated_at = NOW(),
    current_turn_player_id = v_next_player_id
  WHERE game_session_id = p_game_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تنفيذ الحركة بنجاح',
    'board_state', p_board_state,
    'next_turn', v_next_player_id
  );
END;
$$;

-- 6. إنشاء دالة لإصلاح المباريات الموجودة التي ليس لها سجل chess_match
CREATE OR REPLACE FUNCTION fix_missing_chess_matches()
RETURNS TABLE(session_id UUID, created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_match_id UUID;
BEGIN
  -- العثور على جلسات الشطرنج بدون سجل chess_match
  FOR v_session IN
    SELECT gs.id, gs.player1_id
    FROM game_sessions gs
    INNER JOIN games g ON g.id = gs.game_id
    LEFT JOIN chess_matches cm ON cm.game_session_id = gs.id
    WHERE g.name = 'شطرنج'
      AND gs.status IN ('in_progress', 'waiting')
      AND cm.id IS NULL
  LOOP
    -- إنشاء سجل مباراة
    v_match_id := create_chess_match_for_session(v_session.id);

    session_id := v_session.id;
    created := (v_match_id IS NOT NULL);

    RETURN NEXT;
  END LOOP;
END;
$$;

-- تشغيل الدالة لإصلاح المباريات الموجودة
SELECT * FROM fix_missing_chess_matches();

-- إنشاء جدول مباريات الدومينو
CREATE TABLE IF NOT EXISTS domino_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id),
  player1_hand JSONB DEFAULT '[]'::jsonb, -- يد اللاعب الأول
  player2_hand JSONB DEFAULT '[]'::jsonb, -- يد اللاعب الثاني
  boneyard JSONB DEFAULT '[]'::jsonb, -- القطع المتبقية (المخزن)
  board_chain JSONB DEFAULT '[]'::jsonb, -- السلسلة على اللوحة
  current_turn_player_id UUID,
  match_status TEXT DEFAULT 'playing',
  last_move_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تمكين RLS
ALTER TABLE domino_matches ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Players can view their domino matches"
  ON domino_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = domino_matches.game_session_id
      AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
    )
  );

CREATE POLICY "Players can create domino matches"
  ON domino_matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = domino_matches.game_session_id
      AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
    )
  );

CREATE POLICY "Players can update their domino matches"
  ON domino_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions gs
      WHERE gs.id = domino_matches.game_session_id
      AND (gs.player1_id = auth.uid() OR gs.player2_id = auth.uid())
    )
  );

-- دالة لإنشاء مجموعة دومينو جديدة (28 قطعة: 0-0 إلى 6-6)
CREATE OR REPLACE FUNCTION generate_domino_set()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  pieces JSONB := '[]'::jsonb;
  i INTEGER;
  j INTEGER;
BEGIN
  FOR i IN 0..6 LOOP
    FOR j IN i..6 LOOP
      pieces := pieces || jsonb_build_object(
        'left', i,
        'right', j,
        'id', gen_random_uuid()
      );
    END LOOP;
  END LOOP;
  RETURN pieces;
END;
$$;

-- دالة لخلط وتوزيع القطع
CREATE OR REPLACE FUNCTION shuffle_and_deal_dominos(p_game_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  all_pieces JSONB;
  shuffled JSONB := '[]'::jsonb;
  player1_pieces JSONB := '[]'::jsonb;
  player2_pieces JSONB := '[]'::jsonb;
  boneyard_pieces JSONB := '[]'::jsonb;
  piece JSONB;
  i INTEGER := 0;
  session_record RECORD;
  first_player UUID;
  highest_double JSONB;
  p1_highest INTEGER := -1;
  p2_highest INTEGER := -1;
BEGIN
  -- توليد المجموعة
  all_pieces := generate_domino_set();
  
  -- خلط القطع (محاكاة الخلط عن طريق ترتيب عشوائي)
  SELECT jsonb_agg(value ORDER BY random())
  INTO shuffled
  FROM jsonb_array_elements(all_pieces);
  
  -- توزيع 7 قطع لكل لاعب
  FOR i IN 0..6 LOOP
    player1_pieces := player1_pieces || jsonb_build_array(shuffled->i);
  END LOOP;
  
  FOR i IN 7..13 LOOP
    player2_pieces := player2_pieces || jsonb_build_array(shuffled->i);
  END LOOP;
  
  -- الباقي يذهب للبونيارد
  FOR i IN 14..27 LOOP
    boneyard_pieces := boneyard_pieces || jsonb_build_array(shuffled->i);
  END LOOP;
  
  -- تحديد من يبدأ (من لديه أعلى دبل)
  SELECT * INTO session_record FROM game_sessions WHERE id = p_game_session_id;
  
  -- البحث عن أعلى دبل لكل لاعب
  FOR i IN 0..6 LOOP
    IF player1_pieces @> jsonb_build_array(jsonb_build_object('left', 6-i, 'right', 6-i)) THEN
      p1_highest := 6-i;
      EXIT;
    END IF;
  END LOOP;
  
  FOR i IN 0..6 LOOP
    IF player2_pieces @> jsonb_build_array(jsonb_build_object('left', 6-i, 'right', 6-i)) THEN
      p2_highest := 6-i;
      EXIT;
    END IF;
  END LOOP;
  
  -- تحديد اللاعب الأول
  IF p1_highest >= p2_highest THEN
    first_player := session_record.player1_id;
  ELSE
    first_player := session_record.player2_id;
  END IF;
  
  -- تحديث المباراة
  UPDATE domino_matches
  SET 
    player1_hand = player1_pieces,
    player2_hand = player2_pieces,
    boneyard = boneyard_pieces,
    current_turn_player_id = first_player,
    updated_at = NOW()
  WHERE game_session_id = p_game_session_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'first_player', first_player,
    'player1_count', 7,
    'player2_count', 7,
    'boneyard_count', 14
  );
END;
$$;

-- دالة لتنفيذ حركة
CREATE OR REPLACE FUNCTION make_domino_move(
  p_game_session_id UUID,
  p_player_id UUID,
  p_piece JSONB,
  p_side TEXT -- 'left' أو 'right'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_record RECORD;
  player_hand JSONB;
  new_hand JSONB := '[]'::jsonb;
  new_chain JSONB;
  chain_left INTEGER;
  chain_right INTEGER;
  piece_left INTEGER;
  piece_right INTEGER;
  is_valid BOOLEAN := false;
  next_player UUID;
  session_record RECORD;
BEGIN
  SELECT * INTO match_record FROM domino_matches WHERE game_session_id = p_game_session_id;
  SELECT * INTO session_record FROM game_sessions WHERE id = p_game_session_id;
  
  IF match_record.current_turn_player_id != p_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس دورك');
  END IF;
  
  -- الحصول على يد اللاعب
  IF p_player_id = session_record.player1_id THEN
    player_hand := match_record.player1_hand;
  ELSE
    player_hand := match_record.player2_hand;
  END IF;
  
  -- التحقق من وجود القطعة في يد اللاعب
  IF NOT (player_hand @> jsonb_build_array(p_piece)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'القطعة غير موجودة في يدك');
  END IF;
  
  piece_left := (p_piece->>'left')::INTEGER;
  piece_right := (p_piece->>'right')::INTEGER;
  
  -- إذا كانت اللوحة فارغة، هذه أول قطعة
  IF jsonb_array_length(match_record.board_chain) = 0 THEN
    new_chain := jsonb_build_array(p_piece);
    is_valid := true;
  ELSE
    -- الحصول على أطراف السلسلة
    chain_left := (match_record.board_chain->0->>'left')::INTEGER;
    chain_right := (match_record.board_chain->-1->>'right')::INTEGER;
    
    -- التحقق من صحة الحركة
    IF p_side = 'left' THEN
      IF piece_right = chain_left THEN
        new_chain := jsonb_build_array(p_piece) || match_record.board_chain;
        is_valid := true;
      ELSIF piece_left = chain_left THEN
        -- قلب القطعة
        new_chain := jsonb_build_array(jsonb_build_object('left', piece_right, 'right', piece_left, 'id', p_piece->>'id')) || match_record.board_chain;
        is_valid := true;
      END IF;
    ELSIF p_side = 'right' THEN
      IF piece_left = chain_right THEN
        new_chain := match_record.board_chain || jsonb_build_array(p_piece);
        is_valid := true;
      ELSIF piece_right = chain_right THEN
        -- قلب القطعة
        new_chain := match_record.board_chain || jsonb_build_array(jsonb_build_object('left', piece_right, 'right', piece_left, 'id', p_piece->>'id'));
        is_valid := true;
      END IF;
    END IF;
  END IF;
  
  IF NOT is_valid THEN
    RETURN jsonb_build_object('success', false, 'error', 'حركة غير صالحة');
  END IF;
  
  -- إزالة القطعة من يد اللاعب
  SELECT jsonb_agg(elem)
  INTO new_hand
  FROM jsonb_array_elements(player_hand) elem
  WHERE elem->>'id' != p_piece->>'id';
  
  -- تبديل الدور
  IF p_player_id = session_record.player1_id THEN
    next_player := session_record.player2_id;
  ELSE
    next_player := session_record.player1_id;
  END IF;
  
  -- التحقق من الفوز
  IF jsonb_array_length(new_hand) = 0 THEN
    UPDATE domino_matches
    SET match_status = 'finished',
        board_chain = new_chain,
        updated_at = NOW()
    WHERE game_session_id = p_game_session_id;
    
    IF p_player_id = session_record.player1_id THEN
      UPDATE domino_matches SET player1_hand = new_hand WHERE game_session_id = p_game_session_id;
    ELSE
      UPDATE domino_matches SET player2_hand = new_hand WHERE game_session_id = p_game_session_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'winner', p_player_id, 'message', 'فوز!');
  END IF;
  
  -- تحديث المباراة
  IF p_player_id = session_record.player1_id THEN
    UPDATE domino_matches
    SET player1_hand = new_hand,
        board_chain = new_chain,
        current_turn_player_id = next_player,
        last_move_time = NOW(),
        updated_at = NOW()
    WHERE game_session_id = p_game_session_id;
  ELSE
    UPDATE domino_matches
    SET player2_hand = new_hand,
        board_chain = new_chain,
        current_turn_player_id = next_player,
        last_move_time = NOW(),
        updated_at = NOW()
    WHERE game_session_id = p_game_session_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'تم تنفيذ الحركة');
END;
$$;

-- دالة للسحب من البونيارد
CREATE OR REPLACE FUNCTION draw_from_boneyard(
  p_game_session_id UUID,
  p_player_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_record RECORD;
  session_record RECORD;
  drawn_piece JSONB;
  new_boneyard JSONB := '[]'::jsonb;
  new_hand JSONB;
BEGIN
  SELECT * INTO match_record FROM domino_matches WHERE game_session_id = p_game_session_id;
  SELECT * INTO session_record FROM game_sessions WHERE id = p_game_session_id;
  
  IF match_record.current_turn_player_id != p_player_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'ليس دورك');
  END IF;
  
  IF jsonb_array_length(match_record.boneyard) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'البونيارد فارغ');
  END IF;
  
  -- سحب قطعة عشوائية
  drawn_piece := match_record.boneyard->0;
  
  -- إزالتها من البونيارد
  SELECT jsonb_agg(elem)
  INTO new_boneyard
  FROM (
    SELECT value as elem, row_number() OVER () as rn
    FROM jsonb_array_elements(match_record.boneyard)
  ) sub
  WHERE rn > 1;
  
  -- إضافتها ليد اللاعب
  IF p_player_id = session_record.player1_id THEN
    new_hand := match_record.player1_hand || jsonb_build_array(drawn_piece);
    UPDATE domino_matches
    SET player1_hand = new_hand,
        boneyard = COALESCE(new_boneyard, '[]'::jsonb),
        updated_at = NOW()
    WHERE game_session_id = p_game_session_id;
  ELSE
    new_hand := match_record.player2_hand || jsonb_build_array(drawn_piece);
    UPDATE domino_matches
    SET player2_hand = new_hand,
        boneyard = COALESCE(new_boneyard, '[]'::jsonb),
        updated_at = NOW()
    WHERE game_session_id = p_game_session_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'piece', drawn_piece);
END;
$$;

-- إضافة لعبة الدومينو
INSERT INTO games (id, name, description, image_url, is_active)
VALUES (
  'e5f8c9a1-2b3d-4e5f-6a7b-8c9d0e1f2a3b',
  'دومينو',
  'لعبة الدومينو الكلاسيكية - ضع قطعك بذكاء!',
  '/placeholder.svg',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
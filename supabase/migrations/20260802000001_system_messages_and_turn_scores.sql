-- System bot messages + per-turn score storage for efficient evaluation
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_check
  CHECK (sender IN ('interviewer', 'candidate', 'system'));

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS turn_scores JSONB DEFAULT '[]'::jsonb;

-- Stats: only completed interviews with real scores count toward avg
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  total_hours NUMERIC,
  active_streak INT,
  avg_score NUMERIC
) AS $$
DECLARE
  v_total_sessions BIGINT;
  v_total_hours NUMERIC;
  v_streak INT := 0;
  v_avg_score NUMERIC;
  v_date DATE;
  v_prev_date DATE := NULL;
BEGIN
  SELECT COUNT(*) INTO v_total_sessions
  FROM public.interviews
  WHERE user_id = p_user_id;

  SELECT COALESCE(SUM(duration)::NUMERIC / 60.0, 0.0) INTO v_total_hours
  FROM public.interviews
  WHERE user_id = p_user_id AND status = 'completed';

  SELECT COALESCE(AVG(score_overall), 0.0) INTO v_avg_score
  FROM public.interviews
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND score_overall IS NOT NULL
    AND score_overall > 0;

  v_streak := 0;
  v_prev_date := CURRENT_DATE;

  FOR v_date IN (
    SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::DATE
    FROM public.interviews
    WHERE user_id = p_user_id
    ORDER BY 1 DESC
  ) LOOP
    IF v_prev_date = CURRENT_DATE THEN
      IF v_date = CURRENT_DATE OR v_date = CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := v_streak + 1;
        v_prev_date := v_date;
      ELSE
        EXIT;
      END IF;
    ELSIF v_date = v_prev_date - INTERVAL '1 day' THEN
      v_streak := v_streak + 1;
      v_prev_date := v_date;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_total_sessions, ROUND(v_total_hours, 1), v_streak, ROUND(v_avg_score, 1);
END;
$$ LANGUAGE plpgsql STABLE;

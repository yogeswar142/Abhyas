-- Add 'incomplete' as a recognised interview status.
-- The interviews.status column is VARCHAR(50) with no CHECK constraint, so
-- this migration is documentation-only; no schema DDL change is required.
--
-- Semantics:
--   incomplete  – the student exited mid-session or the bridge/model was lost.
--                 Scores are not written (or written as 0) and this status is
--                 explicitly EXCLUDED from avg_score calculations in
--                 get_user_stats() which only averages 'completed' rows.
--
-- Update get_user_stats to make the filter explicit (was already correct, but
-- this makes the intent clear).
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
  -- Count all sessions (including incomplete) for the total sessions metric
  SELECT COUNT(*) INTO v_total_sessions
  FROM public.interviews
  WHERE user_id = p_user_id;

  -- Calculate total hours from completed sessions only (duration in minutes)
  SELECT COALESCE(SUM(duration)::NUMERIC / 60.0, 0.0) INTO v_total_hours
  FROM public.interviews
  WHERE user_id = p_user_id AND status = 'completed';

  -- Average score from completed sessions only — 'incomplete' sessions are
  -- explicitly excluded so they never drag down (or inflate) the readiness score.
  SELECT COALESCE(AVG(score_overall), 0.0) INTO v_avg_score
  FROM public.interviews
  WHERE user_id = p_user_id AND status = 'completed';

  -- Calculate active streak (consecutive days with at least one interview of any status)
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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_stats(UUID) TO anon, authenticated, service_role;

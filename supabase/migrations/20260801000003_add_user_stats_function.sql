-- Function to retrieve stats for a specific user in a single request to minimize DB load
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
  -- Count total sessions
  SELECT COUNT(*) INTO v_total_sessions
  FROM public.interviews
  WHERE user_id = p_user_id;

  -- Calculate total hours (duration is in minutes)
  SELECT COALESCE(SUM(duration)::NUMERIC / 60.0, 0.0) INTO v_total_hours
  FROM public.interviews
  WHERE user_id = p_user_id AND status = 'completed';

  -- Calculate average overall score
  SELECT COALESCE(AVG(score_overall), 0.0) INTO v_avg_score
  FROM public.interviews
  WHERE user_id = p_user_id AND status = 'completed';
  
  -- Calculate active streak (consecutive days with at least one interview)
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

-- Grant EXECUTE permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_user_stats(UUID) TO anon, authenticated, service_role;

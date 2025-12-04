-- Migration: Add Generic Promotion Pricing Engine
-- This enables fully configurable promotions stored in DB without code changes

-- Step 1: Create enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'day_group') THEN
    CREATE TYPE day_group AS ENUM ('ALL', 'WEEKDAY', 'WEEKEND');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'price_action_type') THEN
    CREATE TYPE price_action_type AS ENUM ('FIXED_PRICE', 'DISCOUNT_THB', 'DISCOUNT_PERCENT');
  END IF;
END$$;

-- Step 2: Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  description text,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  priority    int NOT NULL DEFAULT 100,
  stacking    text NOT NULL DEFAULT 'EXCLUSIVE',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Create promotion_bands table
CREATE TABLE IF NOT EXISTS promotion_bands (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id     uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  day_group        day_group NOT NULL,
  dow_mask         int NOT NULL DEFAULT 127, -- Bitmask: 1=Sun, 2=Mon, 4=Tue, 8=Wed, 16=Thu, 32=Fri, 64=Sat, 127=All
  time_from        time NOT NULL,
  time_to          time NOT NULL,
  course_id        int NULL,
  player_segment   text NULL, -- 'THAI', 'FOREIGN_WP', 'FOREIGN_OTHER', 'ALL', or NULL
  min_lead_days    int NULL,
  max_lead_days    int NULL,
  min_players      int NULL,
  max_players      int NULL,
  action_type      price_action_type NOT NULL,
  action_value     numeric(10,2) NOT NULL,
  includes_green_fee boolean NOT NULL DEFAULT true,
  includes_caddy     boolean NOT NULL DEFAULT true,
  includes_cart      boolean NOT NULL DEFAULT true,
  extra_conditions jsonb NULL,
  extra_meta       jsonb NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Step 4: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates ON promotions(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_priority ON promotions(priority);
CREATE INDEX IF NOT EXISTS idx_promotion_bands_promotion_id ON promotion_bands(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_bands_day_group ON promotion_bands(day_group);
CREATE INDEX IF NOT EXISTS idx_promotion_bands_time_range ON promotion_bands(time_from, time_to);

-- Step 5: Create RPC function get_best_price()
CREATE OR REPLACE FUNCTION get_best_price(
  p_tee_date date,
  p_tee_time time,
  p_base_price numeric,
  p_member_segment text,
  p_course_id int,
  p_num_players int
)
RETURNS TABLE (
  final_price numeric,
  base_price numeric,
  promotion_code text,
  promotion_name text,
  includes_green_fee boolean,
  includes_caddy boolean,
  includes_cart boolean,
  source text
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_day_group day_group;
  v_lead_days int;
  v_dow int; -- Day of week: 0=Sunday, 1=Monday, ..., 6=Saturday
  v_dow_bit int; -- Bit position for dow_mask
  v_best_band record;
  v_final_price numeric;
BEGIN
  -- Set base values
  base_price := p_base_price;
  final_price := p_base_price;
  source := 'BASE';
  promotion_code := NULL;
  promotion_name := NULL;
  includes_green_fee := true;
  includes_caddy := true;
  includes_cart := true;

  -- Calculate day of week (PostgreSQL: 0=Sunday, 6=Saturday)
  v_dow := EXTRACT(DOW FROM p_tee_date);
  -- Convert to bit position: 0=Sun(1), 1=Mon(2), 2=Tue(4), 3=Wed(8), 4=Thu(16), 5=Fri(32), 6=Sat(64)
  v_dow_bit := CASE v_dow
    WHEN 0 THEN 1   -- Sunday
    WHEN 1 THEN 2   -- Monday
    WHEN 2 THEN 4   -- Tuesday
    WHEN 3 THEN 8   -- Wednesday
    WHEN 4 THEN 16  -- Thursday
    WHEN 5 THEN 32  -- Friday
    WHEN 6 THEN 64  -- Saturday
    ELSE 127
  END;

  -- Determine day_group
  IF v_dow = 0 OR v_dow = 6 THEN
    v_day_group := 'WEEKEND';
  ELSE
    v_day_group := 'WEEKDAY';
  END IF;

  -- Calculate lead days
  v_lead_days := p_tee_date - CURRENT_DATE;

  -- Find the best matching promotion band
  SELECT 
    pb.*,
    p.code as promo_code,
    p.name as promo_name,
    p.priority
  INTO v_best_band
  FROM promotion_bands pb
  INNER JOIN promotions p ON pb.promotion_id = p.id
  WHERE 
    -- Promotion is active
    p.is_active = true
    -- Date range check
    AND p.start_date <= p_tee_date
    AND p.end_date >= p_tee_date
    -- Time range check
    AND pb.time_from <= p_tee_time
    AND pb.time_to >= p_tee_time
    -- Day group check (ALL matches everything, otherwise must match)
    AND (pb.day_group = 'ALL' OR pb.day_group = v_day_group)
    -- Day of week mask check (dow_mask & v_dow_bit must be non-zero)
    AND (pb.dow_mask & v_dow_bit) > 0
    -- Course check (NULL means all courses)
    AND (pb.course_id IS NULL OR pb.course_id = p_course_id)
    -- Player segment check (NULL or 'ALL' means all segments)
    AND (pb.player_segment IS NULL OR pb.player_segment = 'ALL' OR pb.player_segment = p_member_segment)
    -- Lead days check
    AND (pb.min_lead_days IS NULL OR pb.min_lead_days <= v_lead_days)
    AND (pb.max_lead_days IS NULL OR pb.max_lead_days >= v_lead_days)
    -- Player count check
    AND (pb.min_players IS NULL OR pb.min_players <= p_num_players)
    AND (pb.max_players IS NULL OR pb.max_players >= p_num_players)
  ORDER BY p.priority ASC, pb.action_value DESC
  LIMIT 1;

  -- If we found a matching band, apply the promotion
  IF v_best_band IS NOT NULL THEN
    promotion_code := v_best_band.promo_code;
    promotion_name := v_best_band.promo_name;
    includes_green_fee := v_best_band.includes_green_fee;
    includes_caddy := v_best_band.includes_caddy;
    includes_cart := v_best_band.includes_cart;
    source := 'PROMOTION';

    -- Apply pricing action
    CASE v_best_band.action_type
      WHEN 'FIXED_PRICE' THEN
        v_final_price := v_best_band.action_value;
      WHEN 'DISCOUNT_THB' THEN
        v_final_price := GREATEST(0, p_base_price - v_best_band.action_value);
      WHEN 'DISCOUNT_PERCENT' THEN
        v_final_price := GREATEST(0, p_base_price * (1 - v_best_band.action_value / 100));
      ELSE
        v_final_price := p_base_price;
    END CASE;

    final_price := v_final_price;
  END IF;

  RETURN NEXT;
END;
$$;

-- Step 6: Grant permissions (adjust as needed for your RLS policies)
-- ALTER FUNCTION get_best_price OWNER TO postgres;
-- GRANT EXECUTE ON FUNCTION get_best_price TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_best_price TO anon;

-- Step 7: Add comments for documentation
COMMENT ON TABLE promotions IS 'Stores promotion definitions with date ranges and priority';
COMMENT ON TABLE promotion_bands IS 'Stores promotion rules/conditions that determine when a promotion applies';
COMMENT ON FUNCTION get_best_price IS 'Calculates the best price for a tee time booking considering all active promotions';

-- Step 8: Seed example promotion - Year-End 2024
-- Note: Adjust dates as needed for current year
INSERT INTO promotions (code, name, description, start_date, end_date, priority, is_active)
VALUES (
  'YEAR_END_2024',
  'Year-End Package 2024',
  'Special year-end pricing for Thai and Work Permit holders',
  '2024-12-01',
  '2024-12-31',
  10,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  priority = EXCLUDED.priority,
  is_active = EXCLUDED.is_active;

-- Get the promotion ID for bands
DO $$
DECLARE
  v_promo_id uuid;
BEGIN
  SELECT id INTO v_promo_id FROM promotions WHERE code = 'YEAR_END_2024';
  
  IF v_promo_id IS NOT NULL THEN
    -- Delete existing bands for this promotion to avoid duplicates
    DELETE FROM promotion_bands WHERE promotion_id = v_promo_id;
    
    -- Weekday 06:00-13:00, FIXED_PRICE 1650
    INSERT INTO promotion_bands (
      promotion_id, day_group, dow_mask, time_from, time_to,
      player_segment, action_type, action_value,
      includes_green_fee, includes_caddy, includes_cart
    ) VALUES (
      v_promo_id, 'WEEKDAY', 62, '06:00:00', '13:00:00', -- 62 = Mon-Fri (2+4+8+16+32)
      'ALL', 'FIXED_PRICE', 1650.00,
      true, true, true
    );

    -- Weekday 13:00-23:59, FIXED_PRICE 1550
    INSERT INTO promotion_bands (
      promotion_id, day_group, dow_mask, time_from, time_to,
      player_segment, action_type, action_value,
      includes_green_fee, includes_caddy, includes_cart
    ) VALUES (
      v_promo_id, 'WEEKDAY', 62, '13:00:00', '23:59:59',
      'ALL', 'FIXED_PRICE', 1550.00,
      true, true, true
    );

    -- Weekend 06:00-10:30, FIXED_PRICE 2350
    INSERT INTO promotion_bands (
      promotion_id, day_group, dow_mask, time_from, time_to,
      player_segment, action_type, action_value,
      includes_green_fee, includes_caddy, includes_cart
    ) VALUES (
      v_promo_id, 'WEEKEND', 65, '06:00:00', '10:30:00', -- 65 = Sat+Sun (1+64)
      'ALL', 'FIXED_PRICE', 2350.00,
      true, true, true
    );

    -- Weekend 10:30-23:59, FIXED_PRICE 1850
    INSERT INTO promotion_bands (
      promotion_id, day_group, dow_mask, time_from, time_to,
      player_segment, action_type, action_value,
      includes_green_fee, includes_caddy, includes_cart
    ) VALUES (
      v_promo_id, 'WEEKEND', 65, '10:30:00', '23:59:59',
      'ALL', 'FIXED_PRICE', 1850.00,
      true, true, true
    );
  END IF;
END$$;


-- Migration: Add Golf Courses Management
-- Based on Uniland Golf & Resort structure (Course A, Course B, etc.)

-- Step 1: Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  par_total INTEGER,
  yardage_total INTEGER,
  hole_count INTEGER NOT NULL DEFAULT 18,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Create course_holes table for detailed hole information
CREATE TABLE IF NOT EXISTS course_holes (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  par INTEGER NOT NULL,
  yardage INTEGER,
  handicap INTEGER,
  description TEXT,
  highlight TEXT, -- Special features like "Hole 7: Par 4, 336-yard challenge with blind shot"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, hole_number)
);

-- Step 3: Add course_id to tee_times table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tee_times' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE tee_times ADD COLUMN course_id BIGINT REFERENCES courses(id);
    CREATE INDEX IF NOT EXISTS idx_tee_times_course_id ON tee_times(course_id);
  END IF;
END$$;

-- Step 4: Add course_id to bookings table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'course_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN course_id BIGINT REFERENCES courses(id);
    CREATE INDEX IF NOT EXISTS idx_bookings_course_id ON bookings(course_id);
  END IF;
END$$;

-- Step 5: Insert Course A based on Uniland Golf reference
-- Reference: http://www.unilandgolf.com/coursea.html
INSERT INTO courses (code, name, description, par_total, yardage_total, hole_count, is_active, display_order)
VALUES (
  'COURSE_A',
  'Course A',
  'Distinct levels of "Shot of the day" that are played according to skill, not according to the eye. Alternated with small and large category trees and perfectly manicured lawns. The cool tropical waters around them may become an obstacle for some people.',
  NULL, -- Will be calculated from holes
  NULL, -- Will be calculated from holes
  9, -- Based on the website showing 9 holes (a1.html through a9.html)
  true,
  1
)
ON CONFLICT (code) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

-- Step 6: Insert Course A holes (based on website reference)
-- Note: Only Hole 7 details are provided, others are placeholder
-- Hole 7: Par 4, 336-yard long challenge with blind shot
INSERT INTO course_holes (course_id, hole_number, par, yardage, description, highlight)
SELECT 
  c.id,
  hole_num,
  CASE hole_num WHEN 7 THEN 4 ELSE NULL END,
  CASE hole_num WHEN 7 THEN 336 ELSE NULL END,
  CASE 
    WHEN hole_num = 7 THEN 'You will drive 180 yards across the big pond and face a blind shot where the flag will be visible, but not the green. This is a challenge to you pros.'
    ELSE NULL
  END,
  CASE 
    WHEN hole_num = 7 THEN 'Hole 7 is a Par 4, 336-yard long challenge. You will drive 180 yards across the big pond and face a blind shot where the flag will be visible, but not the green. This is a challenge to you pros.'
    ELSE NULL
  END
FROM courses c
CROSS JOIN generate_series(1, 9) AS hole_num
WHERE c.code = 'COURSE_A'
ON CONFLICT (course_id, hole_number) DO UPDATE
SET 
  par = EXCLUDED.par,
  yardage = EXCLUDED.yardage,
  description = EXCLUDED.description,
  highlight = EXCLUDED.highlight;

-- Step 7: Update course totals based on holes
UPDATE courses c
SET 
  par_total = (
    SELECT SUM(par) 
    FROM course_holes 
    WHERE course_id = c.id AND par IS NOT NULL
  ),
  yardage_total = (
    SELECT SUM(yardage) 
    FROM course_holes 
    WHERE course_id = c.id AND yardage IS NOT NULL
  )
WHERE c.code = 'COURSE_A';

-- Step 8: Enable RLS on courses table
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_holes ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for courses
CREATE POLICY "Authenticated users can view courses"
  ON courses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage courses"
  ON courses FOR ALL
  USING (auth.role() = 'authenticated');

-- Step 10: Create RLS policies for course_holes
CREATE POLICY "Authenticated users can view course holes"
  ON course_holes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage course holes"
  ON course_holes FOR ALL
  USING (auth.role() = 'authenticated');

-- Step 11: Set default course_id for existing records
UPDATE tee_times SET course_id = (SELECT id FROM courses WHERE code = 'COURSE_A' LIMIT 1) WHERE course_id IS NULL;
UPDATE bookings SET course_id = (SELECT id FROM courses WHERE code = 'COURSE_A' LIMIT 1) WHERE course_id IS NULL;


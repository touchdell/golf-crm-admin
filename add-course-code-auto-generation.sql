-- Migration: Add auto-generation for course codes
-- This ensures course codes are unique and sequential (CR0001, CR0002, etc.)

-- Step 1: Create function to generate course code
CREATE OR REPLACE FUNCTION generate_course_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_id INTEGER;
  new_code VARCHAR(50);
BEGIN
  -- Find the maximum number from existing codes that match pattern CR####
  -- Pattern: CR0001, CR0002, CR0003, etc.
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'CR(\d+)') AS INTEGER)), 0) + 1
  INTO next_id
  FROM courses
  WHERE code ~ '^CR\d+$';
  
  -- Generate new code with zero-padding (4 digits)
  new_code := CONCAT('CR', LPAD(next_id::TEXT, 4, '0'));
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update existing courses to use CR#### format if they don't already
-- This migrates existing courses like 'COURSE_A' to 'CR0001'
DO $$
DECLARE
  course_record RECORD;
  new_code VARCHAR(50);
  counter INTEGER := 1;
  max_existing INTEGER;
BEGIN
  -- First, find the highest existing CR#### code number
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'CR(\d+)') AS INTEGER)), 0)
  INTO max_existing
  FROM courses
  WHERE code ~ '^CR\d+$';
  
  -- Start counter from max_existing + 1
  counter := max_existing + 1;
  
  -- Update courses that don't match CR#### pattern
  FOR course_record IN 
    SELECT id, code FROM courses WHERE code !~ '^CR\d+$' ORDER BY id
  LOOP
    -- Generate sequential code
    new_code := CONCAT('CR', LPAD(counter::TEXT, 4, '0'));
    
    -- Update the course code
    UPDATE courses 
    SET code = new_code 
    WHERE id = course_record.id;
    
    counter := counter + 1;
  END LOOP;
END$$;

-- Step 3: Add default value to code column using the function
-- Note: PostgreSQL doesn't support function calls in DEFAULT, so we'll handle this in application code
-- But we ensure the column remains NOT NULL and UNIQUE

-- Test the function (optional):
-- SELECT generate_course_code(); -- Should return CR0001 (or next number)


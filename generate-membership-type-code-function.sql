-- Function to generate membership type code with sequential numbers
-- Format: MT0001, MT0002, MT0003, etc.
CREATE OR REPLACE FUNCTION generate_membership_type_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_id INTEGER;
  new_code VARCHAR(50);
BEGIN
  -- Find the maximum number from existing codes that match pattern MT####
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 'MT(\d+)') AS INTEGER)), 0) + 1
  INTO next_id
  FROM membership_types
  WHERE code ~ '^MT\d+$';
  
  -- Generate new code with zero-padding (4 digits)
  new_code := CONCAT('MT', LPAD(next_id::TEXT, 4, '0'));
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;



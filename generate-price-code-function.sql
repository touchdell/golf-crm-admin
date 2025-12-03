-- Function to generate price item code with running number
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION generate_price_item_code(category_prefix VARCHAR(10))
RETURNS VARCHAR(50) AS $$
DECLARE
  next_id INTEGER;
  new_code VARCHAR(50);
BEGIN
  -- Find the highest number for this category prefix
  -- Pattern: GF0001, CT0001, CD0001, OT0001, etc.
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM category_prefix || '(\d+)') AS INTEGER)), 0) + 1
  INTO next_id
  FROM price_items
  WHERE code ~ ('^' || category_prefix || '\d+$');
  
  -- Format: PREFIX + 4-digit number (e.g., GF0001, CT0001)
  new_code := category_prefix || LPAD(next_id::TEXT, 4, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Test the function (optional):
-- SELECT generate_price_item_code('GF'); -- Should return GF0001 (or next number)
-- SELECT generate_price_item_code('CT'); -- Should return CT0001 (or next number)


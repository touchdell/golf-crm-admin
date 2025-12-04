-- Migration: Update booking status flow and add payment_status
-- This aligns with the business requirements:
-- Booking status: BOOKED → CHECKED_IN → COMPLETED/NO_SHOW/CANCELLED
-- Payment status: Tracked separately, set to PAID when payment is recorded

-- Step 1: Add payment_status column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'UNPAID';

-- Step 2: Update existing bookings based on payments
UPDATE bookings b
SET payment_status = CASE 
  WHEN EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.booking_id = b.id 
    AND p.payment_status = 'COMPLETED'
    AND (
      SELECT COALESCE(SUM(amount), 0) 
      FROM payments 
      WHERE booking_id = b.id 
      AND payment_status = 'COMPLETED'
    ) >= b.total_amount
    AND b.total_amount > 0
  ) THEN 'PAID'
  ELSE 'UNPAID'
END;

-- Step 3: Update booking status values
-- Convert PENDING → BOOKED
UPDATE bookings SET status = 'BOOKED' WHERE status = 'PENDING';

-- Convert CONFIRMED → BOOKED (if not paid) or keep as BOOKED
-- Note: CONFIRMED bookings that are paid should remain BOOKED until CHECKED_IN

-- Step 4: Create index for payment_status
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);

-- Step 5: Add comment to document the status flow
COMMENT ON COLUMN bookings.status IS 'Booking status: BOOKED (after slot chosen & confirmed), CHECKED_IN (on arrival), COMPLETED/NO_SHOW/CANCELLED (later)';
COMMENT ON COLUMN bookings.payment_status IS 'Payment status: UNPAID, PAID';


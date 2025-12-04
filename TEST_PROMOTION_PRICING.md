# Testing Promotion Pricing Engine

## Prerequisites

1. **Run the Database Migration**
   - Go to Supabase SQL Editor
   - Run the file: `add-promotions-pricing-engine.sql`
   - This creates the `promotions` and `promotion_bands` tables
   - This creates the `get_best_price()` RPC function
   - This seeds the Year-End 2024 promotion example

## How to Test

### Step 1: Verify Database Migration

1. Open Supabase Dashboard → SQL Editor
2. Run this query to check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('promotions', 'promotion_bands');
```

3. Check if RPC function exists:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_best_price';
```

4. Check if promotion was seeded:
```sql
SELECT * FROM promotions WHERE code = 'YEAR_END_2024';
SELECT * FROM promotion_bands WHERE promotion_id = (SELECT id FROM promotions WHERE code = 'YEAR_END_2024');
```

### Step 2: Test in Booking Modal

1. Go to `http://localhost:5173/tee-sheet`
2. Select a date (preferably in December 2024 for the example promotion)
3. Click on an available tee time slot
4. Select a member as the main member
5. **Look for the "Pricing" section** - it should appear between "Tee Time Details" and "Main Member"
6. The pricing section should show:
   - Base price (if different from final price)
   - Final price
   - Promotion name (if promotion applies)
   - What's included (Green Fee, Caddy, Cart)

### Step 3: Check Browser Console

Open browser DevTools (F12) and check the Console tab. You should see logs like:
- `[Pricing] Starting calculation:`
- `[Pricing] Base price calculated:`
- `[Pricing] Member segment:`
- `[Pricing] Best price result:`

### Step 4: Test Promotion Matching

To test if promotions are working:

1. **Test Weekday Morning (06:00-13:00)**:
   - Select a weekday (Mon-Fri)
   - Select a tee time between 06:00-13:00
   - Should show: Final Price = 1650 THB (if promotion matches)

2. **Test Weekday Afternoon (13:00-23:59)**:
   - Select a weekday (Mon-Fri)
   - Select a tee time between 13:00-23:59
   - Should show: Final Price = 1550 THB

3. **Test Weekend Morning (06:00-10:30)**:
   - Select a weekend (Sat-Sun)
   - Select a tee time between 06:00-10:30
   - Should show: Final Price = 2350 THB

4. **Test Weekend Afternoon (10:30-23:59)**:
   - Select a weekend (Sat-Sun)
   - Select a tee time between 10:30-23:59
   - Should show: Final Price = 1850 THB

## Troubleshooting

### Pricing Section Not Showing

1. **Check if modal is open**: Pricing only shows when BookingModal is open
2. **Check if mainMember is selected**: Pricing requires both teeTime and mainMember
3. **Check browser console**: Look for errors in `[Pricing]` logs
4. **Check if price items exist**: The system needs at least one price item (GREEN_FEE, CADDY, or CART)

### Promotion Not Applying

1. **Check date range**: Year-End 2024 promotion is only active Dec 1-31, 2024
2. **Check time range**: Make sure tee time matches the promotion band time ranges
3. **Check day of week**: Weekday promotions only work Mon-Fri, Weekend only Sat-Sun
4. **Check RPC function**: Test the RPC directly:
```sql
SELECT * FROM get_best_price(
  '2024-12-15'::date,  -- tee date
  '10:00:00'::time,     -- tee time
  2000.00,              -- base price
  'ALL',                -- member segment
  1,                    -- course ID
  2                     -- num players
);
```

### RPC Function Error

If you see errors about `get_best_price` not existing:
1. Make sure you ran the migration SQL file
2. Check if the function was created:
```sql
\df get_best_price
```
3. Grant execute permissions if needed:
```sql
GRANT EXECUTE ON FUNCTION get_best_price TO authenticated;
GRANT EXECUTE ON FUNCTION get_best_price TO anon;
```

## Expected Behavior

- **With Promotion**: Shows green box with "🎉 Promotion Applied" message
- **Without Promotion**: Shows gray box with base pricing
- **Loading**: Shows "Calculating pricing..." spinner
- **Error**: Falls back to base pricing and logs error to console



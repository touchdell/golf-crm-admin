# Generic Promotion Pricing Engine

## Overview

This implementation provides a fully generic promotion pricing engine that allows all future promotions to be managed entirely through the database and admin UI, without requiring any backend code changes.

## Architecture

### Database Schema

1. **`promotions` table**: Stores promotion definitions
   - `code`: Unique promotion code
   - `name`: Display name
   - `start_date` / `end_date`: Active date range
   - `priority`: Lower number = higher priority (wins when multiple promotions match)
   - `is_active`: Enable/disable promotion

2. **`promotion_bands` table**: Stores promotion rules/conditions
   - `day_group`: WEEKDAY, WEEKEND, or ALL
   - `dow_mask`: Day of week bitmask (1=Sun, 2=Mon, 4=Tue, 8=Wed, 16=Thu, 32=Fri, 64=Sat, 127=All)
   - `time_from` / `time_to`: Time range
   - `course_id`: Specific course (NULL = all courses)
   - `player_segment`: THAI, FOREIGN_WP, FOREIGN_OTHER, ALL, or NULL
   - `min_lead_days` / `max_lead_days`: Booking advance requirements
   - `min_players` / `max_players`: Group size requirements
   - `action_type`: FIXED_PRICE, DISCOUNT_THB, or DISCOUNT_PERCENT
   - `action_value`: Price or discount amount
   - `includes_green_fee`, `includes_caddy`, `includes_cart`: What's included

### Pricing Function

**`get_best_price()` RPC function**:
- Automatically selects the best matching promotion based on:
  - Date and time
  - Day of week (weekday/weekend)
  - Member segment
  - Course ID
  - Number of players
  - Lead days (advance booking)
- Returns the final price, promotion details, and what's included

### Frontend Integration

**`priceService.getBestPrice()`**:
- TypeScript service that calls the RPC function
- Maps membership type to member segment
- Returns structured pricing information

**`BookingModal`**:
- Automatically calculates and displays pricing when booking
- Shows promotion name and details when a promotion applies
- Displays base price vs final price when promotion is active

## Usage

### Adding a New Promotion

1. **Insert into `promotions` table**:
```sql
INSERT INTO promotions (code, name, description, start_date, end_date, priority, is_active)
VALUES ('SUMMER_2025', 'Summer Special', 'Summer promotion', '2025-06-01', '2025-08-31', 20, true);
```

2. **Add promotion bands** (rules):
```sql
-- Get promotion ID
SELECT id FROM promotions WHERE code = 'SUMMER_2025';

-- Add band for weekday mornings
INSERT INTO promotion_bands (
  promotion_id, day_group, dow_mask, time_from, time_to,
  player_segment, action_type, action_value,
  includes_green_fee, includes_caddy, includes_cart
) VALUES (
  '<promotion_id>', 'WEEKDAY', 62, '06:00:00', '12:00:00',
  'ALL', 'DISCOUNT_PERCENT', 15.00,  -- 15% discount
  true, true, true
);
```

### Promotion Priority

- Lower `priority` number = higher priority
- When multiple promotions match, the one with lowest priority wins
- Example: Priority 10 beats priority 20

### Action Types

1. **FIXED_PRICE**: Sets a fixed price regardless of base price
   - Example: `action_value = 1500` → Final price = 1500 THB

2. **DISCOUNT_THB**: Subtracts a fixed amount from base price
   - Example: `action_value = 200` → Final price = base_price - 200 THB

3. **DISCOUNT_PERCENT**: Applies a percentage discount
   - Example: `action_value = 15` → Final price = base_price * (1 - 15/100) = base_price * 0.85

### Member Segments

The system maps membership types to segments:
- **THAI**: Thai members
- **FOREIGN_WP**: Foreign members with work permit
- **FOREIGN_OTHER**: Other foreign members
- **ALL**: All members (or NULL in band)

You can customize the mapping in `priceService.mapMembershipTypeToSegment()`.

## Example: Year-End 2024 Promotion

The migration includes a seed example:

- **Promotion**: Year-End Package 2024
- **Date Range**: Dec 1-31, 2024
- **Priority**: 10 (high priority)
- **Bands**:
  - Weekday 06:00-13:00: 1650 THB fixed
  - Weekday 13:00-23:59: 1550 THB fixed
  - Weekend 06:00-10:30: 2350 THB fixed
  - Weekend 10:30-23:59: 1850 THB fixed

## Testing

1. Run the migration: `add-promotions-pricing-engine.sql`
2. Open booking modal on tee sheet
3. Select a member and tee time
4. Check if promotion pricing is displayed
5. Verify promotion name and final price are shown

## Future Enhancements

- Admin UI for managing promotions (CRUD operations)
- Promotion preview/validation before saving
- Promotion history/audit log
- Promotion stacking (when `stacking = 'STACKABLE'`)
- More complex conditions via `extra_conditions` JSONB field



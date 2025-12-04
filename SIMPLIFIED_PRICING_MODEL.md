# Simplified Pricing Model

## Overview

The pricing model has been simplified to avoid complexity. The main member is responsible for paying the total booking fee, which includes their own fee plus fees for all additional players.

---

## Pricing Formula

```
Main Member Fee = Base Price Per Player
Additional Players Fee = Base Price Per Player × Number of Additional Players
Total Amount = Main Member Fee + Additional Players Fee
```

**Simplified:**
```
Total Amount = Base Price Per Player × Total Players
```

Where:
- **Base Price Per Player** = Green Fee + Caddy + Cart (sum of active price items)
- **Total Players** = 1 (main member) + Number of Additional Players

---

## Example Calculation

### Scenario: Booking with 1 main member + 2 additional players

**Price Items:**
- Green Fee: 50 THB
- Caddy: 20 THB
- Cart: 30 THB

**Calculation:**
- Base Price Per Player = 50 + 20 + 30 = **100 THB**
- Main Member Fee = 100 THB
- Additional Players Fee = 100 × 2 = 200 THB
- **Total Amount = 100 + 200 = 300 THB**

**Display:**
```
Main Member Fee:           100.00 THB
Additional Players (2 × 100.00):  200.00 THB
─────────────────────────────────────────
Total Amount:              300.00 THB
```

---

## Implementation Details

### Frontend (BookingModal.tsx)

1. **Pricing Calculation:**
   - Fetches active price items (GREEN_FEE, CADDY, CART)
   - Calculates base price per player = sum of all active price items
   - Calculates total: `basePricePerPlayer × (1 + additionalPlayers.length)`

2. **Display:**
   - Shows breakdown:
     - Main Member Fee
     - Additional Players Fee (if any)
     - Total Amount
   - Includes note: "Main member pays for all players in this booking"

### Backend (bookingService.ts)

1. **Booking Items Creation:**
   - Creates booking items for each service (GREEN_FEE, CADDY, CART)
   - Each item has:
     - `quantity` = total players (main + additional)
     - `unit_price` = price per player for that service
     - `total_price` = unit_price × quantity

2. **Total Amount:**
   - Stored in `bookings.total_amount`
   - Represents the total amount the main member needs to pay

---

## Benefits

✅ **Simplified Logic:**
- No complex promotion engine per player
- Straightforward calculation
- Easy to understand and maintain

✅ **Clear Responsibility:**
- Main member is clearly responsible for payment
- No confusion about who pays what

✅ **Consistent Pricing:**
- Same price per player regardless of role
- Fair and transparent

---

## Database Structure

### Booking Items

Each booking item represents a service charge:

```sql
booking_items:
  - booking_id: FK to bookings
  - price_item_id: FK to price_items (GREEN_FEE, CADDY, or CART)
  - quantity: Total players (main + additional)
  - unit_price: Price per player for this service
  - total_price: unit_price × quantity
```

### Example Booking Items

For a booking with 3 players (1 main + 2 additional) where base price = 100 THB:

| Service | Quantity | Unit Price | Total Price |
|---------|----------|------------|-------------|
| Green Fee | 3 | 50 THB | 150 THB |
| Caddy | 3 | 20 THB | 60 THB |
| Cart | 3 | 30 THB | 90 THB |
| **Total** | | | **300 THB** |

---

## Migration Notes

### What Changed

1. **Removed Promotion Engine Integration:**
   - No longer calls `getBestPrice()` RPC function
   - No promotion matching logic
   - Simplified to base pricing only

2. **Updated Pricing Display:**
   - Shows clear breakdown instead of promotion messages
   - Displays main member fee + additional players fee

3. **Simplified Booking Items:**
   - Always uses base pricing
   - Quantity = total players
   - No promotion-specific booking items

### Backward Compatibility

- Existing bookings with promotions are still valid
- New bookings use simplified pricing model
- Database schema unchanged (no migrations needed)

---

## Testing

### Test Cases

1. **Single Player Booking:**
   - Main member only
   - Total = base price per player

2. **Multi-Player Booking:**
   - Main member + additional players
   - Total = base price × total players

3. **Price Items:**
   - Verify all active price items are included
   - Verify inactive items are excluded

4. **Display:**
   - Verify breakdown shows correctly
   - Verify total matches calculation

---

## Future Enhancements (Optional)

If needed in the future, you could add:

1. **Different Pricing for Additional Players:**
   - Add a separate price item for "Additional Player Fee"
   - Could be different from main member fee

2. **Discounts:**
   - Add discount percentage for group bookings
   - Apply to total amount

3. **Promotions (Simplified):**
   - Apply promotions to total amount (not per player)
   - Simpler than per-player promotions

---

## Summary

The simplified pricing model:
- ✅ Charges main member for all players
- ✅ Uses straightforward calculation: base price × total players
- ✅ Easy to understand and maintain
- ✅ Clear payment responsibility
- ✅ No complex promotion logic

**Formula:** `Total = Base Price Per Player × Total Players`


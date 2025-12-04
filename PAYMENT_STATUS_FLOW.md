# Payment Status Change Flow

## When Payment Status Changes

Payment status (`UNPAID` → `PAID`) changes in the following scenarios:

### 1. **When a Payment is Recorded** ✅
**Location:** `src/services/paymentService.ts` → `createPayment()`

**Flow:**
1. User clicks "Record Payment" in Booking Detail Drawer
2. `createPayment()` is called
3. Payment record is inserted into `payments` table with `payment_status = 'COMPLETED'`
4. `checkAndUpdateBookingStatus()` is called automatically
5. Function calculates: `totalPaid >= totalAmount - 0.01`
6. Updates `bookings.payment_status` to `'PAID'` or `'UNPAID'`
7. React Query invalidates `['bookings']` queries
8. UI refetches and displays updated status

**Code:**
```typescript
// In createPayment()
await checkAndUpdateBookingStatus(payload.bookingId);
```

### 2. **When Booking Items are Added** ✅
**Location:** `src/services/bookingService.ts` → `addBookingItem()`

**Flow:**
1. User adds a product/service to booking
2. `addBookingItem()` is called
3. Booking item is inserted into `booking_items` table
4. `recalculateBookingTotal()` updates `bookings.total_amount`
5. Payment status is recalculated: `totalPaid >= newTotalAmount`
6. Updates `bookings.payment_status` accordingly
7. React Query invalidates queries
8. UI updates

**Code:**
```typescript
// In addBookingItem()
await recalculateBookingTotal(payload.bookingId);
// Then recalculates payment status
```

### 3. **When Booking Items are Removed** ✅
**Location:** `src/services/bookingService.ts` → `removeBookingItem()`

**Flow:**
1. User removes a product/service from booking
2. `removeBookingItem()` is called
3. Booking item is deleted from `booking_items` table
4. `recalculateBookingTotal()` updates `bookings.total_amount`
5. Payment status is recalculated: `totalPaid >= newTotalAmount`
6. Updates `bookings.payment_status` accordingly
7. React Query invalidates queries
8. UI updates

**Code:**
```typescript
// In removeBookingItem()
await recalculateBookingTotal(bookingId);
// Then recalculates payment status
```

### 4. **When Fetching Bookings (Dynamic Calculation)** ✅
**Location:** `src/services/bookingService.ts` → `getBookings()`, `getBookingById()`

**Flow:**
1. UI fetches bookings list or booking detail
2. `calculatePaymentStatusBatch()` or `calculatePaymentStatus()` is called
3. Fetches all `COMPLETED` payments for the booking(s)
4. Calculates: `totalPaid >= totalAmount - 0.01`
5. Returns dynamic payment status (not from stored value)
6. UI displays the calculated status

**Code:**
```typescript
// In getBookings()
const paymentStatusMap = await calculatePaymentStatusBatch(bookingIds, bookingTotals);
```

## Payment Status Calculation Logic

```typescript
const isPaid = totalAmount <= 0 || totalPaid >= totalAmount - 0.01;
const paymentStatus = isPaid ? 'PAID' : 'UNPAID';
```

**Rules:**
- If `totalAmount <= 0` → Always `PAID` (no payment needed)
- If `totalPaid >= totalAmount - 0.01` → `PAID` (allows 1 cent rounding tolerance)
- Otherwise → `UNPAID`

## Current Issues

### Issue 1: Dynamic Calculation May Not Be Working
- The UI calculates payment status dynamically when fetching bookings
- But the stored `payment_status` in database might be out of sync
- **Solution:** Ensure dynamic calculation always runs and overrides stored value

### Issue 2: Query Invalidation May Not Trigger Refetch
- After payment is created, queries are invalidated
- But React Query might not refetch immediately
- **Solution:** Added `refetchQueries()` to force immediate refetch

### Issue 3: Timing Issue
- Payment might not be committed before status calculation
- **Solution:** Added 100ms delay after payment creation

## Debugging

Check browser console for these logs:
1. `"Payment created successfully, invalidating queries"` - Payment was created
2. `"Updating payment status"` - Status update attempt
3. `"Calculating payment status for bookings"` - Dynamic calculation started
4. `"Payment totals by booking"` - Shows total paid per booking
5. `"Payment status calculated"` - Shows calculated status for each booking

## Expected Behavior

1. **Create booking** → `payment_status = UNPAID` (default)
2. **Add items** → `total_amount` increases → `payment_status` recalculates
3. **Record payment** → `payment_status` updates to `PAID` if fully paid
4. **Remove items** → `total_amount` decreases → `payment_status` recalculates
5. **View booking list** → Status is calculated dynamically from actual payments



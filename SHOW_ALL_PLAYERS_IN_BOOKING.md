# Show All Players in Each Booking - Current Status & Solution

## 🎯 User Request
> "i consider to show all list of user in each booking, to make it clear the member number and member id is not duplicate"

## 📊 Current Implementation

### **What We Have Now:**

1. **Database Schema** (`bookings` table):
   ```sql
   CREATE TABLE bookings (
     id SERIAL PRIMARY KEY,
     member_id INTEGER NOT NULL,        -- ✅ Main member only
     player_count INTEGER NOT NULL,     -- ✅ Total count (e.g., 3)
     -- ❌ Additional players NOT stored individually
   );
   ```

2. **Tee Sheet Display** (`TeeSheetPage.tsx`):
   - Shows **only main member** from each booking
   - Example: `07:00 - 07:15` shows `"John Doe"` (main member only)
   - Does **not** show additional players like `"Jane Doe, Bob Smith"`

3. **Booking Detail Page** (`BookingDetailDrawer.tsx`):
   - Shows all players when viewing a single booking
   - But this requires clicking into the booking detail

### **Problem:**
- **Tee sheet cannot show all players** because additional players are not stored in the database
- Only `member_id` (main) and `player_count` (total) are stored
- We cannot verify duplicate member IDs visually on the tee sheet

---

## ✅ Solution: Store All Players

### **Option 1: Add `booking_players` Junction Table** (Recommended)

**Schema Change:**
```sql
-- New table to store all players in each booking
CREATE TABLE booking_players (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_main_player BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, member_id) -- Prevent duplicate members in same booking
);

-- Index for faster queries
CREATE INDEX idx_booking_players_booking_id ON booking_players(booking_id);
CREATE INDEX idx_booking_players_member_id ON booking_players(member_id);
```

**Benefits:**
- ✅ Store all players (main + additional) individually
- ✅ Query all players for a tee time slot easily
- ✅ Display full player list on tee sheet
- ✅ Verify no duplicate member IDs visually
- ✅ Maintain referential integrity

**Changes Required:**

1. **Migration Script** (`add-booking-players-table.sql`):
   ```sql
   -- Create booking_players table
   CREATE TABLE IF NOT EXISTS booking_players (
     id SERIAL PRIMARY KEY,
     booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
     member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
     is_main_player BOOLEAN NOT NULL DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(booking_id, member_id)
   );

   -- Migrate existing bookings (main member only)
   INSERT INTO booking_players (booking_id, member_id, is_main_player)
   SELECT id, member_id, TRUE
   FROM bookings
   ON CONFLICT DO NOTHING;

   -- RLS policies
   ALTER TABLE booking_players ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Authenticated users can view booking_players"
     ON booking_players FOR SELECT
     USING (auth.uid() IS NOT NULL);

   CREATE POLICY "Authenticated users can insert booking_players"
     ON booking_players FOR INSERT
     WITH CHECK (auth.uid() IS NOT NULL);

   CREATE POLICY "Authenticated users can update booking_players"
     ON booking_players FOR UPDATE
     USING (auth.uid() IS NOT NULL)
     WITH CHECK (auth.uid() IS NOT NULL);

   CREATE POLICY "Authenticated users can delete booking_players"
     ON booking_players FOR DELETE
     USING (auth.uid() IS NOT NULL);
   ```

2. **Update `bookingService.ts`**:
   ```typescript
   export const createBooking = async (payload: CreateBookingRequest): Promise<Booking> => {
     // ... (existing tee_time logic)

     // Create booking record
     const { data: createdBooking } = await supabase
       .from('bookings')
       .insert(bookingData)
       .select()
       .single();

     // ✅ NEW: Insert all players into booking_players table
     const playersToInsert = payload.players.map((p) => ({
       booking_id: createdBooking.id,
       member_id: p.memberId,
       is_main_player: p.isMainPlayer || false,
     }));

     const { error: playersError } = await supabase
       .from('booking_players')
       .insert(playersToInsert);

     if (playersError) {
       // Rollback booking if players insert fails
       await supabase.from('bookings').delete().eq('id', createdBooking.id);
       throw new Error(`Failed to add players: ${playersError.message}`);
     }

     return { ... };
   };
   ```

3. **Update `teeTimeService.ts`**:
   ```typescript
   export const getTeeTimes = async (date: string, courseId?: number): Promise<TeeTime[]> => {
     // ... (existing config and slot generation)

     // ✅ NEW: Get all players from all bookings for this date
     const { data: allPlayers, error: playersError } = await supabase
       .from('booking_players')
       .select(`
         booking_id,
         member_id,
         is_main_player,
         members!booking_players_member_id_fkey (
           id,
           first_name,
           last_name,
           member_code
         ),
         bookings!booking_players_booking_id_fkey (
           booking_time,
           booking_date,
           status
         )
       `)
       .eq('bookings.booking_date', date)
       .in('bookings.status', ['BOOKED', 'CHECKED_IN']);

     // Group players by booking_time
     const playersByTime = new Map<string, any[]>();
     allPlayers?.forEach((player: any) => {
       const time = player.bookings.booking_time.substring(0, 5);
       if (!playersByTime.has(time)) {
         playersByTime.set(time, []);
       }
       playersByTime.get(time)!.push({
         memberId: player.member_id,
         name: `${player.members.first_name} ${player.members.last_name}`,
         memberCode: player.members.member_code,
         isMainPlayer: player.is_main_player,
       });
     });

     // Build tee times with all players
     const teeTimes: TeeTime[] = timeSlots.map((startTime, index) => {
       const players = playersByTime.get(startTime) || [];
       const uniquePlayersMap = new Map<number, any>();
       players.forEach((p: any) => {
         if (!uniquePlayersMap.has(p.memberId)) {
           uniquePlayersMap.set(p.memberId, p);
         }
       });

       return {
         id: index + 1,
         // ...
         members: Array.from(uniquePlayersMap.values()),
         bookedPlayersCount: uniquePlayersMap.size, // Use unique count
       };
     });

     return teeTimes;
   };
   ```

4. **Update `TeeSheetPage.tsx`**:
   ```typescript
   const formatPlayers = (members?: { memberId: number; name: string; memberCode?: string }[]) => {
     if (!members || members.length === 0) return '-';
     
     // ✅ Show all players with member codes
     return members.map((m) => 
       `${m.name} (${m.memberCode || m.memberId})`
     ).join(', ');
   };
   ```

5. **Update `getBookingById` in `bookingService.ts`**:
   ```typescript
   export const getBookingById = async (id: number): Promise<BookingDetail> => {
     // ... (existing booking fetch)

     // ✅ NEW: Get all players from booking_players table
     const { data: bookingPlayers, error: playersError } = await supabase
       .from('booking_players')
       .select(`
         member_id,
         is_main_player,
         members!booking_players_member_id_fkey (
           id,
           first_name,
           last_name,
           member_code
         )
       `)
       .eq('booking_id', id)
       .order('is_main_player', { ascending: false }); // Main player first

     const players: BookingDetailPlayer[] = (bookingPlayers || []).map((bp: any) => ({
       memberId: bp.member_id,
       memberName: `${bp.members.first_name} ${bp.members.last_name}`,
       memberCode: bp.members.member_code,
       isMainPlayer: bp.is_main_player,
     }));

     return await mapDbRowToBookingDetail(booking, players, booking.tee_times, bookingItems || []);
   };
   ```

---

## 📋 Implementation Checklist

- [ ] Create migration script: `add-booking-players-table.sql`
- [ ] Run migration in Supabase SQL Editor
- [ ] Update `bookingService.ts` → `createBooking()` to insert players
- [ ] Update `bookingService.ts` → `getBookingById()` to fetch all players
- [ ] Update `teeTimeService.ts` → `getTeeTimes()` to fetch all players
- [ ] Update `TeeSheetPage.tsx` → `formatPlayers()` to show member codes
- [ ] Test: Create booking with 3 players → Verify all 3 appear on tee sheet
- [ ] Test: Verify no duplicate member IDs in same booking
- [ ] Test: Verify no duplicate member IDs in same tee time slot

---

## 🎯 Expected Result

**Before:**
```
07:00 - 07:15 | Partial (1 left) | John Doe
```

**After:**
```
07:00 - 07:15 | Partial (1 left) | John Doe (M001), Jane Doe (M002), Bob Smith (M003)
```

**Benefits:**
- ✅ All players visible on tee sheet
- ✅ Member codes displayed for verification
- ✅ Easy to spot duplicate member IDs
- ✅ Clear who is in each booking

---

## ⚠️ Alternative: Quick Fix (No Schema Change)

If you don't want to change the schema right now, we can:

1. **Show `player_count` on tee sheet**:
   ```
   07:00 - 07:15 | Partial (1 left) | John Doe + 2 others
   ```

2. **Add tooltip with full list** (requires fetching booking detail on hover)

3. **Make tee sheet row clickable** → Opens booking detail drawer with all players

**But this doesn't solve the core issue**: We still can't verify duplicate member IDs visually without clicking into each booking.

---

## 💡 Recommendation

**Implement Option 1** (`booking_players` table) because:
- ✅ Solves the root problem (storing all players)
- ✅ Enables visual verification of duplicates
- ✅ Better data integrity
- ✅ Easier to query and display
- ✅ Future-proof for features like player history, statistics, etc.

---

**Next Steps:**
1. Confirm if you want to proceed with Option 1 (schema change)
2. Or use Alternative (quick fix without schema change)
3. I'll implement the chosen solution



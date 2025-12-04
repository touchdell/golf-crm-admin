# Tee Booking - Add Member Function Flow

## Overview
This document clarifies how members are added to tee time bookings, including the complete flow from tee sheet click to booking creation.

---

## 🔄 Complete Flow Diagram

```
1. User clicks tee time slot on Tee Sheet
   ↓
2. Check: Does this slot already have members?
   ├─ YES → Auto-select first member as main → Go to step 4
   └─ NO → Open MemberSelectionModal (step 3)
   ↓
3. User selects main member → Close MemberSelectionModal
   ↓
4. Open BookingModal with:
   - Fixed main member (read-only, cannot change)
   - Additional players dropdown (filtered)
   ↓
5. User optionally adds additional players
   ↓
6. User clicks "Create Booking"
   ↓
7. Backend creates booking with deduplicated players
```

---

## 📋 Step-by-Step Breakdown

### **Step 1: Click Tee Time Slot** (`TeeSheetPage.tsx`)

**File**: `src/pages/tee-sheet/TeeSheetPage.tsx`

**Function**: `handleSlotClick(teeTime: TeeTime)`

```typescript
const handleSlotClick = (teeTime: TeeTime) => {
  if (teeTime.status === 'BLOCKED') return;
  
  setSelectedTeeTime(teeTime);
  
  // Check if slot already has members
  if (teeTime.members && teeTime.members.length > 0) {
    // Auto-select first member → Skip to BookingModal
    const primary = teeTime.members[0];
    setSelectedMainMember(prefilledMember);
    setIsBookingModalOpen(true);
  } else {
    // New booking → Open MemberSelectionModal first
    setIsMemberSelectionModalOpen(true);
  }
};
```

**Key Points**:
- If slot already has bookings → Auto-select first member, skip member selection
- If slot is empty → Open `MemberSelectionModal` first

---

### **Step 2: Select Main Member** (`MemberSelectionModal.tsx`)

**File**: `src/components/MemberSelectionModal.tsx`

**Purpose**: Staff selects the **main member** (booking owner) before opening the booking form.

**Features**:
- Searchable autocomplete for members
- Shows: `FirstName LastName (MemberCode)`
- Main member cannot be changed after selection

**Flow**:
```typescript
const handleMemberSelected = (member: Member) => {
  setSelectedMainMember(member);        // Store main member
  setIsMemberSelectionModalOpen(false); // Close selection modal
  setIsBookingModalOpen(true);          // Open booking modal
};
```

**Why separate modal?**
- Prevents accidental wrong member assignment
- Ensures main member is selected before adding additional players
- Clear separation of concerns

---

### **Step 3: Booking Modal Opens** (`BookingModal.tsx`)

**File**: `src/components/BookingModal.tsx`

**Props**:
```typescript
interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  teeTime: TeeTime | null;
  mainMember: Member | null;           // ✅ Fixed, read-only
  existingMemberIds?: number[];         // ✅ Members already in this slot
  onSaved?: () => void;
  onError?: (error: Error) => void;
}
```

#### **3.1 Main Member Display (Read-Only)**

```typescript
{/* Main Member Display (Fixed, Read-only) */}
<Box>
  <Typography variant="subtitle2">Main Member</Typography>
  {mainMember && (
    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Typography variant="body1">
        {mainMember.firstName} {mainMember.lastName}
      </Typography>
      <Typography variant="body2">
        Member Code: {mainMember.memberCode}
      </Typography>
      <Chip label="Fixed" size="small" color="primary" />
    </Box>
  )}
</Box>
```

**Key Points**:
- Main member is **displayed only** (cannot be changed)
- Shows member name, code, and "Fixed" chip
- Required: Booking cannot be created without main member

---

#### **3.2 Additional Players Selection**

**Autocomplete Component**:
```typescript
<Autocomplete
  multiple
  options={additionalMembersOptions}
  value={additionalMembers}
  isOptionEqualToValue={(option, value) => option.id === value.id}
  getOptionLabel={(option) =>
    `${option.firstName} ${option.lastName} (${option.memberCode})`
  }
  onChange={(_, newValue) => {
    // Filter out main member before setting
    const filteredNewValue = newValue.filter(
      (m) => m.id !== mainMember?.id
    );
    
    // Enforce max players limit
    if (filteredNewValue.length <= maxAdditionalPlayers) {
      setAdditionalMembers(filteredNewValue);
    }
  }}
/>
```

**Filtering Logic** (`additionalMembersOptions`):
```typescript
const existingMemberIdSet = new Set(existingMemberIds);

const additionalMembersOptions = [
  // Include already selected members (so they stay visible)
  ...additionalMembers,
  // Add other available members
  ...allAdditionalMembers.filter(
    (m) =>
      m.id !== mainMember?.id &&                    // ❌ Not main member
      !selectedMemberIds.has(m.id) &&               // ❌ Not already selected
      !existingMemberIdSet.has(m.id),               // ❌ Not already in slot
  ),
];
```

**What gets filtered out?**
1. ❌ **Main member** - Cannot add main member as additional player
2. ❌ **Already selected** - Cannot select same member twice in this modal
3. ❌ **Already in slot** - Cannot add member who is already booked in this tee time slot

**Example**:
- Tee time slot: `07:00 - 07:15`
- Already booked: `user1`, `user2`
- Main member selected: `user3`
- Additional players dropdown will **NOT show**: `user1`, `user2`, `user3`
- Additional players dropdown **WILL show**: `user4`, `user5`, `user6`, etc.

---

#### **3.3 Slot Availability Calculation**

```typescript
const maxPlayers = teeTime?.maxPlayers || 0; // e.g., 4

// How many players were already booked (before opening modal)
const originalAvailableSlots = teeTime
  ? teeTime.maxPlayers - teeTime.bookedPlayersCount
  : 0;

// Members already in this tee-time group
const existingMemberIdSet = new Set(existingMemberIds);

// How many NEW players are we adding (excluding those already in group)
const newMainCount =
  mainMember && !existingMemberIdSet.has(mainMember.id) ? 1 : 0;
const newAdditionalCount = additionalMembers.filter(
  (m) => !existingMemberIdSet.has(m.id),
).length;
const newPlayersCount = newMainCount + newAdditionalCount;

// Remaining slots = original available - new players being added
const remainingSlots = Math.max(0, originalAvailableSlots - newPlayersCount);
```

**Example Calculation**:
- Capacity: `4 players`
- Already booked: `2 players` → `originalAvailableSlots = 2`
- Main member (`user3`) is new → `newMainCount = 1`
- Additional members: `user4` (new) → `newAdditionalCount = 1`
- `newPlayersCount = 1 + 1 = 2`
- `remainingSlots = 2 - 2 = 0` ✅

---

### **Step 4: Submit Booking** (`BookingModal.tsx` → `bookingService.ts`)

#### **4.1 Frontend: Build Players List**

**File**: `src/components/BookingModal.tsx`

**Function**: `handleSubmit()`

```typescript
const handleSubmit = async () => {
  // Build players list: main member first, then additional members
  const allMembers = [mainMember, ...additionalMembers];
  const rawPlayers = allMembers.map((member, index) => ({
    memberId: member.id,
    isMainPlayer: index === 0, // First is main
  }));

  // ✅ De-duplicate by memberId (safety check)
  const uniquePlayersMap = new Map<number, { memberId: number; isMainPlayer: boolean }>();
  rawPlayers.forEach((player) => {
    if (!uniquePlayersMap.has(player.memberId)) {
      uniquePlayersMap.set(player.memberId, player);
    }
  });
  const players = Array.from(uniquePlayersMap.values());

  // Call backend
  await createBookingMutation.mutateAsync({
    date: teeTime.date,
    time: teeTime.startTime,
    players,
    notes: notes.trim() || undefined,
  });
};
```

**Key Points**:
- Main member is always first (`isMainPlayer: true`)
- Additional members follow (`isMainPlayer: false`)
- Frontend de-duplicates by `memberId` before sending

---

#### **4.2 Backend: Create Booking**

**File**: `src/services/bookingService.ts`

**Function**: `createBooking(payload: CreateBookingRequest)`

```typescript
export const createBooking = async (payload: CreateBookingRequest): Promise<Booking> => {
  // 1. Find or create tee_time record
  const { data: existingTeeTime } = await supabase
    .from('tee_times')
    .select('id')
    .eq('date', payload.date)
    .eq('time', timeWithSeconds)
    .maybeSingle();
  
  let actualTeeTimeId: number;
  if (existingTeeTime) {
    actualTeeTimeId = existingTeeTime.id;
  } else {
    // Create new tee_time if it doesn't exist
    const { data: newTeeTime } = await supabase
      .from('tee_times')
      .insert({
        date: payload.date,
        time: timeWithSeconds,
        status: 'BOOKED',
        player_count: payload.players.length,
      })
      .select('id')
      .single();
    actualTeeTimeId = newTeeTime.id;
  }

  // 2. Get main player (first player with isMainPlayer flag, or first player)
  const mainPlayer = payload.players.find((p) => p.isMainPlayer) || payload.players[0];

  // 3. ✅ Backend de-duplicates players by memberId
  const uniquePlayerIds = Array.from(
    new Set(payload.players.map((p) => p.memberId)),
  );

  // 4. Generate booking number
  const { data: bookingNumber } = await supabase.rpc('generate_booking_number');

  // 5. Create booking record
  const bookingData = {
    booking_number: bookingNumber,
    member_id: mainPlayer.memberId,        // Main member ID
    tee_time_id: actualTeeTimeId,
    booking_date: payload.date,
    booking_time: timeWithSeconds,
    player_count: uniquePlayerIds.length,  // ✅ Unique count
    status: 'BOOKED',
    payment_status: 'UNPAID',
    total_amount: 0,
    notes: payload.notes || null,
  };

  const { data: createdBooking } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  return {
    id: createdBooking.id,
    teeTimeId: createdBooking.tee_time_id,
    players: payload.players, // Return original players list
    status: createdBooking.status,
    // ...
  };
};
```

**Key Points**:
- Backend **finds or creates** `tee_time` record based on `date` and `time`
- Backend **de-duplicates** players by `memberId` (double safety)
- `player_count` uses **unique count** (not total array length)
- Main member is stored in `member_id` column
- Additional members are **not stored** in a separate table (only `member_id` and `player_count`)

---

## 🛡️ Duplicate Prevention Mechanisms

### **Layer 1: UI Filtering** (`BookingModal.tsx`)
- Filters out main member from additional players dropdown
- Filters out already-selected members
- Filters out members already in tee time slot (`existingMemberIds`)

### **Layer 2: Frontend Deduplication** (`BookingModal.tsx`)
- Before sending to backend, deduplicates by `memberId` using `Map`

### **Layer 3: Backend Deduplication** (`bookingService.ts`)
- Backend deduplicates by `memberId` using `Set`
- `player_count` uses unique count

### **Layer 4: Database Constraints** (Supabase)
- `member_id` is required (main member)
- `player_count` reflects unique players
- No separate `booking_players` table (simplified model)

---

## 📊 Data Flow Example

### **Scenario**: Add members to tee time `07:00 - 07:15`

**Initial State**:
- Capacity: `4 players`
- Already booked: `user1`, `user2` (from previous booking)
- Available slots: `2`

**User Actions**:
1. Click slot → `MemberSelectionModal` opens
2. Select `user3` as main member → `BookingModal` opens
3. Add `user4` as additional player
4. Click "Create Booking"

**Data Sent to Backend**:
```json
{
  "date": "2025-12-03",
  "time": "07:00",
  "players": [
    { "memberId": 3, "isMainPlayer": true },   // user3
    { "memberId": 4, "isMainPlayer": false }    // user4
  ],
  "notes": null
}
```

**Backend Processing**:
1. Find `tee_time` record for `2025-12-03 07:00:00`
2. De-duplicate players: `[3, 4]` (already unique)
3. Create booking:
   ```sql
   INSERT INTO bookings (
     booking_number,
     member_id,        -- 3 (user3)
     tee_time_id,
     booking_date,
     booking_time,
     player_count,     -- 2 (user3 + user4)
     status,
     payment_status
   ) VALUES (...);
   ```

**Result**:
- Tee time slot now has: `user1`, `user2`, `user3`, `user4` (4/4 full)
- `user3` is main member of new booking
- `user4` is additional player in same booking
- Slot shows: **"Full"** status

---

## 🔍 Key Files Reference

| File | Purpose |
|------|---------|
| `src/pages/tee-sheet/TeeSheetPage.tsx` | Tee sheet display, slot click handler |
| `src/components/MemberSelectionModal.tsx` | Main member selection modal |
| `src/components/BookingModal.tsx` | Booking form with main member + additional players |
| `src/services/bookingService.ts` | Backend API: create booking, find/create tee_time |
| `src/services/teeTimeService.ts` | Fetch tee times with existing members |

---

## ✅ Summary

**How members are added to tee bookings**:

1. **Main Member**: Selected first (via `MemberSelectionModal`), fixed and read-only
2. **Additional Players**: Selected in `BookingModal`, filtered to prevent duplicates
3. **Duplicate Prevention**: 4 layers (UI filtering → Frontend dedup → Backend dedup → DB constraints)
4. **Slot Availability**: Calculated dynamically based on existing bookings + new players
5. **Backend**: Finds or creates `tee_time` record, deduplicates players, stores main member ID

**No duplicate members** can be added because:
- UI filters out already-booked members
- Frontend deduplicates before sending
- Backend deduplicates before storing
- `player_count` uses unique count

---

## 🐛 Troubleshooting

**Issue**: "Member already in slot" but still appears in dropdown
- **Check**: `existingMemberIds` prop is passed correctly from `TeeSheetPage`
- **Check**: `teeTime.members` is populated correctly in `teeTimeService.ts`

**Issue**: "Main member can be added as additional player"
- **Check**: Filter `m.id !== mainMember?.id` in `additionalMembersOptions`

**Issue**: "Same member added twice in one booking"
- **Check**: Frontend deduplication in `handleSubmit()` uses `Map`
- **Check**: Backend deduplication uses `Set`

---

**Last Updated**: 2025-12-03


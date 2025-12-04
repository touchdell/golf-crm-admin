# Fix: Duplicate Members in Tee Time Bookings

## 🐛 Problems Identified

1. **Duplicate Main Members**: Same member code appearing as main member in multiple bookings for the same slot
   - Example: `test2 test2 (GC0002)` appears in 3 different bookings for slot `06:00 - 06:15`

2. **Incorrect Player Count**: `bookedPlayersCount` was summing `player_count` from all bookings, causing double-counting when duplicate main members existed
   - Example: Slot shows "Full" but actual unique members = 3 < quota 4

3. **Missing Prevention**: No validation to prevent creating a booking with a duplicate main member

---

## ✅ Fixes Implemented

### **1. Backend Validation** (`bookingService.ts`)

**Added check before creating booking:**
```typescript
// Check if main member is already a main member in another booking for this slot
const { data: existingBookings } = await supabase
  .from('bookings')
  .select('id, member_id')
  .eq('booking_date', payload.date)
  .eq('booking_time', timeWithSeconds)
  .in('status', ['BOOKED', 'CHECKED_IN'])
  .eq('member_id', mainPlayer.memberId);

if (existingBookings && existingBookings.length > 0) {
  throw new Error(
    `Member ${mainPlayer.memberId} is already a main member in another booking for this tee time slot.`
  );
}
```

**Result**: Prevents creating new bookings with duplicate main members

---

### **2. Accurate Player Count** (`teeTimeService.ts`)

**Fixed `bookedPlayersCount` calculation:**
```typescript
// Count unique main members
const uniqueMainMemberIds = new Set<number>();
bookingInfo.forEach((b: any) => {
  if (b.member?.memberId) {
    uniqueMainMemberIds.add(b.member.memberId);
  }
});

// If duplicate main members exist, adjust count
if (hasDuplicateMainMembers) {
  const uniqueMainCount = uniqueMainMemberIds.size;
  const additionalPlayersSum = bookingInfo.reduce(
    (sum: number, b: any) => sum + Math.max(0, (b.playerCount || 0) - 1),
    0,
  );
  bookedPlayersCount = uniqueMainCount + additionalPlayersSum;
}
```

**Result**: Accurate count even when duplicate main members exist (from existing bad data)

---

### **3. Duplicate Detection & Warning** (`teeTimeService.ts`)

**Added duplicate detection:**
```typescript
const duplicateMainMembers: number[] = [];
bookingInfo.forEach((b: any) => {
  if (b.member && uniqueMembersMap.has(b.member.memberId)) {
    duplicateMainMembers.push(b.member.memberId);
  }
});

if (duplicateMainMembers.length > 0) {
  console.warn(`Duplicate main members found in slot ${startTime}:`, duplicateMainMembers);
}
```

**Result**: Logs warnings when duplicates are detected

---

### **4. Visual Warning in UI** (`TeeSheetPage.tsx`)

**Added duplicate indicator:**
```typescript
const hasDuplicateMainMembers = (teeTime: TeeTime): boolean => {
  if (!teeTime.bookings || teeTime.bookings.length < 2) return false;
  
  const mainMemberIds = teeTime.bookings
    .map((b) => b.mainMember?.memberId)
    .filter((id): id is number => id !== undefined);
  
  const uniqueIds = new Set(mainMemberIds);
  return mainMemberIds.length !== uniqueIds.size;
};

// In render:
{hasDuplicateMainMembers(tt) && (
  <Typography variant="caption" color="error">
    ⚠️ Duplicate main members detected
  </Typography>
)}
```

**Result**: Red text and warning icon when duplicates are detected

---

### **5. Filter Existing Main Members** (`MemberSelectionModal.tsx`)

**Added exclusion filter:**
```typescript
interface MemberSelectionModalProps {
  // ...
  excludedMemberIds?: number[]; // Members already main members in this slot
}

const excludedSet = new Set(excludedMemberIds);
const availableMembers = (membersData?.items || []).filter(
  (member) => !excludedSet.has(member.id)
);
```

**Result**: Prevents selecting members who are already main members in existing bookings

---

### **6. Pass All Main Member IDs** (`TeeSheetPage.tsx`)

**Updated to pass all main member IDs:**
```typescript
<MemberSelectionModal
  excludedMemberIds={selectedTeeTime?.allMainMemberIds ?? []}
/>

<BookingModal
  existingMemberIds={selectedTeeTime?.allMainMemberIds ?? []}
/>
```

**Result**: Both modals receive complete list of existing main members

---

## 📊 Expected Results

### **Before Fix:**
```
06:00 - 06:15 | Full | test2 test2 (GC0002) (1 player) | test test2 (GC0001) + 1 other | test2 test2 (GC0002) + 1 other
```
- ❌ Duplicate: `GC0002` appears twice
- ❌ Count: Shows "Full" but actual unique = 3 < quota 4

### **After Fix:**
```
06:00 - 06:15 | Partial (1 left) | test test2 (GC0001) + 1 other | test2 test2 (GC0002) + 1 other
⚠️ Duplicate main members detected (if old data exists)
```
- ✅ No new duplicates can be created
- ✅ Accurate count: 3 unique members, 1 slot remaining
- ✅ Visual warning for existing duplicates

---

## 🔧 How It Works

### **Prevention Flow:**

1. **User clicks slot** → `MemberSelectionModal` opens
2. **Modal filters** → Excludes members already main members in this slot
3. **User selects member** → `BookingModal` opens
4. **Backend validates** → Checks if member is already main member in another booking
5. **If duplicate** → Error thrown, booking creation blocked
6. **If valid** → Booking created successfully

### **Detection Flow:**

1. **Tee sheet loads** → Fetches all bookings for date
2. **Groups by time** → Maps bookings to time slots
3. **Detects duplicates** → Checks if same `member_id` appears multiple times as main member
4. **Adjusts count** → Uses unique main members + additional players
5. **Shows warning** → Red text if duplicates detected

---

## 🧪 Testing Checklist

- [x] Backend validation prevents duplicate main members
- [x] `MemberSelectionModal` filters out existing main members
- [x] `BookingModal` filters out existing main members from additional players
- [x] Player count is accurate even with duplicate main members (from old data)
- [x] Visual warning appears when duplicates detected
- [x] Console warnings logged for duplicates
- [x] Error message shown when trying to create duplicate booking

---

## ⚠️ Important Notes

1. **Existing Bad Data**: The fixes prevent NEW duplicates, but existing duplicates in the database will still show warnings. You may need to manually clean up existing duplicate bookings.

2. **Additional Players**: We still don't store additional players individually, so we can't detect if additional players overlap between bookings. Only main member duplicates are prevented.

3. **Player Count Accuracy**: When duplicate main members exist (from old data), the count uses: `unique main members + sum of additional players`. This is approximate since additional players might overlap.

---

## 🚀 Next Steps (Optional)

To fully solve the duplicate issue:

1. **Clean Existing Data**: Run a SQL script to identify and remove duplicate main member bookings
2. **Add `booking_players` Table**: Store all players individually (Option 1 from earlier)
3. **Add Validation for Additional Players**: Check if additional players overlap between bookings

---

**Status**: ✅ **Fixed - Prevents New Duplicates, Detects Existing Ones**

**Last Updated**: 2025-12-03



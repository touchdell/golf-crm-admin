# Next Steps - Supabase Integration Testing

## ✅ Completed
- ✅ RLS policies fixed (you ran the SQL manually)
- ✅ Database schema created
- ✅ Code updated for Supabase (auth, members, prices)

## 🧪 Testing Checklist

### 1. Test Authentication (IMPORTANT)
**Action**: Log out and log back in
- Click the logout button (top right)
- Log back in with your Supabase admin credentials
- **Why**: This ensures you have a valid Supabase session (not just localStorage tokens)

### 2. Test Price Items CRUD
**Go to**: `http://localhost:5173/settings/prices`

**Test Create**:
1. Click "Add Price Item"
2. Fill in:
   - Code: `GF_WEEKDAY`
   - Name: `Weekday Green Fee`
   - Unit Price: `50`
   - Currency: `USD` (or `THB`)
   - Category: `GREEN_FEE`
3. Click "Create"
4. **Expected**: Item appears in the list
5. **Verify in Supabase**: Go to Table Editor → `price_items` table → Should see the new item

**Test Update**:
1. Click "Edit" on a price item
2. Change the price
3. Click "Save"
4. **Expected**: Changes reflected in the list

**Test Toggle Status**:
1. Toggle the status switch on a price item
2. **Expected**: Status changes immediately

**Test Delete**:
1. Click "Delete" on a price item
2. Confirm deletion
3. **Expected**: Item removed from list

### 3. Test Members CRUD
**Go to**: `http://localhost:5173/members`

**Test Create**:
1. Click "Add Member"
2. Fill in:
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john.doe@example.com`
   - Phone: `+1234567890`
   - Membership Type: Select one (you may need to create a membership type first)
   - Status: `ACTIVE`
3. Click "Create"
4. **Expected**: 
   - Member appears in the list
   - Member code is auto-generated (e.g., `GC0001`)
5. **Verify in Supabase**: Go to Table Editor → `members` table → Should see the new member

**Test Edit**:
1. Click "Edit" on a member
2. Change some fields
3. Click "Save"
4. **Expected**: Changes reflected

**Test Deactivate**:
1. Go to member detail page
2. Click "Deactivate"
3. **Expected**: Status changes to `SUSPENDED`

### 4. Test Membership Types (if needed)
**Go to**: `http://localhost:5173/settings/membership-types`

**Note**: This service may not be fully updated to Supabase yet. If it shows errors, we'll need to update `membershipTypeService.ts`.

### 5. Verify Data Persistence
1. Create a price item or member
2. Refresh the page (F5)
3. **Expected**: Data should still be there (not dummy data)
4. **Verify in Supabase**: Check Table Editor to confirm data is in the database

## 🔍 How to Verify Full Sync

### Check Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/mekooocjsomkbhifnnqy/editor
2. Check these tables:
   - `price_items` - Should have your test price items
   - `members` - Should have your test members
   - `membership_types` - Should have membership types (if created)

### Check Browser Console
- Open DevTools (F12)
- Go to Console tab
- Look for any errors (should be none if everything works)
- Look for Supabase-related logs

## 🐛 Troubleshooting

### If you see "401 Unauthorized"
- **Solution**: Log out and log back in with Supabase credentials

### If you see "RLS policy violation"
- **Solution**: Make sure you ran the `fix-rls-policies.sql` script completely

### If data doesn't persist after refresh
- **Check**: Browser console for errors
- **Check**: Supabase Table Editor to see if data is actually saved
- **Possible issue**: Service might still be using dummy data fallback

### If "No membership types found" when creating a member
- **Solution**: First create a membership type in Settings → Membership Types

## 📊 Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | ✅ Updated | Uses Supabase auth |
| Members Service | ✅ Updated | Full CRUD with Supabase |
| Prices Service | ✅ Updated | Full CRUD with Supabase |
| Membership Types | ⏳ Pending | May need update |
| Tee Times | ⏳ Pending | Not updated yet |
| Bookings | ⏳ Pending | Not updated yet |
| Reports | ⏳ Pending | Still using dummy data |

## 🎯 What to Test First

**Priority 1**: Test Price Items (simplest)
1. Create a price item
2. Verify it appears in Supabase Table Editor
3. Refresh page - should still be there

**Priority 2**: Test Members
1. Create a membership type first (if needed)
2. Create a member
3. Verify in Supabase

**Priority 3**: Test Authentication
1. Log out
2. Log back in
3. Verify session persists

---

**After testing, let me know:**
- ✅ What works
- ❌ What doesn't work
- 🔍 Any errors you see

Then we can update the remaining services!


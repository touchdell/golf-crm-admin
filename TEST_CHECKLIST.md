# RLS Fix Test Checklist

## ✅ Step 1: Log In
1. Go to `http://localhost:5173/login`
2. Enter your Supabase admin credentials
3. Click "Sign In"
4. **Verify**: You should be redirected to the Dashboard

---

## ✅ Step 2: Test Member Creation

### Test Create Member
1. Navigate to: `http://localhost:5173/members`
2. Click "Add Member" button
3. Fill in the form:
   - **First Name**: `John`
   - **Last Name**: `Doe`
   - **Email**: `john.doe@example.com`
   - **Phone**: `+1234567890` (optional)
   - **Membership Type**: Select one from dropdown (if empty, create one first in Settings)
   - **Status**: `ACTIVE`
4. Click "Create"
5. **Expected Result**: 
   - ✅ Member appears in the list
   - ✅ Member code is auto-generated (e.g., `GC0001`)
   - ✅ No error messages
6. **Verify in Supabase**:
   - Go to: https://supabase.com/dashboard/project/mekooocjsomkbhifnnqy/editor
   - Open `members` table
   - Should see the new member with auto-generated `member_code`

### Test Edit Member
1. Click "Edit" on the member you just created
2. Change the phone number or address
3. Click "Save"
4. **Expected**: Changes are saved and reflected in the list

### Test Deactivate Member
1. Click on a member to view details
2. Click "Deactivate" button
3. **Expected**: Status changes to `SUSPENDED`

---

## ✅ Step 3: Test Price Items

### Test Create Price Item
1. Navigate to: `http://localhost:5173/settings/prices`
2. Click "Add Price Item"
3. Fill in:
   - **Code**: `GF_WEEKDAY`
   - **Name**: `Weekday Green Fee`
   - **Unit Price**: `50`
   - **Currency**: `USD` (or `THB`)
   - **Category**: `GREEN_FEE`
4. Click "Create"
5. **Expected Result**:
   - ✅ Item appears in the list
   - ✅ No error messages
6. **Verify in Supabase**:
   - Go to Table Editor → `price_items` table
   - Should see the new price item

### Test Toggle Status
1. Toggle the status switch on a price item
2. **Expected**: Status changes immediately (Active ↔ Inactive)

### Test Edit Price Item
1. Click "Edit" on a price item
2. Change the price
3. Click "Save"
4. **Expected**: Changes are saved

### Test Delete Price Item
1. Click "Delete" on a price item
2. Confirm deletion
3. **Expected**: Item is removed from the list

---

## ✅ Step 4: Test Data Persistence

1. Create a member or price item
2. Refresh the page (F5)
3. **Expected**: Data should still be there (not dummy data)
4. **Verify**: Check Supabase Table Editor to confirm data is in the database

---

## ✅ Step 5: Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. **Expected**: No errors related to:
   - ❌ "RLS policy violation"
   - ❌ "401 Unauthorized"
   - ❌ "new row violates row-level security policy"

---

## 🐛 Troubleshooting

### If you still see "RLS policy violation"
- **Check**: Make sure you ran the updated `fix-rls-policies.sql` with `WITH CHECK` clauses
- **Verify**: In Supabase SQL Editor, check if policies exist:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'members';
  ```
- **Solution**: Re-run the updated `fix-rls-policies.sql`

### If you see "401 Unauthorized"
- **Solution**: Log out and log back in with Supabase credentials
- **Check**: Verify you have a valid Supabase session

### If member code is not auto-generated
- **Check**: The `generate_member_code()` function exists in Supabase
- **Verify**: Run this in SQL Editor:
  ```sql
  SELECT generate_member_code();
  ```

### If "No membership types found"
- **Solution**: First create a membership type:
  1. Go to `http://localhost:5173/settings/membership-types`
  2. Click "Add Membership Type"
  3. Create at least one type
  4. Then try creating a member again

---

## 📊 Success Criteria

✅ **All tests pass if:**
- Members can be created without RLS errors
- Price items can be created without RLS errors
- Data persists after page refresh
- Data appears in Supabase Table Editor
- No console errors related to RLS or authentication

---

**After testing, report:**
- ✅ What works
- ❌ What doesn't work
- 🔍 Any errors you see



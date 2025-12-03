# Create Admin User - Step by Step Guide

## Problem
You can't log in with `admin@golfclub.com` because the user doesn't exist in Supabase.

## Solution: Create the User

### Method 1: Using Supabase Dashboard (Easiest)

1. **Go to Supabase Authentication**:
   - Navigate to: https://supabase.com/dashboard/project/mekooocjsomkbhifnnqy/auth/users
   - Click **"Add user"** → **"Create new user"**

2. **Fill in the form**:
   - **Email**: `admin@golfclub.com`
   - **Password**: Choose a strong password (remember it!)
   - **Auto Confirm User**: ✅ **Check this box** (important!)
   - Click **"Create user"**

3. **Get the User UUID**:
   - After creating, you'll see the user in the list
   - Click on the user to view details
   - Copy the **UUID** (it looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

4. **Create User Profile**:
   - Go to **SQL Editor**: https://supabase.com/dashboard/project/mekooocjsomkbhifnnqy/sql
   - Run this SQL (replace `YOUR_UUID_HERE` with the UUID you copied):

```sql
INSERT INTO user_profiles (id, email, name, role)
VALUES (
  'YOUR_UUID_HERE',  -- Paste the UUID here
  'admin@golfclub.com',
  'Admin User',
  'ADMIN'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;
```

5. **Test Login**:
   - Go to: http://localhost:5173/login
   - Email: `admin@golfclub.com`
   - Password: (the password you set)
   - Click "Sign In"

---

### Method 2: Using SQL Only (Advanced)

If you prefer to do everything via SQL, you can use the Supabase Management API, but it's more complex. The Dashboard method above is recommended.

---

## Quick SQL to Find Existing User

If you're not sure if the user exists, run this in SQL Editor:

```sql
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@golfclub.com';
```

If it returns a row, the user exists. Use the `id` (UUID) in the INSERT statement above.

---

## Verify User Profile

After creating the user profile, verify it exists:

```sql
SELECT * FROM user_profiles WHERE email = 'admin@golfclub.com';
```

You should see:
- `id`: The UUID
- `email`: `admin@golfclub.com`
- `name`: `Admin User`
- `role`: `ADMIN`

---

## Troubleshooting

### "User already exists"
- The user exists in `auth.users` but might not have a profile
- Just run the INSERT statement (it will update if exists due to ON CONFLICT)

### "Foreign key constraint violation"
- The UUID doesn't exist in `auth.users`
- Create the user in Authentication → Users first

### "RLS policy violation"
- Make sure you ran `fix-rls-policies.sql` first
- The user_profiles table should allow authenticated users to insert

### Still can't log in?
- Check browser console for errors
- Verify the password is correct
- Make sure "Auto Confirm User" was checked when creating the user
- Try logging out and back in

---

## Next Steps

After successfully creating the user:
1. ✅ Log in with `admin@golfclub.com`
2. ✅ Test creating a member
3. ✅ Test creating a price item
4. ✅ Verify data persists in Supabase


# Testing Guide - Supabase Integration

## Prerequisites

### 1. Database Schema Setup (REQUIRED)
Before testing, you must run the SQL schema in Supabase:

1. Go to: https://supabase.com/dashboard/project/mekooocjsomkbhifnnqy/sql
2. Open the file `supabase-schema.sql` from your project
3. Copy the entire SQL content
4. Paste it into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. Verify you see "Success. No rows returned" or similar success message

### 2. Create Admin User (REQUIRED)
After running the schema, create your first admin user:

1. Go to: https://supabase.com/dashboard/project/mekooocjsomkbhifnnqy/auth/users
2. Click "Add user" → "Create new user"
3. Enter:
   - Email: `admin@example.com` (or your email)
   - Password: Choose a strong password
   - **Auto Confirm User**: ✅ (check this)
4. Click "Create user"
5. Copy the user's UUID (you'll see it in the user list)

6. Go to SQL Editor and run:
```sql
INSERT INTO user_profiles (id, email, name, role)
VALUES ('YOUR_USER_UUID_HERE', 'admin@example.com', 'Admin User', 'ADMIN');
```
(Replace `YOUR_USER_UUID_HERE` with the actual UUID)

## Testing Checklist

### ✅ Authentication
- [ ] Start dev server: `npm run dev`
- [ ] Navigate to login page
- [ ] Try logging in with the admin user you created
- [ ] Verify you're redirected to dashboard
- [ ] Check browser console for any errors

### ✅ Members (if schema is set up)
- [ ] Navigate to `/members`
- [ ] Check if members list loads (should be empty initially)
- [ ] Try creating a new member
- [ ] Verify member appears in the list
- [ ] Try editing a member
- [ ] Try toggling member status

### ✅ Prices (if schema is set up)
- [ ] Navigate to `/settings/prices`
- [ ] Check if price items load (should be empty initially)
- [ ] Try creating a new price item
- [ ] Verify price item appears in the list
- [ ] Try toggling the status switch
- [ ] Try editing a price item
- [ ] Try deleting a price item

## Common Issues

### Issue: "Supabase URL and Anon Key are not set"
**Solution**: Check your `.env` file has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Issue: "Failed to fetch" or Network errors
**Solution**: 
- Verify your Supabase project is active (not paused)
- Check that RLS policies are set up correctly
- Make sure you're logged in as an admin user

### Issue: "Permission denied" or RLS errors
**Solution**: 
- Verify you created the user profile with `role = 'ADMIN'`
- Check that RLS policies were created in the schema

### Issue: Tables don't exist
**Solution**: Make sure you ran the complete `supabase-schema.sql` file

## Next Steps After Testing

Once authentication, members, and prices are working:
1. Update remaining services (membership types, tee times, bookings, etc.)
2. Test full CRUD operations
3. Test with multiple users
4. Verify RLS policies work correctly



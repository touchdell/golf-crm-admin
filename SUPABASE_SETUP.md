# Supabase Setup Guide

This guide will help you set up Supabase for your Golf CRM Admin application.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `golf-crm-admin` (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose the closest region to your users
5. Click "Create new project" (takes 1-2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll find:
   - **Project URL**: Copy this (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**: Copy this (starts with `eyJ...`)

## Step 3: Set Up Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

## Step 4: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql`
4. Paste into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

## Step 5: Set Up Authentication

### Option A: Email/Password Authentication (Recommended)

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Ensure "Email" provider is enabled
3. Configure email templates if needed (optional)

### Option B: Create Your First Admin User

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click "Add user" → "Create new user"
3. Enter:
   - **Email**: `admin@example.com` (or your admin email)
   - **Password**: Choose a strong password
   - **Auto Confirm User**: ✅ (check this)
4. Click "Create user"
5. Copy the user's UUID (you'll need this)

### Create User Profile

1. Go to **SQL Editor** in Supabase
2. Run this query (replace `USER_UUID` with the UUID from step above):
   ```sql
   INSERT INTO user_profiles (id, email, name, role)
   VALUES ('USER_UUID', 'admin@example.com', 'Admin User', 'ADMIN');
   ```

## Step 6: Test the Connection

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Check the browser console for any Supabase connection errors

## Step 7: Verify Tables

1. In Supabase dashboard, go to **Table Editor**
2. You should see these tables:
   - `membership_types`
   - `members`
   - `price_items`
   - `tee_time_config`
   - `tee_times`
   - `bookings`
   - `booking_items`
   - `payments`
   - `user_profiles`

## Next Steps

After completing this setup:
- The frontend will be updated to use Supabase instead of dummy data
- Authentication will be integrated with Supabase Auth
- All CRUD operations will work with your Supabase database

## Troubleshooting

### "Supabase URL and Anon Key are not set"
- Make sure your `.env` file exists and has the correct values
- Restart your dev server after updating `.env`

### RLS Policy Errors
- Make sure you've run the complete `supabase-schema.sql` file
- Check that your user profile has the `ADMIN` role

### Connection Issues
- Verify your Supabase project is active (not paused)
- Check that your API keys are correct
- Ensure your `.env` file is in the project root

## Security Notes

- Never commit your `.env` file to Git (it's already in `.gitignore`)
- The `anon` key is safe to use in frontend code (it's public)
- Row Level Security (RLS) policies protect your data
- Only users with `ADMIN` role can access all data



-- Create Admin User Script
-- Run this in Supabase SQL Editor to create an admin user

-- Step 1: Create the user in auth.users (using Supabase Auth Admin API)
-- Note: You need to create the user via Supabase Dashboard first, then run Step 2

-- Step 2: After creating the user in Authentication → Users, get the UUID and run:
-- Replace 'USER_UUID_HERE' with the actual UUID from auth.users table
-- Replace 'admin@golfclub.com' with your email if different

-- First, let's check if user exists and get the UUID
-- Run this query to find the user UUID:
SELECT id, email FROM auth.users WHERE email = 'admin@golfclub.com';

-- Step 3: Once you have the UUID, insert into user_profiles:
-- Replace 'YOUR_UUID_HERE' with the UUID from the query above
INSERT INTO user_profiles (id, email, name, role)
VALUES (
  'YOUR_UUID_HERE',  -- Replace with actual UUID from auth.users
  'admin@golfclub.com',
  'Admin User',
  'ADMIN'
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Alternative: If you want to create the user directly via SQL (requires service_role key):
-- This is more advanced and requires using the Supabase Management API
-- It's easier to use the Dashboard method below



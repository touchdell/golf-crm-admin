-- Fix RLS Policies to avoid infinite recursion
-- Run this SQL in Supabase SQL Editor to fix the policies

-- Drop ALL existing policies (both old and new ones)
DROP POLICY IF EXISTS "Admins have full access to membership_types" ON membership_types;
DROP POLICY IF EXISTS "Admins have full access to members" ON members;
DROP POLICY IF EXISTS "Admins have full access to price_items" ON price_items;
DROP POLICY IF EXISTS "Admins have full access to tee_time_config" ON tee_time_config;
DROP POLICY IF EXISTS "Admins have full access to tee_times" ON tee_times;
DROP POLICY IF EXISTS "Admins have full access to bookings" ON bookings;
DROP POLICY IF EXISTS "Admins have full access to booking_items" ON booking_items;
DROP POLICY IF EXISTS "Admins have full access to payments" ON payments;
DROP POLICY IF EXISTS "Users can view their own member data" ON members;

-- Drop new policies if they exist
DROP POLICY IF EXISTS "Authenticated users have full access to membership_types" ON membership_types;
DROP POLICY IF EXISTS "Authenticated users have full access to members" ON members;
DROP POLICY IF EXISTS "Authenticated users have full access to price_items" ON price_items;
DROP POLICY IF EXISTS "Authenticated users have full access to tee_time_config" ON tee_time_config;
DROP POLICY IF EXISTS "Authenticated users have full access to tee_times" ON tee_times;
DROP POLICY IF EXISTS "Authenticated users have full access to bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users have full access to booking_items" ON booking_items;
DROP POLICY IF EXISTS "Authenticated users have full access to payments" ON payments;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;

-- Create simplified policies for authenticated users
-- For testing: all authenticated users have full access
-- For production: refine these based on user roles
-- Note: USING is for SELECT/UPDATE/DELETE, WITH CHECK is for INSERT/UPDATE

CREATE POLICY "Authenticated users have full access to membership_types"
  ON membership_types FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users have full access to members"
  ON members FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users have full access to price_items"
  ON price_items FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users have full access to tee_time_config"
  ON tee_time_config FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users have full access to tee_times"
  ON tee_times FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users have full access to bookings"
  ON bookings FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users have full access to booking_items"
  ON booking_items FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users have full access to payments"
  ON payments FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


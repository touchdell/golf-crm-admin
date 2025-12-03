-- Golf CRM Admin Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MEMBERSHIP TYPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS membership_types (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS members (
  id BIGSERIAL PRIMARY KEY,
  member_code VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  membership_type_id BIGINT REFERENCES membership_types(id),
  membership_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, EXPIRED, CANCELLED
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for member code lookup
CREATE INDEX IF NOT EXISTS idx_members_member_code ON members(member_code);
CREATE INDEX IF NOT EXISTS idx_members_membership_type ON members(membership_type_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(membership_status);

-- ============================================
-- PRICE ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS price_items (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  category VARCHAR(50) NOT NULL, -- GREEN_FEE, CART, CADDY, OTHER
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_items_category ON price_items(category);
CREATE INDEX IF NOT EXISTS idx_price_items_active ON price_items(is_active);

-- ============================================
-- TEE TIME CONFIGURATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tee_time_config (
  id BIGSERIAL PRIMARY KEY,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  interval_minutes INTEGER NOT NULL DEFAULT 15,
  max_players INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config (only one row should exist)
INSERT INTO tee_time_config (start_time, end_time, interval_minutes, max_players)
VALUES ('06:00:00', '18:00:00', 15, 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- TEE TIMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tee_times (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NOT NULL,
  member_id BIGINT REFERENCES members(id),
  player_count INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, BOOKED, CANCELLED, COMPLETED
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, time)
);

CREATE INDEX IF NOT EXISTS idx_tee_times_date ON tee_times(date);
CREATE INDEX IF NOT EXISTS idx_tee_times_member ON tee_times(member_id);
CREATE INDEX IF NOT EXISTS idx_tee_times_status ON tee_times(status);

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  member_id BIGINT REFERENCES members(id),
  tee_time_id BIGINT REFERENCES tee_times(id),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  player_count INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, CANCELLED, COMPLETED
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_member ON bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tee_time ON bookings(tee_time_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);

-- ============================================
-- BOOKING ITEMS TABLE (for line items in a booking)
-- ============================================
CREATE TABLE IF NOT EXISTS booking_items (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id) ON DELETE CASCADE,
  price_item_id BIGINT REFERENCES price_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_price_item ON booking_items(price_item_id);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- CASH, CARD, TRANSFER, MEMBERSHIP
  payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED, REFUNDED
  transaction_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- ============================================
-- USERS TABLE (for admin authentication)
-- ============================================
-- Note: Supabase has built-in auth.users table
-- This table extends it with additional profile info
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'USER', -- ADMIN, USER
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_membership_types_updated_at BEFORE UPDATE ON membership_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_items_updated_at BEFORE UPDATE ON price_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tee_time_config_updated_at BEFORE UPDATE ON tee_time_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tee_times_updated_at BEFORE UPDATE ON tee_times
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE membership_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_time_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tee_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to bypass RLS (for admin operations)
-- Note: This is a simplified approach. For production, use more granular policies.

-- For now, allow authenticated users full access (we'll refine this later)
-- This assumes all authenticated users are admins for testing purposes
CREATE POLICY "Authenticated users have full access to membership_types"
  ON membership_types FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access to members"
  ON members FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access to price_items"
  ON price_items FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access to tee_time_config"
  ON tee_time_config FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access to tee_times"
  ON tee_times FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access to bookings"
  ON bookings FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access to booking_items"
  ON booking_items FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access to payments"
  ON payments FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to generate member code
CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_id INTEGER;
  new_code VARCHAR(50);
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(member_code FROM 'GC(\d+)') AS INTEGER)), 0) + 1
  INTO next_id
  FROM members
  WHERE member_code ~ '^GC\d+$';
  
  new_code := 'GC' || LPAD(next_id::TEXT, 4, '0');
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  next_id INTEGER;
  new_number VARCHAR(50);
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM 'BK(\d+)') AS INTEGER)), 0) + 1
  INTO next_id
  FROM bookings
  WHERE booking_number ~ '^BK\d+$';
  
  new_number := 'BK' || LPAD(next_id::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;


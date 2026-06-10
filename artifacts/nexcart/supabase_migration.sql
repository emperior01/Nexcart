-- =====================================================
-- Nexcart Multi-Vendor Marketplace Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Create sellers table
CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  store_name text NOT NULL,
  store_description text,
  store_logo text,
  store_banner text,
  phone text,
  address text,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending','verified','rejected','suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Add seller_id to products (nullable to preserve existing products)
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES sellers(id) ON DELETE SET NULL;

-- 3. Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz DEFAULT now()
);

-- 4. Create seller_notifications table
CREATE TABLE IF NOT EXISTS seller_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES sellers(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES sellers(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  seller_reply text,
  created_at timestamptz DEFAULT now()
);

-- 6. Enable RLS
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies: sellers
-- =====================================================
DROP POLICY IF EXISTS "Public can view sellers" ON sellers;
CREATE POLICY "Public can view sellers" ON sellers
  FOR SELECT USING (verification_status = 'verified' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can register as seller" ON sellers;
CREATE POLICY "Users can register as seller" ON sellers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can update own profile" ON sellers;
CREATE POLICY "Sellers can update own profile" ON sellers
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- RLS Policies: withdrawals
-- =====================================================
DROP POLICY IF EXISTS "Sellers view own withdrawals" ON withdrawals;
CREATE POLICY "Sellers view own withdrawals" ON withdrawals
  FOR SELECT USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Sellers create own withdrawals" ON withdrawals;
CREATE POLICY "Sellers create own withdrawals" ON withdrawals
  FOR INSERT WITH CHECK (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

-- =====================================================
-- RLS Policies: seller_notifications
-- =====================================================
DROP POLICY IF EXISTS "Sellers view own notifications" ON seller_notifications;
CREATE POLICY "Sellers view own notifications" ON seller_notifications
  FOR SELECT USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Sellers update own notifications" ON seller_notifications;
CREATE POLICY "Sellers update own notifications" ON seller_notifications
  FOR UPDATE USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

-- =====================================================
-- RLS Policies: reviews
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users can create reviews" ON reviews;
CREATE POLICY "Auth users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Sellers can reply to product reviews" ON reviews;
CREATE POLICY "Sellers can reply to product reviews" ON reviews
  FOR UPDATE USING (
    seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
  );

-- =====================================================
-- updated_at trigger for sellers
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sellers_updated_at ON sellers;
CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON sellers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

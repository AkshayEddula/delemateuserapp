-- Quick Database Setup
-- Run this in your Supabase SQL Editor

-- Create order_otps table
CREATE TABLE IF NOT EXISTS public.order_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders (id) ON DELETE CASCADE NOT NULL,
  pickup_otp varchar(4) NOT NULL,
  delivery_otp varchar(4) NOT NULL,
  pickup_verified boolean DEFAULT false,
  delivery_verified boolean DEFAULT false,
  pickup_verified_at timestamptz,
  delivery_verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create driver_locations table
CREATE TABLE IF NOT EXISTS public.driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES public.users (id) ON DELETE CASCADE NOT NULL,
  order_id uuid REFERENCES public.orders (id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  heading double precision,
  speed double precision,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_otps_order ON public.order_otps (order_id);
CREATE INDEX IF NOT EXISTS idx_order_otps_pickup ON public.order_otps (pickup_otp);
CREATE INDEX IF NOT EXISTS idx_order_otps_delivery ON public.order_otps (delivery_otp);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON public.driver_locations (driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order ON public.driver_locations (order_id);

-- Disable RLS temporarily for testing
ALTER TABLE public.order_otps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_locations DISABLE ROW LEVEL SECURITY;

-- Enable RLS on orders and users if not already enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
CREATE POLICY "Users can insert their own orders" ON public.orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (user_id = auth.uid());

-- Users table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Service role can do everything
DROP POLICY IF EXISTS "Service role can manage all orders" ON public.orders;
CREATE POLICY "Service role can manage all orders" ON public.orders
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
CREATE POLICY "Service role can manage all users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

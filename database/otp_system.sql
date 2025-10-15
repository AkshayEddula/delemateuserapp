-- OTP System Database Schema
-- Create OTP table for pickup and delivery verification

CREATE TABLE public.order_otps (
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

-- Indexes for performance
CREATE INDEX idx_order_otps_order ON public.order_otps (order_id);
CREATE INDEX idx_order_otps_pickup ON public.order_otps (pickup_otp);
CREATE INDEX idx_order_otps_delivery ON public.order_otps (delivery_otp);
CREATE INDEX idx_order_otps_expires ON public.order_otps (expires_at);

-- RLS Policies for OTP table
ALTER TABLE public.order_otps ENABLE ROW LEVEL SECURITY;

-- Users can only see OTPs for their own orders
CREATE POLICY "Users can view their own order OTPs" ON public.order_otps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_otps.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Drivers can only see OTPs for orders assigned to them
CREATE POLICY "Drivers can view OTPs for assigned orders" ON public.order_otps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_otps.order_id 
      AND orders.driver_id = auth.uid()
    )
  );

-- Only service role can insert/update OTPs
CREATE POLICY "Service role can manage OTPs" ON public.order_otps
  FOR ALL USING (auth.role() = 'service_role');

-- Driver location tracking table
CREATE TABLE public.driver_locations (
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

-- Indexes for driver location tracking
CREATE INDEX idx_driver_locations_driver ON public.driver_locations (driver_id);
CREATE INDEX idx_driver_locations_order ON public.driver_locations (order_id);
CREATE INDEX idx_driver_locations_created ON public.driver_locations (created_at);

-- RLS Policies for driver locations
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;

-- Users can see driver location for their orders
CREATE POLICY "Users can view driver location for their orders" ON public.driver_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = driver_locations.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Drivers can manage their own locations
CREATE POLICY "Drivers can manage their own locations" ON public.driver_locations
  FOR ALL USING (driver_id = auth.uid());

-- Service role can manage all locations
CREATE POLICY "Service role can manage all locations" ON public.driver_locations
  FOR ALL USING (auth.role() = 'service_role');

-- Function to generate unique 4-digit OTP
CREATE OR REPLACE FUNCTION generate_unique_otp()
RETURNS varchar(4)
LANGUAGE plpgsql
AS $$
DECLARE
  otp varchar(4);
  exists boolean;
BEGIN
  LOOP
    -- Generate random 4-digit number
    otp := LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    -- Check if OTP already exists in pickup_otp or delivery_otp columns
    SELECT EXISTS(
      SELECT 1 FROM public.order_otps 
      WHERE pickup_otp = otp OR delivery_otp = otp
    ) INTO exists;
    
    -- If OTP doesn't exist, return it
    IF NOT exists THEN
      RETURN otp;
    END IF;
  END LOOP;
END;
$$;

-- Function to create OTPs for an order
CREATE OR REPLACE FUNCTION create_order_otps(order_uuid uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  pickup_otp varchar(4);
  delivery_otp varchar(4);
  result json;
BEGIN
  -- Generate unique OTPs
  pickup_otp := generate_unique_otp();
  delivery_otp := generate_unique_otp();
  
  -- Ensure delivery OTP is different from pickup OTP
  WHILE delivery_otp = pickup_otp LOOP
    delivery_otp := generate_unique_otp();
  END LOOP;
  
  -- Insert OTPs
  INSERT INTO public.order_otps (order_id, pickup_otp, delivery_otp)
  VALUES (order_uuid, pickup_otp, delivery_otp);
  
  -- Return the OTPs
  SELECT json_build_object(
    'pickup_otp', pickup_otp,
    'delivery_otp', delivery_otp,
    'order_id', order_uuid
  ) INTO result;
  
  RETURN result;
END;
$$;

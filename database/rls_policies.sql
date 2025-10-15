-- RLS Policies for Orders Table
-- Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own orders
CREATE POLICY "Users can insert their own orders" ON public.orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own orders (for status changes)
CREATE POLICY "Users can update their own orders" ON public.orders
  FOR UPDATE USING (user_id = auth.uid());

-- Drivers can view orders assigned to them
CREATE POLICY "Drivers can view assigned orders" ON public.orders
  FOR SELECT USING (driver_id = auth.uid());

-- Drivers can update orders assigned to them
CREATE POLICY "Drivers can update assigned orders" ON public.orders
  FOR UPDATE USING (driver_id = auth.uid());

-- Service role can do everything
CREATE POLICY "Service role can manage all orders" ON public.orders
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for Users Table
-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Service role can do everything
CREATE POLICY "Service role can manage all users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for Order Offers Table
-- Enable RLS on order_offers table
ALTER TABLE public.order_offers ENABLE ROW LEVEL SECURITY;

-- Users can view offers for their orders
CREATE POLICY "Users can view offers for their orders" ON public.order_offers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_offers.order_id 
      AND orders.user_id = auth.uid()
    )
  );

-- Riders can view offers made to them
CREATE POLICY "Riders can view their own offers" ON public.order_offers
  FOR SELECT USING (rider_id = auth.uid());

-- Riders can update their own offers
CREATE POLICY "Riders can update their own offers" ON public.order_offers
  FOR UPDATE USING (rider_id = auth.uid());

-- Service role can do everything
CREATE POLICY "Service role can manage all offers" ON public.order_offers
  FOR ALL USING (auth.role() = 'service_role');

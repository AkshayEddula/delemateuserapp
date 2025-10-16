-- Add pricing columns to orders table
ALTER TABLE public.orders 
ADD COLUMN distance_km DECIMAL(10,2),
ADD COLUMN total_price INTEGER NOT NULL DEFAULT 0,
ADD COLUMN commission INTEGER NOT NULL DEFAULT 0,
ADD COLUMN rider_earnings INTEGER NOT NULL DEFAULT 0;

-- Add index for pricing queries
CREATE INDEX idx_orders_pricing ON public.orders (total_price, commission);

-- Add index for distance queries
CREATE INDEX idx_orders_distance ON public.orders (distance_km);

-- Update existing orders to extract pricing from package_details if they exist
UPDATE public.orders 
SET 
  distance_km = (package_details->>'distance')::DECIMAL(10,2),
  total_price = (package_details->>'total_price')::INTEGER,
  commission = (package_details->>'commission')::INTEGER,
  rider_earnings = (package_details->>'rider_earnings')::INTEGER
WHERE package_details IS NOT NULL 
  AND package_details ? 'distance' 
  AND package_details ? 'total_price';

-- Add constraints to ensure positive values
ALTER TABLE public.orders 
ADD CONSTRAINT check_total_price_positive CHECK (total_price >= 0),
ADD CONSTRAINT check_commission_positive CHECK (commission >= 0),
ADD CONSTRAINT check_rider_earnings_positive CHECK (rider_earnings >= 0),
ADD CONSTRAINT check_distance_positive CHECK (distance_km >= 0);

-- Add constraint to ensure commission + rider_earnings = total_price
ALTER TABLE public.orders 
ADD CONSTRAINT check_pricing_consistency CHECK (commission + rider_earnings = total_price);

-- Orders table for Solana Pay purchases
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  
  -- Customer info
  customer_email TEXT NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_zip TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'US',
  
  -- Order details
  items JSONB NOT NULL, -- Array of {card_id, name, price, qty, foil, condition}
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 4.98,
  total_usd DECIMAL(10,2) NOT NULL,
  total_sol DECIMAL(10,6) NOT NULL,
  sol_price_at_time DECIMAL(10,2) NOT NULL, -- SOL/USD rate when order was placed
  
  -- Payment info
  transaction_signature TEXT UNIQUE,
  wallet_address TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, failed
  
  -- Fulfillment
  tracking_number TEXT,
  tracking_carrier TEXT,
  shipped_at TIMESTAMPTZ,
  fulfillment_status TEXT NOT NULL DEFAULT 'pending', -- pending, shipped, delivered
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up orders
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(payment_status, fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tx ON orders(transaction_signature);

-- RLS policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own orders (by email)
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (customer_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Admins can see all orders
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Only the system can insert orders (via service role)
CREATE POLICY "System can insert orders"
ON orders FOR INSERT
WITH CHECK (true);

-- Only admins can update orders
CREATE POLICY "Admins can update orders"
ON orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Function to generate order numbers
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION set_order_number();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_orders_timestamp
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

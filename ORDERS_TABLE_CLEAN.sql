-- Clean up existing objects first
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
DROP TRIGGER IF EXISTS trigger_update_orders_timestamp ON orders;
DROP FUNCTION IF EXISTS set_order_number();
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS generate_order_number();
DROP TABLE IF EXISTS orders CASCADE;

-- Orders table for Solana Pay purchases
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT '',
  
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
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 4.98,
  total_usd DECIMAL(10,2) NOT NULL,
  total_sol DECIMAL(10,6) NOT NULL,
  sol_price_at_time DECIMAL(10,2) NOT NULL,
  
  -- Payment info
  transaction_signature TEXT UNIQUE,
  wallet_address TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  
  -- Fulfillment
  tracking_number TEXT,
  tracking_carrier TEXT,
  shipped_at TIMESTAMPTZ,
  fulfillment_status TEXT NOT NULL DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_status ON orders(payment_status, fulfillment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_tx ON orders(transaction_signature);

-- Function to generate order numbers
CREATE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger function to set order number
CREATE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number = '' OR NEW.order_number IS NULL THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update timestamp
CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

CREATE TRIGGER trigger_update_orders_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (customer_email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "System can insert orders"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

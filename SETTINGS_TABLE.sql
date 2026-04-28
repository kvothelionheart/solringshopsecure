-- Settings table for storing site configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default price markup setting
INSERT INTO settings (key, value) 
VALUES ('price_markup_percent', '10')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Only admins can read settings"
ON settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Only admins can update settings"
ON settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Only admins can insert settings"
ON settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

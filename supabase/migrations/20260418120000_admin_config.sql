-- Admin configuration key-value store
CREATE TABLE admin_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read config (e.g. to check disabled categories in room creation)
CREATE POLICY admin_config_select ON admin_config
  FOR SELECT USING (true);

-- Only admins can modify config
CREATE POLICY admin_config_insert ON admin_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY admin_config_update ON admin_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed: disabled categories list (empty by default)
INSERT INTO admin_config (key, value) VALUES ('disabled_categories', '[]'::jsonb)
ON CONFLICT DO NOTHING;

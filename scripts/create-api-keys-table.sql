-- Create API keys table for multi-agent access
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_agent_id ON api_keys(agent_id);

-- Add comments for documentation
COMMENT ON TABLE api_keys IS 'API keys for external multi-agent system access';
COMMENT ON COLUMN api_keys.key IS 'The actual API key value';
COMMENT ON COLUMN api_keys.agent_id IS 'Identifier for the agent/system using this key';
COMMENT ON COLUMN api_keys.description IS 'Human-readable description of the key purpose';
COMMENT ON COLUMN api_keys.expires_at IS 'When this key expires (NULL for no expiration)';
COMMENT ON COLUMN api_keys.active IS 'Whether this key is currently active';
COMMENT ON COLUMN api_keys.last_used_at IS 'When this key was last used';

-- Create telemetry table for API usage tracking
CREATE TABLE IF NOT EXISTS api_telemetry (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  request_data JSONB
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_telemetry_endpoint ON api_telemetry(endpoint);
CREATE INDEX IF NOT EXISTS idx_telemetry_agent_id ON api_telemetry(agent_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON api_telemetry(timestamp);

-- Add hypertable for time-series optimization if TimescaleDB is available
-- Uncomment if using TimescaleDB
-- SELECT create_hypertable('api_telemetry', 'timestamp', if_not_exists => TRUE);

-- Add comments for documentation
COMMENT ON TABLE api_telemetry IS 'API usage telemetry for monitoring and analytics';
COMMENT ON COLUMN api_telemetry.endpoint IS 'The API endpoint that was accessed';
COMMENT ON COLUMN api_telemetry.agent_id IS 'Identifier for the agent/system making the request';
COMMENT ON COLUMN api_telemetry.timestamp IS 'When the request was made';
COMMENT ON COLUMN api_telemetry.request_data IS 'Additional data about the request';

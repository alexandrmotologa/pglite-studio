-- ==============================================================================
-- PGLite-Studio Demo: JSONB Documents & GIN Inverted Indexing
-- ==============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  service_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  metadata JSONB NOT NULL,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_logs (service_name, severity, metadata) VALUES
('auth-service', 'INFO', '{"user_id": 1042, "ip": "192.168.1.1", "action": "login", "mfa_used": true, "session": {"duration_min": 45, "device": "mobile"}}'),
('api-gateway', 'WARN', '{"endpoint": "/api/v2/embeddings", "status_code": 429, "rate_limit_remaining": 0, "client_id": "app_99"}'),
('worker-pool', 'ERROR', '{"task_id": "job_941", "retries": 3, "exception": "ConnectionTimeout", "duration_ms": 5002}'),
('storage-node', 'INFO', '{"bucket": "vectors", "bytes_transferred": 1048576, "compression": "zstd", "status": "ok"}'),
('api-gateway', 'INFO', '{"endpoint": "/api/v1/search", "status_code": 200, "latency_ms": 14, "client_id": "app_12"}')
ON CONFLICT DO NOTHING;

-- GIN inverted index on the JSONB document
CREATE INDEX IF NOT EXISTS system_logs_gin_idx
ON system_logs
USING gin (metadata);

-- Query using JSON path and containment operators
SELECT
  id,
  service_name,
  severity,
  metadata->>'endpoint' AS endpoint,
  (metadata->>'status_code')::int AS status_code,
  metadata->'session'->>'device' AS device,
  metadata->>'latency_ms' AS latency_ms
FROM system_logs
WHERE metadata ? 'status_code' OR metadata @> '{"mfa_used": true}';

-- ==============================================================================
-- PGLite-Studio Demo: HNSW Index vs Sequential Scan Benchmark
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS benchmark_embeddings (
  id SERIAL PRIMARY KEY,
  tag TEXT NOT NULL,
  vec vector(4) NOT NULL
);

-- Generate 100 sample vectors
INSERT INTO benchmark_embeddings (tag, vec)
SELECT
  'cluster_' || ((i % 4) + 1),
  ('[' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) ||
  ']')::vector
FROM generate_series(1, 100) AS i;

-- Query 1: Explain plan with sequential scan
EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)
SELECT id, tag, vec <=> '[0.5, 0.5, 0.5, 0.5]' AS distance
FROM benchmark_embeddings
ORDER BY distance
LIMIT 10;

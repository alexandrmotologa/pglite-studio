-- ==============================================================================
-- PGLite-Studio Demo: pgvector RAG Knowledge Base & Similarity Search
-- ==============================================================================

-- 1. Ensure the pgvector extension is activated
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the knowledge base documents table
CREATE TABLE IF NOT EXISTS rag_documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(4) NOT NULL
);

-- 3. Seed semantic knowledge chunks with synthetic 4D embeddings
INSERT INTO rag_documents (title, category, content, embedding) VALUES
('Vector Indexes in Postgres', 'databases', 'HNSW builds multi-layer proximity graphs for fast approximate nearest neighbor search.', '[0.91, 0.12, 0.35, 0.18]'),
('Relational ACID Transactions', 'databases', 'PostgreSQL provides MVCC and write-ahead logging to guarantee durability and consistency.', '[0.15, 0.88, 0.22, 0.40]'),
('Client-Side WebAssembly', 'frontend', 'WebAssembly enables native-speed compilation of C and Rust code inside browser workers.', '[0.28, 0.31, 0.89, 0.12]'),
('Transformer Embeddings', 'ai', 'Dense vector spaces represent tokens by projecting semantic contexts into continuous manifolds.', '[0.87, 0.25, 0.41, 0.09]'),
('B-Tree Query Optimization', 'databases', 'Postgres uses B-Tree indexes for equality and range filters on ordered data columns.', '[0.19, 0.92, 0.18, 0.32]'),
('Browser Storage via IndexedDB', 'frontend', 'IndexedDB offers asynchronous key-value persistence capable of storing binary blobs.', '[0.22, 0.29, 0.94, 0.11]')
ON CONFLICT DO NOTHING;

-- 4. Construct an HNSW index using cosine distance operator class
CREATE INDEX IF NOT EXISTS rag_documents_hnsw_idx
ON rag_documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Execute nearest-neighbor similarity search to query embedding [0.85, 0.20, 0.35, 0.15]
SELECT
  id,
  title,
  category,
  content,
  embedding,
  ROUND((1 - (embedding <=> '[0.85, 0.20, 0.35, 0.15]'))::numeric, 4) AS cosine_similarity,
  ROUND((embedding <=> '[0.85, 0.20, 0.35, 0.15]')::numeric, 4) AS cosine_distance
FROM rag_documents
ORDER BY embedding <=> '[0.85, 0.20, 0.35, 0.15]'
LIMIT 5;

import React from 'react'
import { Sparkles, ShoppingBag, Braces, Gauge, ArrowRight } from 'lucide-react'
import { Modal } from '../UI/Modal'
import { Badge } from '../UI/Badge'
import { useEditorStore } from '../../store/editorStore'
import { useUIStore } from '../../store/uiStore'

interface SampleDemo {
  id: string
  title: string
  category: string
  description: string
  icon: React.ReactNode
  badge: { text: string; variant: 'cyan' | 'indigo' | 'emerald' | 'amber' }
  sql: string
}

const SAMPLE_DEMOS: SampleDemo[] = [
  {
    id: 'rag-vector',
    title: 'pgvector RAG Similarity & HNSW Index',
    category: 'AI & Vectors',
    description: 'Creates a knowledge base with 4D embeddings, builds an HNSW index, and executes a cosine distance similarity query.',
    icon: <Sparkles size={16} className="text-cyan-400" />,
    badge: { text: 'pgvector', variant: 'cyan' },
    sql: `-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create knowledge base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  summary TEXT NOT NULL,
  embedding vector(4) NOT NULL
);

-- 3. Populate sample semantic embeddings
INSERT INTO knowledge_base (topic, summary, embedding) VALUES
('Vector Indexes', 'HNSW provides high recall nearest neighbor search.', '[0.91, 0.12, 0.35, 0.18]'),
('Relational Models', 'Postgres provides ACID compliance and robust SQL.', '[0.15, 0.88, 0.22, 0.40]'),
('WASM Runtimes', 'Running client-side databases directly in WebAssembly.', '[0.28, 0.31, 0.89, 0.12]'),
('Neural Embeddings', 'Dense vector representations learned by deep transformers.', '[0.87, 0.25, 0.41, 0.09]'),
('Index Optimization', 'B-Trees and GiST indexes accelerate query filtering.', '[0.19, 0.92, 0.18, 0.32]')
ON CONFLICT DO NOTHING;

-- 4. Build HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS knowledge_base_hnsw_idx
ON knowledge_base
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Query nearest neighbors to vector [0.85, 0.20, 0.35, 0.15]
SELECT
  id,
  topic,
  summary,
  embedding,
  ROUND((1 - (embedding <=> '[0.85, 0.20, 0.35, 0.15]'))::numeric, 4) AS similarity_score
FROM knowledge_base
ORDER BY embedding <=> '[0.85, 0.20, 0.35, 0.15]'
LIMIT 5;
`,
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce Schema & Multi-Table Joins',
    category: 'Relational',
    description: 'Realistic e-commerce database with customers, orders, order items, foreign keys, and aggregated analytics.',
    icon: <ShoppingBag size={16} className="text-indigo-400" />,
    badge: { text: 'Relational', variant: 'indigo' },
    sql: `-- E-Commerce Relational Schema
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  country TEXT NOT NULL DEFAULT 'US'
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  total_amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO customers (name, email, country) VALUES
('Elena Rostova', 'elena@techflow.io', 'DE'),
('Kenji Sato', 'kenji@datastack.dev', 'JP'),
('Sofia Chen', 'sofia@cloudbase.net', 'US')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, price, category) VALUES
('Mechanical Keyboard', 149.99, 'Hardware'),
('4K IPS Monitor', 399.00, 'Electronics'),
('Ergonomic Chair', 289.50, 'Furniture')
ON CONFLICT DO NOTHING;

INSERT INTO orders (customer_id, total_amount, status) VALUES
(1, 548.99, 'completed'),
(2, 149.99, 'pending'),
(3, 688.50, 'completed')
ON CONFLICT DO NOTHING;

-- Analytics Query with Joins and Aggregation
SELECT
  c.name AS customer_name,
  c.country,
  COUNT(o.id) AS total_orders,
  SUM(o.total_amount) AS total_spent
FROM customers c
JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.country
ORDER BY total_spent DESC;
`,
  },
  {
    id: 'jsonb-analytics',
    title: 'JSONB Documents & Inverted Indexing',
    category: 'Unstructured',
    description: 'Querying semi-structured JSONB payloads with path operators and GIN indexing.',
    icon: <Braces size={16} className="text-emerald-400" />,
    badge: { text: 'JSONB & GIN', variant: 'emerald' },
    sql: `-- JSONB Analytics & Inverted Indexing
CREATE TABLE IF NOT EXISTS telemetry_events (
  id SERIAL PRIMARY KEY,
  device_id UUID DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO telemetry_events (event_type, payload) VALUES
('click', '{"page": "/dashboard", "browser": "Chrome", "viewport": {"w": 1920, "h": 1080}, "duration_ms": 142}'),
('api_call', '{"endpoint": "/api/v1/search", "status": 200, "latency_ms": 18, "cached": true}'),
('api_call', '{"endpoint": "/api/v1/vectors", "status": 500, "latency_ms": 250, "error": "timeout"}'),
('scroll', '{"page": "/docs", "depth_percent": 84, "duration_ms": 4100}')
ON CONFLICT DO NOTHING;

-- Inverted GIN Index for fast path queries
CREATE INDEX IF NOT EXISTS telemetry_payload_gin_idx
ON telemetry_events USING gin (payload);

-- Query JSONB attributes using ->> and @>
SELECT
  id,
  event_type,
  payload->>'browser' AS browser,
  (payload->'viewport'->>'w')::int AS viewport_width,
  payload->>'latency_ms' AS latency
FROM telemetry_events
WHERE payload ? 'duration_ms' OR payload @> '{"cached": true}';
`,
  },
  {
    id: 'benchmark',
    title: 'Vector Search Benchmark: HNSW vs Scan',
    category: 'Performance',
    description: 'Generates 100 high-dimensional vector embeddings to compare execution plan times between Sequential Scan and HNSW Index Scan.',
    icon: <Gauge size={16} className="text-amber-400" />,
    badge: { text: 'Benchmark', variant: 'amber' },
    sql: `-- Benchmark: Sequential Scan vs HNSW
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS benchmark_items (
  id SERIAL PRIMARY KEY,
  embedding vector(8) NOT NULL
);

-- Insert synthetic high-dimensional vectors
INSERT INTO benchmark_items (embedding)
SELECT
  ('[' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) || ',' ||
    ROUND(random()::numeric, 4) ||
  ']')::vector
FROM generate_series(1, 100);

-- Explain execution plan on vector distance query
EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)
SELECT id, embedding <=> '[0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]' AS distance
FROM benchmark_items
ORDER BY distance
LIMIT 10;
`,
  },
]

export const SampleQueriesModal: React.FC = () => {
  const { samplesModalOpen, setSamplesModalOpen } = useUIStore()
  const { addTab } = useEditorStore()

  const handleSelectSample = (sample: SampleDemo) => {
    addTab(`${sample.title}.sql`, sample.sql)
    setSamplesModalOpen(false)
  }

  return (
    <Modal
      isOpen={samplesModalOpen}
      onClose={() => setSamplesModalOpen(false)}
      title="Sample Workbenches & Vector Demos"
      subtitle="Select a pre-built schema to test pgvector, relational joins, or JSONB analytics"
      maxWidth="lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SAMPLE_DEMOS.map((sample) => (
          <div
            key={sample.id}
            onClick={() => handleSelectSample(sample)}
            className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/50 cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    {sample.icon}
                  </div>
                  <span className="text-xs font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors">
                    {sample.title}
                  </span>
                </div>
                <Badge variant={sample.badge.variant} size="xs">
                  {sample.badge.text}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                {sample.description}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
              <span className="text-[11px]">{sample.category}</span>
              <span className="text-cyan-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-[11px]">
                Load Query <ArrowRight size={12} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

# Architecture Overview: PGLite-Studio

PGLite-Studio executes PostgreSQL 16 directly inside browser WebAssembly via `@electric-sql/pglite`. The entire stack operates on the client device without server instances, cloud database clusters, or Docker daemons.

## System Diagram

```
+-------------------------------------------------------+
|                    Browser Main Thread                |
|                                                       |
|   +---------------------+   +---------------------+   |
|   |  Monaco SQL Editor  |   |  Interactive UI     |   |
|   |  Autocompletion     |   |  Sidebar Catalog    |   |
|   +----------+----------+   +----------+----------+   |
|              |                         |              |
|              +------------+------------+              |
|                           |                           |
|                    PGLiteClient                       |
|           (Request / Response Message Bus)            |
+---------------------------+---------------------------+
                            | Web Worker PostMessage
                            v
+-------------------------------------------------------+
|            Dedicated Web Worker (pglite.worker.ts)     |
|                                                       |
|   +-----------------------------------------------+   |
|   | PGlite WebAssembly Engine (PostgreSQL 16)     |   |
|   |                                               |   |
|   |  * Extension: pgvector (HNSW, IVFFlat, <=>)   |   |
|   |  * Extension: uuid-ossp, pg_trgm              |   |
|   |  * In-Memory Virtual File System (MEMFS)      |   |
|   +-----------------------+-----------------------+   |
|                           |                           |
|                           v                           |
|   +-----------------------------------------------+   |
|   | Browser IndexedDB Storage Adapter (IDBFS)     |   |
|   | Namespaced database branches:                 |   |
|   | - idb://pglite-studio-main                    |   |
|   | - idb://pglite-studio-<branch_id>             |   |
|   +-----------------------------------------------+   |
+---------------------------+---------------------------+
                            |
           QueryResult / EXPLAIN Output Stream
                            v
+-------------------------------------------------------+
|                   Results Viewport                    |
|                                                       |
|  * DataGrid: Virtualized sorting, filtering, CSV/JSON |
|  * Visual EXPLAIN: React Flow DAG tree with warnings  |
|  * 2D/3D Scatter: Canvas PCA projection & KNN cosine  |
|  * Messages: PostgreSQL notices and error diagnostics |
+-------------------------------------------------------+
```

## Core Modules

### 1. Web Worker Isolation (`src/worker/pglite.worker.ts`)
Long-running queries and heavy vector arithmetic run off the UI thread inside a dedicated Web Worker. If a query runs an infinite loop or allocates excessive memory, the main thread remains interactive. The client can terminate and respawn the worker without freezing the browser tab.

### 2. Dimensionality Reduction Engine (`src/engine/pca.ts`)
Machine learning embeddings commonly use 384, 768, or 1536 dimensions. PGLite-Studio includes a client-side Principal Component Analysis implementation:
- Centers vector coordinates around the empirical mean.
- Constructs the sample covariance matrix.
- Computes the top 2 or 3 principal eigenvectors via power iteration with deflation.
- Projects the vectors into 2D or 3D coordinate space with explained variance metrics.
- Provides interactive k-nearest-neighbor cosine distance calculation directly on the canvas.

### 3. Execution Plan Parser (`src/engine/explainParser.ts`)
Parses `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)` output into a hierarchical tree layout:
- Calculates exclusive operation duration by subtracting child operator times from parent totals.
- Identifies the query bottleneck operator.
- Flags sequential scans on large row counts and discrepancies between planner estimates and actual rows.

### 4. Branching and Persistence (`src/store/dbStore.ts`)
Databases persist in browser IndexedDB under branch-specific prefixes (`idb://pglite-studio-<branch>`). Switching branches loads the corresponding database partition, enabling users to test migrations and destructive DDL without risking the baseline dataset.

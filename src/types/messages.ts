import { DatabaseCatalog, QueryResult } from './database'
import { PostgresExplainOutput } from './explain'

export type WorkerRequest =
  | { type: 'INIT'; branchId: string; storageType: 'idb' | 'memory' }
  | { type: 'QUERY'; id: string; sql: string }
  | { type: 'EXPLAIN'; id: string; sql: string }
  | { type: 'EXEC'; id: string; sql: string }
  | { type: 'FETCH_CATALOG'; id: string }
  | { type: 'EXPORT_SQL'; id: string }
  | { type: 'IMPORT_SQL'; id: string; sql: string }
  | { type: 'RESET_BRANCH'; id: string; branchId: string }

export type WorkerResponse =
  | { type: 'INIT_OK'; branchId: string; extensions: string[] }
  | { type: 'INIT_ERROR'; error: string }
  | { type: 'QUERY_OK'; id: string; result: QueryResult }
  | { type: 'QUERY_ERROR'; id: string; error: string; line?: number; detail?: string }
  | { type: 'EXPLAIN_OK'; id: string; planOutput: PostgresExplainOutput; executionTimeMs: number }
  | { type: 'EXPLAIN_ERROR'; id: string; error: string }
  | { type: 'CATALOG_OK'; id: string; catalog: DatabaseCatalog }
  | { type: 'CATALOG_ERROR'; id: string; error: string }
  | { type: 'EXPORT_OK'; id: string; sql: string }
  | { type: 'EXPORT_ERROR'; id: string; error: string }
  | { type: 'IMPORT_OK'; id: string; affectedQueries: number }
  | { type: 'IMPORT_ERROR'; id: string; error: string }
  | { type: 'RESET_OK'; id: string }
  | { type: 'RESET_ERROR'; id: string; error: string }
  | { type: 'NOTICE'; message: string; severity?: string }

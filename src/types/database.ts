export interface ColumnMeta {
  name: string
  dataType: string
  isNullable: boolean
  defaultValue: string | null
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignTable?: string
  foreignColumn?: string
  isVector: boolean
  vectorDimensions?: number
}

export interface IndexMeta {
  name: string
  definition: string
  isUnique: boolean
  isPrimary: boolean
  indexType: string // btree, hnsw, ivfflat, gin, gist, etc.
}

export interface TableSchema {
  name: string
  schema: string
  columns: ColumnMeta[]
  rowEstimate: number
  indexes: IndexMeta[]
  primaryKey?: string[]
}

export interface DatabaseCatalog {
  schemas: string[]
  tables: TableSchema[]
  views: TableSchema[]
  extensions: Array<{
    name: string
    installed: boolean
    version?: string
    defaultVersion?: string
    comment?: string
  }>
}

export interface QueryField {
  name: string
  dataTypeID: number
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  fields?: QueryField[]
  executionTimeMs: number
  rowCount: number
  affectedRows?: number
  command?: string
  hasVectorColumn?: boolean
  vectorColumns?: string[]
}

export interface Branch {
  id: string
  name: string
  createdAt: number
  isCurrent: boolean
  databaseName: string
}

export interface QueryHistoryItem {
  id: string
  sql: string
  timestamp: number
  durationMs: number
  success: boolean
  rowCount?: number
  error?: string
}

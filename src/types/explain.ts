export interface PostgresPlanNode {
  'Node Type': string
  'Parent Relationship'?: string
  'Relation Name'?: string
  'Schema'?: string
  'Alias'?: string
  'Startup Cost': number
  'Total Cost': number
  'Plan Rows': number
  'Plan Width'?: number
  'Actual Startup Time'?: number
  'Actual Total Time'?: number
  'Actual Rows'?: number
  'Actual Loops'?: number
  'Shared Hit Blocks'?: number
  'Shared Read Blocks'?: number
  'Shared Dirtied Blocks'?: number
  'Shared Written Blocks'?: number
  'Local Hit Blocks'?: number
  'Local Read Blocks'?: number
  'Index Name'?: string
  'Scan Direction'?: string
  'Index Cond'?: string
  'Filter'?: string
  'Rows Removed by Filter'?: number
  'Hash Cond'?: string
  'Join Type'?: string
  'Sort Key'?: string[]
  'Sort Method'?: string
  'Sort Space Used'?: number
  'Sort Space Type'?: string
  'Output'?: string[]
  'Plans'?: PostgresPlanNode[]
  [key: string]: unknown
}

export interface PostgresExplainOutput {
  Plan: PostgresPlanNode
  'Planning Time'?: number
  'Execution Time'?: number
  Triggers?: unknown[]
}

export interface ExplainNodeData extends Record<string, unknown> {
  id: string
  nodeType: string
  relationName?: string
  indexName?: string
  joinType?: string
  totalCost: number
  startupCost: number
  planRows: number
  actualRows?: number
  actualTotalTime?: number
  actualStartupTime?: number
  exclusiveTime?: number
  timePercent?: number
  costPercent?: number
  isBottleneck?: boolean
  warning?: string
  filter?: string
  rowsRemovedByFilter?: number
  indexCond?: string
  hashCond?: string
  sharedHitBlocks?: number
  sharedReadBlocks?: number
  raw: PostgresPlanNode
}

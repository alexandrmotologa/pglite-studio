import { PGlite } from '@electric-sql/pglite'
import type { Extension } from '@electric-sql/pglite'
import { DatabaseCatalog, QueryResult, TableSchema, ColumnMeta, IndexMeta } from '../types/database'
import { PostgresExplainOutput } from '../types/explain'
import { WorkerRequest, WorkerResponse } from '../types/messages'

let db: PGlite | null = null
let currentBranchId = 'main'
let currentStorageType: 'idb' | 'memory' = 'idb'

// Custom vector extension loader resolving from /vector.pkg in public root
const vectorExtension: Extension = {
  name: 'vector',
  setup: async (_pg, emscriptenOpts) => {
    const bundleUrl = new URL('/vector.pkg', self.location.origin)
    return {
      emscriptenOpts,
      bundlePath: bundleUrl,
    }
  },
}

function sendResponse(res: WorkerResponse) {
  postMessage(res)
}

function sendNotice(message: string, severity = 'INFO') {
  sendResponse({ type: 'NOTICE', message, severity })
}

function detectVectorValue(val: unknown): boolean {
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const parts = trimmed.slice(1, -1).split(',')
      return parts.length > 0 && parts.every((p) => !isNaN(Number(p.trim())))
    }
  }
  return false
}

function stripComments(sql: string): string {
  let s = sql.replace(/--.*$/gm, '')
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')
  return s.trim()
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    if (ch === "'" && (i === 0 || sql[i - 1] !== '\\')) {
      inSingleQuote = !inSingleQuote
      current += ch
    } else if (ch === '"' && (i === 0 || sql[i - 1] !== '\\')) {
      inDoubleQuote = !inDoubleQuote
      current += ch
    } else if (ch === ';' && !inSingleQuote && !inDoubleQuote) {
      if (current.trim().length > 0) {
        statements.push(current.trim())
      }
      current = ''
    } else {
      current += ch
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim())
  }

  return statements
}

async function initDatabase(branchId: string, storageType: 'idb' | 'memory') {
  if (db) {
    try {
      await db.close()
    } catch {
      // ignore close error
    }
    db = null
  }

  currentBranchId = branchId
  currentStorageType = storageType
  const dataDir = storageType === 'idb' ? `idb://pglite-studio-${branchId}` : undefined

  try {
    db = new PGlite(dataDir, {
      extensions: {
        vector: vectorExtension,
      },
    })

    await db.waitReady

    // Enable vector extension automatically
    await db.exec('CREATE EXTENSION IF NOT EXISTS vector;')

    sendResponse({
      type: 'INIT_OK',
      branchId,
      extensions: ['vector', 'pg_trgm', 'uuid-ossp'],
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    sendResponse({ type: 'INIT_ERROR', error: errorMsg })
  }
}

async function runQuery(id: string, sql: string) {
  if (!db) {
    sendResponse({ type: 'QUERY_ERROR', id, error: 'Database engine is not initialized' })
    return
  }

  const start = performance.now()
  try {
    const statements = splitSqlStatements(sql)
    if (statements.length === 0) {
      throw new Error('No SQL statements found to execute')
    }

    const lastStmt = statements[statements.length - 1]
    const strippedLast = stripComments(lastStmt)
    const isSelect = /^(\s*SELECT|\s*WITH|\s*VALUES|\s*TABLE|\s*EXPLAIN)/i.test(strippedLast)

    // Execute preceding statements if any
    if (statements.length > 1) {
      const preceding = statements.slice(0, -1).join(';\n') + ';'
      await db.exec(preceding)
    }

    if (isSelect) {
      const res = await db.query(lastStmt)
      const duration = performance.now() - start

      const columns = res.fields.map((f) => f.name)
      const rows = res.rows as Record<string, unknown>[]

      const vectorCols: string[] = []
      if (rows.length > 0) {
        for (const col of columns) {
          const sample = rows.find((r) => r[col] !== null && r[col] !== undefined)?.[col]
          if (detectVectorValue(sample)) {
            vectorCols.push(col)
          }
        }
      }

      const queryResult: QueryResult = {
        columns,
        rows,
        fields: res.fields.map((f) => ({ name: f.name, dataTypeID: f.dataTypeID })),
        executionTimeMs: Number(duration.toFixed(2)),
        rowCount: rows.length,
        hasVectorColumn: vectorCols.length > 0,
        vectorColumns: vectorCols,
      }

      sendResponse({ type: 'QUERY_OK', id, result: queryResult })
    } else {
      await db.exec(lastStmt)
      const duration = performance.now() - start

      const queryResult: QueryResult = {
        columns: ['status'],
        rows: [{ status: 'Query executed successfully' }],
        executionTimeMs: Number(duration.toFixed(2)),
        rowCount: 1,
        affectedRows: 1,
      }

      sendResponse({ type: 'QUERY_OK', id, result: queryResult })
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    sendResponse({ type: 'QUERY_ERROR', id, error: errorMsg })
  }
}

async function runExplain(id: string, sql: string) {
  if (!db) {
    sendResponse({ type: 'EXPLAIN_ERROR', id, error: 'Database engine is not initialized' })
    return
  }

  const start = performance.now()
  try {
    const statements = splitSqlStatements(sql)
    if (statements.length === 0) {
      throw new Error('No SQL statements found to explain')
    }

    // Execute preceding setup queries if multi-statement script
    if (statements.length > 1) {
      const preceding = statements.slice(0, -1).join(';\n') + ';'
      await db.exec(preceding)
    }

    let targetSql = stripComments(statements[statements.length - 1])
    if (targetSql.endsWith(';')) {
      targetSql = targetSql.slice(0, -1).trim()
    }

    if (!/^EXPLAIN/i.test(targetSql)) {
      targetSql = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${targetSql}`
    } else if (!/FORMAT\s+JSON/i.test(targetSql)) {
      targetSql = targetSql.replace(/EXPLAIN/i, 'EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)')
    }

    const res = await db.query(targetSql)
    const duration = performance.now() - start

    if (res.rows.length === 0) {
      throw new Error('No execution plan returned')
    }

    const firstRow = res.rows[0] as Record<string, unknown>
    const planKey = Object.keys(firstRow)[0]
    let planData = firstRow[planKey]

    if (typeof planData === 'string') {
      planData = JSON.parse(planData)
    }

    const planOutput = Array.isArray(planData) ? planData[0] : (planData as PostgresExplainOutput)

    sendResponse({
      type: 'EXPLAIN_OK',
      id,
      planOutput,
      executionTimeMs: Number(duration.toFixed(2)),
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    sendResponse({ type: 'EXPLAIN_ERROR', id, error: errorMsg })
  }
}

async function fetchCatalog(id: string) {
  if (!db) {
    sendResponse({ type: 'CATALOG_ERROR', id, error: 'Database engine is not initialized' })
    return
  }

  try {
    // 1. Schemas
    const schemasRes = await db.query<{ schema_name: string }>(`
      SELECT schema_name FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
      ORDER BY schema_name;
    `)
    const schemas = schemasRes.rows.map((r) => r.schema_name)

    // 2. Tables and Views
    const tablesRes = await db.query<{
      table_schema: string
      table_name: string
      table_type: string
    }>(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name;
    `)

    // 3. Columns
    const colsRes = await db.query<{
      table_schema: string
      table_name: string
      column_name: string
      data_type: string
      udt_name: string
      is_nullable: string
      column_default: string | null
      full_type: string | null
    }>(`
      SELECT
        c.table_schema,
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as full_type
      FROM information_schema.columns c
      LEFT JOIN pg_catalog.pg_class cl ON cl.relname = c.table_name
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = cl.relnamespace AND n.nspname = c.table_schema
      LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = cl.oid AND a.attname = c.column_name
      WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY c.table_schema, c.table_name, c.ordinal_position;
    `)

    // 4. Primary Keys
    const pksRes = await db.query<{
      table_schema: string
      table_name: string
      column_name: string
    }>(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY';
    `)

    // 5. Foreign Keys
    const fksRes = await db.query<{
      table_schema: string
      table_name: string
      column_name: string
      foreign_table_name: string
      foreign_column_name: string
    }>(`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY';
    `)

    // 6. Indexes
    const idxRes = await db.query<{
      schemaname: string
      tablename: string
      indexname: string
      indexdef: string
    }>(`
      SELECT schemaname, tablename, indexname, indexdef
      FROM pg_catalog.pg_indexes
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema');
    `)

    // 7. Extensions
    const extRes = await db.query<{
      name: string
      installed_version: string | null
      default_version: string | null
      comment: string | null
    }>(`
      SELECT name, installed_version, default_version, comment
      FROM pg_catalog.pg_available_extensions
      ORDER BY (installed_version IS NOT NULL) DESC, name ASC;
    `)

    // Build map
    const pksByTable = new Map<string, string[]>()
    for (const pk of pksRes.rows) {
      const key = `${pk.table_schema}.${pk.table_name}`
      const arr = pksByTable.get(key) || []
      arr.push(pk.column_name)
      pksByTable.set(key, arr)
    }

    const fksByCol = new Map<string, { foreignTable: string; foreignColumn: string }>()
    for (const fk of fksRes.rows) {
      const key = `${fk.table_schema}.${fk.table_name}.${fk.column_name}`
      fksByCol.set(key, {
        foreignTable: fk.foreign_table_name,
        foreignColumn: fk.foreign_column_name,
      })
    }

    const idxsByTable = new Map<string, IndexMeta[]>()
    for (const idx of idxRes.rows) {
      const key = `${idx.schemaname}.${idx.tablename}`
      const arr = idxsByTable.get(key) || []
      const def = idx.indexdef
      const isUnique = /UNIQUE/i.test(def)
      let indexType = 'btree'
      if (/USING\s+hnsw/i.test(def)) indexType = 'hnsw'
      else if (/USING\s+ivfflat/i.test(def)) indexType = 'ivfflat'
      else if (/USING\s+gin/i.test(def)) indexType = 'gin'
      else if (/USING\s+gist/i.test(def)) indexType = 'gist'

      arr.push({
        name: idx.indexname,
        definition: def,
        isUnique,
        isPrimary: idx.indexname.endsWith('_pkey'),
        indexType,
      })
      idxsByTable.set(key, arr)
    }

    const colsByTable = new Map<string, ColumnMeta[]>()
    for (const col of colsRes.rows) {
      const tableKey = `${col.table_schema}.${col.table_name}`
      const colKey = `${tableKey}.${col.column_name}`
      const arr = colsByTable.get(tableKey) || []
      const pkList = pksByTable.get(tableKey) || []
      const fk = fksByCol.get(colKey)

      const isVector =
        col.data_type === 'USER-DEFINED' && (col.udt_name === 'vector' || (col.full_type?.includes('vector') ?? false))

      let vectorDimensions: number | undefined
      if (isVector && col.full_type) {
        const match = col.full_type.match(/vector\((\d+)\)/)
        if (match) {
          vectorDimensions = parseInt(match[1], 10)
        }
      }

      arr.push({
        name: col.column_name,
        dataType: col.full_type || col.data_type,
        isNullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        isPrimaryKey: pkList.includes(col.column_name),
        isForeignKey: !!fk,
        foreignTable: fk?.foreignTable,
        foreignColumn: fk?.foreignColumn,
        isVector,
        vectorDimensions,
      })
      colsByTable.set(tableKey, arr)
    }

    const tables: TableSchema[] = []
    const views: TableSchema[] = []

    for (const t of tablesRes.rows) {
      const key = `${t.table_schema}.${t.table_name}`
      const schemaItem: TableSchema = {
        name: t.table_name,
        schema: t.table_schema,
        columns: colsByTable.get(key) || [],
        rowEstimate: 0,
        indexes: idxsByTable.get(key) || [],
        primaryKey: pksByTable.get(key),
      }

      if (t.table_type === 'VIEW') {
        views.push(schemaItem)
      } else {
        tables.push(schemaItem)
      }
    }

    const catalog: DatabaseCatalog = {
      schemas,
      tables,
      views,
      extensions: extRes.rows.map((e) => ({
        name: e.name,
        installed: e.installed_version !== null,
        version: e.installed_version || undefined,
        defaultVersion: e.default_version || undefined,
        comment: e.comment || undefined,
      })),
    }

    sendResponse({ type: 'CATALOG_OK', id, catalog })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    sendResponse({ type: 'CATALOG_ERROR', id, error: errorMsg })
  }
}

async function exportSql(id: string) {
  if (!db) {
    sendResponse({ type: 'EXPORT_ERROR', id, error: 'Database engine is not initialized' })
    return
  }

  try {
    const tablesRes = await db.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `)

    let dump = `-- PGLite-Studio Export
-- Generated at: ${new Date().toISOString()}
-- Branch: ${currentBranchId}

CREATE EXTENSION IF NOT EXISTS vector;

`

    for (const tbl of tablesRes.rows) {
      const tName = tbl.table_name
      const colsRes = await db.query<{
        column_name: string
        full_type: string
        is_nullable: string
        column_default: string | null
      }>(`
        SELECT
          c.column_name,
          pg_catalog.format_type(a.atttypid, a.atttypmod) as full_type,
          c.is_nullable,
          c.column_default
        FROM information_schema.columns c
        JOIN pg_catalog.pg_class cl ON cl.relname = c.table_name
        JOIN pg_catalog.pg_attribute a ON a.attrelid = cl.oid AND a.attname = c.column_name
        WHERE c.table_name = '${tName}' AND c.table_schema = 'public'
        ORDER BY c.ordinal_position;
      `)

      dump += `-- Table: ${tName}\n`
      dump += `CREATE TABLE IF NOT EXISTS "${tName}" (\n`
      const colDefs = colsRes.rows.map((c) => {
        let def = `  "${c.column_name}" ${c.full_type || 'TEXT'}`
        if (c.is_nullable === 'NO') def += ' NOT NULL'
        if (c.column_default) def += ` DEFAULT ${c.column_default}`
        return def
      })
      dump += colDefs.join(',\n')
      dump += `\n);\n\n`

      // Data rows
      const dataRes = await db.query(`SELECT * FROM "${tName}";`)
      if (dataRes.rows.length > 0) {
        dump += `-- Data for ${tName} (${dataRes.rows.length} rows)\n`
        for (const row of dataRes.rows as Record<string, unknown>[]) {
          const keys = Object.keys(row)
          const vals = keys.map((k) => {
            const val = row[k]
            if (val === null || val === undefined) return 'NULL'
            if (typeof val === 'number' || typeof val === 'boolean') return String(val)
            const strVal = String(val).replace(/'/g, "''")
            return `'${strVal}'`
          })
          dump += `INSERT INTO "${tName}" ("${keys.join('", "')}") VALUES (${vals.join(', ')});\n`
        }
        dump += `\n`
      }
    }

    sendResponse({ type: 'EXPORT_OK', id, sql: dump })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    sendResponse({ type: 'EXPORT_ERROR', id, error: errorMsg })
  }
}

async function importSql(id: string, sql: string) {
  if (!db) {
    sendResponse({ type: 'IMPORT_ERROR', id, error: 'Database engine is not initialized' })
    return
  }

  try {
    await db.exec(sql)
    sendResponse({ type: 'IMPORT_OK', id, affectedQueries: 1 })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    sendResponse({ type: 'IMPORT_ERROR', id, error: errorMsg })
  }
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data

  switch (req.type) {
    case 'INIT':
      await initDatabase(req.branchId, req.storageType)
      break
    case 'QUERY':
      await runQuery(req.id, req.sql)
      break
    case 'EXPLAIN':
      await runExplain(req.id, req.sql)
      break
    case 'EXEC':
      await runQuery(req.id, req.sql)
      break
    case 'FETCH_CATALOG':
      await fetchCatalog(req.id)
      break
    case 'EXPORT_SQL':
      await exportSql(req.id)
      break
    case 'IMPORT_SQL':
      await importSql(req.id, req.sql)
      break
    case 'RESET_BRANCH':
      await initDatabase(req.branchId, currentStorageType)
      sendResponse({ type: 'INIT_OK', branchId: req.branchId, extensions: ['vector'] })
      break
    default:
      break
  }
}

import { ColumnMeta } from '../types/database'

const SAMPLE_NAMES = [
  'Alice Morgan', 'Marcus Vance', 'Elena Rostova', 'Kenji Sato',
  'Sofia Chen', 'David Kim', 'Amara Patel', 'Lucas Silva',
  'Claire Dupont', 'Tariq Al-Mansoor', 'Oliver Brown', 'Emma Wilson'
]

const SAMPLE_DOMAINS = ['techflow.io', 'datastack.dev', 'vectorpulse.ai', 'cloudbase.net', 'postgres.org']

const SAMPLE_TITLES = [
  'Introduction to Vector Embeddings',
  'PostgreSQL Indexing Strategies and Tuning',
  'Understanding Approximate Nearest Neighbors with HNSW',
  'Microservice Architecture Patterns in Go',
  'Deep Dive into WebAssembly and Client-Side Storage',
  'Query Optimization with EXPLAIN ANALYZE',
  'Real-Time CDC Pipelines with Postgres WAL',
  'Designing Scalable Multi-Tenant Relational Schemas'
]

const SAMPLE_TAGS = ['database', 'ai', 'search', 'devops', 'algorithms', 'storage', 'performance']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min
  return Number(val.toFixed(decimals))
}

function generateRandomVector(dimensions: number): string {
  const values: number[] = []
  let sumSq = 0
  for (let i = 0; i < dimensions; i++) {
    const v = (Math.random() - 0.5) * 2
    values.push(v)
    sumSq += v * v
  }
  const norm = Math.sqrt(sumSq) || 1
  const normalized = values.map((v) => Number((v / norm).toFixed(5)))
  return `[${normalized.join(',')}]`
}

function generateMockValue(column: ColumnMeta, rowIndex: number): string {
  const colName = column.name.toLowerCase()
  const dType = column.dataType.toLowerCase()

  // Primary key auto-increment
  if (column.isPrimaryKey && (dType.includes('int') || dType.includes('serial'))) {
    return String(rowIndex + 1)
  }

  // Vector types
  if (column.isVector || dType.includes('vector')) {
    const dims = column.vectorDimensions || 3
    return `'${generateRandomVector(dims)}'`
  }

  // UUID
  if (dType.includes('uuid')) {
    const u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
    return `'${u}'`
  }

  // Email
  if (colName.includes('email')) {
    const name = randomItem(SAMPLE_NAMES).toLowerCase().replace(' ', '.')
    const domain = randomItem(SAMPLE_DOMAINS)
    return `'${name}_${rowIndex}@${domain}'`
  }

  // Name
  if (colName.includes('name') || colName.includes('author')) {
    return `'${randomItem(SAMPLE_NAMES)}'`
  }

  // Title / Subject
  if (colName.includes('title') || colName.includes('subject')) {
    return `'${randomItem(SAMPLE_TITLES)}'`
  }

  // Status / Category
  if (colName.includes('status')) {
    return `'${randomItem(['active', 'pending', 'archived', 'completed'])}'`
  }
  if (colName.includes('category') || colName.includes('tag')) {
    return `'${randomItem(SAMPLE_TAGS)}'`
  }

  // Boolean
  if (dType.includes('bool')) {
    return Math.random() > 0.5 ? 'TRUE' : 'FALSE'
  }

  // Numeric types
  if (dType.includes('int') || dType.includes('serial')) {
    if (colName.includes('price') || colName.includes('amount') || colName.includes('cost')) {
      return String(randomInt(10, 5000))
    }
    if (colName.includes('age')) {
      return String(randomInt(18, 75))
    }
    return String(randomInt(1, 1000))
  }

  if (dType.includes('numeric') || dType.includes('float') || dType.includes('double') || dType.includes('real')) {
    if (colName.includes('price') || colName.includes('cost')) {
      return String(randomFloat(9.99, 999.99, 2))
    }
    if (colName.includes('rating') || colName.includes('score')) {
      return String(randomFloat(1.0, 5.0, 1))
    }
    return String(randomFloat(0.01, 100.0, 2))
  }

  // Date & Timestamp
  if (dType.includes('timestamp') || dType.includes('date')) {
    const pastDays = randomInt(1, 365)
    const d = new Date(Date.now() - pastDays * 24 * 60 * 60 * 1000)
    return `'${d.toISOString()}'`
  }

  // JSON / JSONB
  if (dType.includes('json')) {
    const meta = {
      views: randomInt(10, 5000),
      rating: randomFloat(3.5, 5.0, 1),
      verified: Math.random() > 0.3,
      tags: [randomItem(SAMPLE_TAGS), randomItem(SAMPLE_TAGS)],
    }
    return `'${JSON.stringify(meta)}'`
  }

  // Fallback text
  return `'Sample text ${rowIndex + 1}'`
}

export function generateInsertSql(
  tableName: string,
  columns: ColumnMeta[],
  rowCount: number
): string {
  // Filter out auto-generated serial columns if preferred, or include all non-generated
  const targetCols = columns.filter((c) => {
    const isAutoSerial =
      c.isPrimaryKey &&
      (c.defaultValue?.includes('nextval') || c.dataType.toLowerCase().includes('serial'))
    return !isAutoSerial
  })

  if (targetCols.length === 0) return ''

  const colNames = targetCols.map((c) => `"${c.name}"`).join(', ')
  const valueRows: string[] = []

  for (let i = 0; i < rowCount; i++) {
    const vals = targetCols.map((col) => generateMockValue(col, i))
    valueRows.push(`  (${vals.join(', ')})`)
  }

  return `INSERT INTO "${tableName}" (${colNames})\nVALUES\n${valueRows.join(',\n')};\n`
}

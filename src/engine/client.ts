import { DatabaseCatalog, QueryResult } from '../types/database'
import { PostgresExplainOutput } from '../types/explain'
import { WorkerRequest, WorkerResponse } from '../types/messages'

type Resolver<T> = {
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
  timer?: number
}

export class PGLiteClient {
  private worker: Worker | null = null
  private pendingRequests = new Map<string, Resolver<unknown>>()
  private noticeListeners: Set<(msg: string, severity?: string) => void> = new Set()
  private isReady = false
  private currentBranch = 'main'
  private currentStorage: 'idb' | 'memory' = 'idb'

  constructor() {
    this.createWorker()
  }

  private createWorker() {
    if (this.worker) {
      this.worker.terminate()
    }

    this.worker = new Worker(new URL('../worker/pglite.worker.ts', import.meta.url), {
      type: 'module',
    })

    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      this.handleMessage(e.data)
    }

    this.worker.onerror = (err) => {
      console.error('PGLite Worker Error:', err)
    }
  }

  private handleMessage(msg: WorkerResponse) {
    if (msg.type === 'NOTICE') {
      this.noticeListeners.forEach((cb) => cb(msg.message, msg.severity))
      return
    }

    if (msg.type === 'INIT_OK') {
      this.isReady = true
      const pending = this.pendingRequests.get('init')
      if (pending) {
        pending.resolve(msg)
        this.pendingRequests.delete('init')
      }
      return
    }

    if (msg.type === 'INIT_ERROR') {
      this.isReady = false
      const pending = this.pendingRequests.get('init')
      if (pending) {
        pending.reject(new Error(msg.error))
        this.pendingRequests.delete('init')
      }
      return
    }

    const id = 'id' in msg ? msg.id : undefined
    if (!id) return

    const pending = this.pendingRequests.get(id)
    if (!pending) return

    this.pendingRequests.delete(id)
    if (pending.timer) clearTimeout(pending.timer)

    switch (msg.type) {
      case 'QUERY_OK':
        pending.resolve(msg.result)
        break
      case 'QUERY_ERROR':
        pending.reject(new Error(msg.error))
        break
      case 'EXPLAIN_OK':
        pending.resolve({ planOutput: msg.planOutput, executionTimeMs: msg.executionTimeMs })
        break
      case 'EXPLAIN_ERROR':
        pending.reject(new Error(msg.error))
        break
      case 'CATALOG_OK':
        pending.resolve(msg.catalog)
        break
      case 'CATALOG_ERROR':
        pending.reject(new Error(msg.error))
        break
      case 'EXPORT_OK':
        pending.resolve(msg.sql)
        break
      case 'EXPORT_ERROR':
        pending.reject(new Error(msg.error))
        break
      case 'IMPORT_OK':
        pending.resolve(msg.affectedQueries)
        break
      case 'IMPORT_ERROR':
        pending.reject(new Error(msg.error))
        break
    }
  }

  private send<T>(req: WorkerRequest, timeoutMs = 60000): Promise<T> {
    const id = 'id' in req ? req.id : 'init'
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Query timed out after ${timeoutMs / 1000}s`))
      }, timeoutMs)

      this.pendingRequests.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      })

      this.worker?.postMessage(req)
    })
  }

  private initPromise: Promise<void> | null = null

  public async init(branchId = 'main', storageType: 'idb' | 'memory' = 'idb'): Promise<void> {
    if (this.initPromise && this.currentBranch === branchId && this.currentStorage === storageType) {
      return this.initPromise
    }
    this.currentBranch = branchId
    this.currentStorage = storageType
    this.initPromise = (async () => {
      await this.send<WorkerResponse>({
        type: 'INIT',
        branchId,
        storageType,
      })
    })().finally(() => {
      this.initPromise = null
    })
    return this.initPromise
  }

  public async query(sql: string): Promise<QueryResult> {
    const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    return this.send<QueryResult>({ type: 'QUERY', id, sql })
  }

  public async explain(
    sql: string
  ): Promise<{ planOutput: PostgresExplainOutput; executionTimeMs: number }> {
    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    return this.send<{ planOutput: PostgresExplainOutput; executionTimeMs: number }>({
      type: 'EXPLAIN',
      id,
      sql,
    })
  }

  public async fetchCatalog(): Promise<DatabaseCatalog> {
    const id = `cat_${Date.now()}`
    return this.send<DatabaseCatalog>({ type: 'FETCH_CATALOG', id })
  }

  public async exportSql(): Promise<string> {
    const id = `exp_sql_${Date.now()}`
    return this.send<string>({ type: 'EXPORT_SQL', id })
  }

  public async importSql(sql: string): Promise<number> {
    const id = `imp_sql_${Date.now()}`
    return this.send<number>({ type: 'IMPORT_SQL', id, sql })
  }

  public cancelRunningQuery(): void {
    // If a long query is hanging, terminate and re-create worker
    this.createWorker()
    // Re-init database
    this.init(this.currentBranch, this.currentStorage).catch(console.error)
    // Reject all pending
    this.pendingRequests.forEach((p) => {
      p.reject(new Error('Query execution was cancelled by user'))
    })
    this.pendingRequests.clear()
  }

  public onNotice(listener: (msg: string, severity?: string) => void): () => void {
    this.noticeListeners.add(listener)
    return () => {
      this.noticeListeners.delete(listener)
    }
  }

  public get ready(): boolean {
    return this.isReady
  }
}

// Global client singleton
export const pgliteClient = new PGLiteClient()

import React, { useMemo } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeProps,
  Handle,
  Position,
  MarkerType,
  Edge,
  Node,
} from '@xyflow/react'
import { Table, Key, Link2, Dna, Database, RefreshCw } from 'lucide-react'
import { useDbStore } from '../../store/dbStore'
import { TableSchema, ColumnMeta } from '../../types/database'
import { Button } from '../UI/Button'

interface TableNodeData {
  table: TableSchema
}

// Custom React Flow Node for Tables in ER Diagram
const TableNode: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = data as unknown as TableNodeData
  const table = nodeData.table

  return (
    <div
      className={`w-72 rounded-lg border-2 shadow-2xl bg-slate-900/95 overflow-hidden select-none transition-all ${
        selected ? 'border-emerald-400 ring-2 ring-emerald-400/40' : 'border-slate-700/80'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 !bg-emerald-400 !border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 !bg-emerald-400 !border-slate-900"
      />

      {/* Table Header */}
      <div className="bg-slate-800/90 px-3 py-2 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <div className="p-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <Table size={13} />
          </div>
          <span className="font-semibold text-xs text-slate-100 truncate">
            {table.name}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 shrink-0">
          ~{table.rowEstimate} rows
        </span>
      </div>

      {/* Columns List */}
      <div className="divide-y divide-slate-800/60 max-h-72 overflow-y-auto">
        {table.columns.map((col: ColumnMeta) => {
          return (
            <div
              key={col.name}
              className="px-3 py-1.5 flex items-center justify-between gap-2 hover:bg-slate-800/40 text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {col.isPrimaryKey ? (
                  <span title="Primary Key">
                    <Key size={11} className="text-amber-400 shrink-0" />
                  </span>
                ) : col.isForeignKey ? (
                  <span title={`Foreign Key -> ${col.foreignTable}.${col.foreignColumn}`}>
                    <Link2 size={11} className="text-emerald-400 shrink-0" />
                  </span>
                ) : col.isVector ? (
                  <span title="Vector Embedding">
                    <Dna size={11} className="text-cyan-400 shrink-0" />
                  </span>
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full border border-slate-600 shrink-0" />
                )}

                <span
                  className={`font-mono text-xs truncate ${
                    col.isPrimaryKey
                      ? 'text-amber-200 font-semibold'
                      : col.isForeignKey
                      ? 'text-emerald-200'
                      : 'text-slate-300'
                  }`}
                >
                  {col.name}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {col.isPrimaryKey && (
                  <span className="text-[9px] px-1 bg-amber-950/80 text-amber-300 rounded border border-amber-800/60">
                    PK
                  </span>
                )}
                {col.isForeignKey && (
                  <span className="text-[9px] px-1 bg-emerald-950/80 text-emerald-300 rounded border border-emerald-800/60">
                    FK
                  </span>
                )}
                <span className="font-mono text-[11px] text-slate-400">
                  {col.dataType}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table Footer info */}
      {table.indexes && table.indexes.length > 0 && (
        <div className="bg-slate-950/60 px-3 py-1 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
          <span>{table.columns.length} columns</span>
          <span>{table.indexes.length} index(es)</span>
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  tableNode: TableNode,
}

export const ERDiagramView: React.FC = () => {
  const { catalog, refreshCatalog } = useDbStore()
  const tables = catalog?.tables || []

  const { nodes, edges } = useMemo(() => {
    if (tables.length === 0) {
      return { nodes: [], edges: [] }
    }

    const flowNodes: Node[] = []
    const flowEdges: Edge[] = []

    const columnsPerRow = 3
    const spacingX = 350
    const spacingY = 320

    tables.forEach((tbl, index) => {
      const colIndex = index % columnsPerRow
      const rowIndex = Math.floor(index / columnsPerRow)

      flowNodes.push({
        id: tbl.name,
        type: 'tableNode',
        position: {
          x: 40 + colIndex * spacingX,
          y: 40 + rowIndex * spacingY,
        },
        data: { table: tbl },
      })

      // Discover foreign keys
      for (const col of tbl.columns) {
        if (col.isForeignKey && col.foreignTable) {
          flowEdges.push({
            id: `fk-${tbl.name}-${col.name}-${col.foreignTable}`,
            source: tbl.name,
            target: col.foreignTable,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#10b981', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#10b981',
              width: 16,
              height: 16,
            },
            label: `${col.name} → ${col.foreignColumn || 'id'}`,
            labelStyle: { fill: '#6ee7b7', fontSize: 10, fontWeight: 500 },
            labelBgStyle: { fill: '#064e3b', fillOpacity: 0.9, rx: 4, ry: 4 },
          })
        }
      }
    })

    return { nodes: flowNodes, edges: flowEdges }
  }, [tables])

  if (tables.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 select-none">
        <Database size={40} className="text-slate-600 stroke-1" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300">No tables in active database</p>
          <p className="text-xs text-slate-400 mt-1">
            Create tables with schema relations to visualize the entity relationship graph.
          </p>
        </div>
        <Button
          variant="secondary"
          size="xs"
          icon={<RefreshCw size={13} />}
          onClick={refreshCatalog}
        >
          Refresh Catalog
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Banner Toolbar */}
      <div className="h-9 bg-slate-900/90 border-b border-slate-800 px-2 sm:px-3 flex items-center justify-between shrink-0 z-10 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
          <span className="text-slate-300 font-medium">
            ER Graph ({tables.length} tables, {edges.length} relations)
          </span>
          <span className="text-slate-400 hidden md:inline">• Drag nodes • Pinch / wheel to zoom</span>
        </div>
        <Button
          variant="ghost"
          size="xs"
          icon={<RefreshCw size={13} />}
          onClick={refreshCatalog}
          title="Refresh Catalog Schema"
        >
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* React Flow Viewport */}
      <div className="flex-1 w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#334155" gap={20} variant={BackgroundVariant.Dots} />
          <Controls className="bg-slate-900 border border-slate-800 text-slate-200 fill-slate-200" />
          <MiniMap
            nodeColor="#059669"
            maskColor="rgba(2, 6, 23, 0.7)"
            className="!hidden sm:!block bg-slate-950 border border-slate-800 rounded shadow-md"
          />
        </ReactFlow>
      </div>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeProps,
  Handle,
  Position,
} from '@xyflow/react'
import {
  AlertTriangle,
  Flame,
  Clock,
  Layers,
  Database,
  Search,
  GitMerge,
  Filter,
  CheckCircle,
} from 'lucide-react'
import { useDbStore } from '../../store/dbStore'
import { parseExplainPlan } from '../../engine/explainParser'
import { ExplainNodeData } from '../../types/explain'
import { Badge } from '../UI/Badge'

// Custom React Flow node component
const CustomExplainNode: React.FC<NodeProps> = (props) => {
  const data = props.data as unknown as ExplainNodeData
  const selected = props.selected
  const isBottleneck = data.isBottleneck
  const nodeType = data.nodeType || 'Operation'

  const getNodeColor = () => {
    const t = nodeType.toLowerCase()
    if (t.includes('seq scan')) return 'border-amber-500/80 bg-slate-900'
    if (t.includes('index scan') || t.includes('index only'))
      return 'border-emerald-500/80 bg-slate-900'
    if (t.includes('join')) return 'border-indigo-500/80 bg-slate-900'
    if (t.includes('sort') || t.includes('aggregate') || t.includes('group'))
      return 'border-purple-500/80 bg-slate-900'
    return 'border-slate-700 bg-slate-900'
  }

  const getNodeIcon = () => {
    const t = nodeType.toLowerCase()
    if (t.includes('index scan')) return <Search size={14} className="text-emerald-400" />
    if (t.includes('seq scan')) return <Layers size={14} className="text-amber-400" />
    if (t.includes('join')) return <GitMerge size={14} className="text-indigo-400" />
    if (t.includes('filter')) return <Filter size={14} className="text-cyan-400" />
    return <Database size={14} className="text-slate-400" />
  }

  return (
    <div
      className={`w-64 rounded-lg border-2 shadow-xl p-3 select-none transition-all ${getNodeColor()} ${
        selected ? 'ring-2 ring-cyan-400' : ''
      } ${isBottleneck ? 'ring-2 ring-rose-500 animate-pulse' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2" />

      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5 truncate">
          {getNodeIcon()}
          <span className="font-semibold text-xs text-slate-100 truncate">{nodeType}</span>
        </div>
        {isBottleneck && (
          <Badge variant="rose" size="xs">
            <Flame size={10} className="mr-0.5 fill-rose-400" />
            Bottleneck
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="pt-2 space-y-1 text-[11px] text-slate-300">
        {data.relationName && (
          <div className="flex justify-between">
            <span className="text-slate-500">Relation:</span>
            <span className="font-mono text-cyan-300 font-medium truncate max-w-32">
              {data.relationName}
            </span>
          </div>
        )}

        {data.actualTotalTime !== undefined && (
          <div className="flex justify-between">
            <span className="text-slate-500">Actual Time:</span>
            <span className="font-mono text-slate-100 font-medium">
              {data.actualTotalTime.toFixed(2)}ms
            </span>
          </div>
        )}

        {data.exclusiveTime !== undefined && data.exclusiveTime > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Exclusive Time:</span>
            <span className="font-mono text-amber-300 font-medium">
              {data.exclusiveTime.toFixed(2)}ms
            </span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-slate-500">Rows (Act/Est):</span>
          <span className="font-mono text-slate-200">
            {data.actualRows !== undefined ? data.actualRows.toLocaleString() : '-'}{' '}
            <span className="text-slate-500">/ {data.planRows.toLocaleString()}</span>
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">Total Cost:</span>
          <span className="font-mono text-slate-400">{data.totalCost.toFixed(1)}</span>
        </div>

        {data.warning && (
          <div className="mt-1 pt-1 border-t border-slate-800 flex items-start gap-1 text-[10px] text-amber-300">
            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
            <span className="line-clamp-2">{data.warning}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2" />
    </div>
  )
}

export const ExplainPlanView: React.FC = () => {
  const { activeExplain, runExplain } = useDbStore()
  const [selectedNodeData, setSelectedNodeData] = useState<ExplainNodeData | null>(null)

  const nodeTypes = useMemo(() => ({ explainNode: CustomExplainNode }), [])

  const dag = useMemo(() => {
    if (!activeExplain?.planOutput) return null
    return parseExplainPlan(activeExplain.planOutput)
  }, [activeExplain])

  if (!activeExplain || !dag) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 p-4 select-none">
        <Clock size={36} className="text-slate-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400">No Execution Plan Generated</p>
          <p className="text-xs text-slate-600 mt-1">
            Click <span className="text-indigo-400 font-mono">Explain Plan</span> in the query toolbar or press <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400">Ctrl+E</kbd>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex relative overflow-hidden bg-slate-950">
      {/* Visual Execution Plan DAG */}
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={dag.nodes}
          edges={dag.edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeData(node.data as unknown as ExplainNodeData)}
          onPaneClick={() => setSelectedNodeData(null)}
          fitView
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
          <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300" />
          <MiniMap
            nodeColor="#475569"
            maskColor="rgba(3, 7, 18, 0.7)"
            className="!bg-slate-900 !border-slate-800"
          />
        </ReactFlow>
      </div>

      {/* Overview Metric Banner (Top Left) */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 shadow-lg backdrop-blur-xs flex items-center gap-4 text-xs select-none">
        <div>
          <span className="text-slate-500 block text-[10px]">EXECUTION TIME</span>
          <span className="font-mono text-emerald-400 font-semibold text-sm">
            {dag.totalExecutionTime}ms
          </span>
        </div>
        <div className="h-6 w-px bg-slate-800" />
        <div>
          <span className="text-slate-500 block text-[10px]">PLANNING TIME</span>
          <span className="font-mono text-cyan-400 font-semibold text-sm">
            {dag.totalPlanningTime}ms
          </span>
        </div>
        <div className="h-6 w-px bg-slate-800" />
        <div>
          <span className="text-slate-500 block text-[10px]">TOTAL PLAN NODES</span>
          <span className="font-mono text-slate-200 font-semibold text-sm">
            {dag.nodes.length}
          </span>
        </div>
      </div>

      {/* Selected Node Details Drawer (Right) */}
      {selectedNodeData && (
        <div className="w-80 h-full bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto z-20 flex flex-col gap-3 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-semibold text-slate-100">{selectedNodeData.nodeType}</h4>
              <p className="text-xs text-slate-500">Operator Details</p>
            </div>
            <button
              onClick={() => setSelectedNodeData(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {selectedNodeData.relationName && (
              <div>
                <span className="text-slate-500 block text-[11px]">Relation / Table</span>
                <span className="font-mono text-cyan-300 font-medium">
                  {selectedNodeData.relationName}
                </span>
              </div>
            )}

            {selectedNodeData.indexName && (
              <div>
                <span className="text-slate-500 block text-[11px]">Index Name</span>
                <span className="font-mono text-emerald-300">{selectedNodeData.indexName}</span>
              </div>
            )}

            {selectedNodeData.filter && (
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Filter Condition</span>
                <span className="font-mono text-amber-300 text-[11px] break-all">
                  {selectedNodeData.filter}
                </span>
              </div>
            )}

            {selectedNodeData.indexCond && (
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Index Condition</span>
                <span className="font-mono text-emerald-300 text-[11px] break-all">
                  {selectedNodeData.indexCond}
                </span>
              </div>
            )}

            {selectedNodeData.hashCond && (
              <div className="p-2 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Hash Condition</span>
                <span className="font-mono text-indigo-300 text-[11px] break-all">
                  {selectedNodeData.hashCond}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-[10px] text-slate-500 block">Actual Rows</span>
                <span className="font-mono text-slate-200">
                  {selectedNodeData.actualRows?.toLocaleString() ?? '-'}
                </span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-[10px] text-slate-500 block">Plan Rows</span>
                <span className="font-mono text-slate-200">
                  {selectedNodeData.planRows?.toLocaleString() ?? '-'}
                </span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-[10px] text-slate-500 block">Startup Cost</span>
                <span className="font-mono text-slate-200">{selectedNodeData.startupCost}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded">
                <span className="text-[10px] text-slate-500 block">Total Cost</span>
                <span className="font-mono text-slate-200">{selectedNodeData.totalCost}</span>
              </div>
            </div>

            {selectedNodeData.sharedHitBlocks !== undefined && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-500 block text-[11px]">Shared Buffer Hits / Reads</span>
                <span className="font-mono text-slate-300">
                  {selectedNodeData.sharedHitBlocks ?? 0} hits /{' '}
                  {selectedNodeData.sharedReadBlocks ?? 0} reads
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { Node, Edge } from '@xyflow/react'
import { PostgresExplainOutput, PostgresPlanNode, ExplainNodeData } from '../types/explain'

export interface ParsedExplainDAG {
  nodes: Node<ExplainNodeData>[]
  edges: Edge[]
  totalExecutionTime: number
  totalPlanningTime: number
  bottleneckNodeId?: string
}

export function parseExplainPlan(output: PostgresExplainOutput): ParsedExplainDAG {
  const rootPlan = output.Plan
  if (!rootPlan) {
    return {
      nodes: [],
      edges: [],
      totalExecutionTime: 0,
      totalPlanningTime: 0,
    }
  }

  const nodes: Node<ExplainNodeData>[] = []
  const edges: Edge[] = []
  const totalExecutionTime = output['Execution Time'] ?? rootPlan['Actual Total Time'] ?? 0
  const totalPlanningTime = output['Planning Time'] ?? 0

  let maxExclusiveTime = 0
  let bottleneckId: string | undefined

  // Pass 1: compute exclusive times and collect raw nodes
  interface FlatItem {
    id: string
    parentId?: string
    plan: PostgresPlanNode
    exclusiveTime: number
    children: FlatItem[]
  }

  let counter = 0
  function traverse(plan: PostgresPlanNode, parentId?: string): FlatItem {
    const id = `node-${++counter}`
    const actualTotal = plan['Actual Total Time'] ?? 0
    const children: FlatItem[] = []

    let childTotalSum = 0
    if (plan.Plans && Array.isArray(plan.Plans)) {
      for (const childPlan of plan.Plans) {
        const childItem = traverse(childPlan, id)
        children.push(childItem)
        childTotalSum += childPlan['Actual Total Time'] ?? 0
      }
    }

    const exclusiveTime = Math.max(0, actualTotal - childTotalSum)
    if (exclusiveTime > maxExclusiveTime) {
      maxExclusiveTime = exclusiveTime
      bottleneckId = id
    }

    return {
      id,
      parentId,
      plan,
      exclusiveTime,
      children,
    }
  }

  const rootItem = traverse(rootPlan)

  // Pass 2: Layout tree calculation (top-down)
  const NODE_WIDTH = 260
  const NODE_HEIGHT = 160
  const HORIZONTAL_GAP = 60
  const VERTICAL_GAP = 90

  // Calculate subtree widths
  function calcWidth(item: FlatItem): number {
    if (item.children.length === 0) return NODE_WIDTH
    let sum = 0
    for (const c of item.children) {
      sum += calcWidth(c) + HORIZONTAL_GAP
    }
    return Math.max(NODE_WIDTH, sum - HORIZONTAL_GAP)
  }

  function positionNodes(item: FlatItem, left: number, top: number) {
    const subtreeWidth = calcWidth(item)
    const nodeX = left + subtreeWidth / 2 - NODE_WIDTH / 2
    const nodeY = top

    const plan = item.plan
    const nodeType = plan['Node Type'] || 'Unknown'
    const actualRows = plan['Actual Rows']
    const planRows = plan['Plan Rows']
    const actualTime = plan['Actual Total Time']
    const timePercent =
      totalExecutionTime > 0 && actualTime
        ? Number(((item.exclusiveTime / totalExecutionTime) * 100).toFixed(1))
        : undefined

    let warning: string | undefined
    if (nodeType.toLowerCase().includes('seq scan') && (actualRows ?? 0) > 1000) {
      warning = `Sequential scan on ${actualRows?.toLocaleString()} rows. Consider adding an index.`
    } else if (
      actualRows !== undefined &&
      planRows !== undefined &&
      planRows > 0 &&
      (actualRows / planRows > 10 || planRows / actualRows > 10)
    ) {
      warning = `Planner estimate mismatch: estimated ${planRows.toLocaleString()} rows, actual ${actualRows.toLocaleString()} rows. Run ANALYZE.`
    }

    const isBottleneck = item.id === bottleneckId && maxExclusiveTime > 0.5

    const nodeData: ExplainNodeData = {
      id: item.id,
      nodeType,
      relationName: plan['Relation Name'] || plan['Alias'],
      indexName: plan['Index Name'],
      joinType: plan['Join Type'],
      totalCost: plan['Total Cost'],
      startupCost: plan['Startup Cost'],
      planRows: plan['Plan Rows'],
      actualRows: plan['Actual Rows'],
      actualTotalTime: plan['Actual Total Time'],
      actualStartupTime: plan['Actual Startup Time'],
      exclusiveTime: Number(item.exclusiveTime.toFixed(2)),
      timePercent,
      isBottleneck,
      warning,
      filter: plan['Filter'],
      rowsRemovedByFilter: plan['Rows Removed by Filter'],
      indexCond: plan['Index Cond'],
      hashCond: plan['Hash Cond'],
      sharedHitBlocks: plan['Shared Hit Blocks'],
      sharedReadBlocks: plan['Shared Read Blocks'],
      raw: plan,
    }

    nodes.push({
      id: item.id,
      type: 'explainNode',
      position: { x: Math.round(nodeX), y: Math.round(nodeY) },
      data: nodeData,
    })

    if (item.parentId) {
      edges.push({
        id: `edge-${item.parentId}-${item.id}`,
        source: item.parentId,
        target: item.id,
        type: 'smoothstep',
        animated: isBottleneck,
        style: {
          stroke: isBottleneck ? '#f43f5e' : '#475569',
          strokeWidth: isBottleneck ? 3 : 2,
        },
      })
    }

    // Position children
    let currentChildLeft = left
    for (const child of item.children) {
      const childW = calcWidth(child)
      positionNodes(child, currentChildLeft, top + NODE_HEIGHT + VERTICAL_GAP)
      currentChildLeft += childW + HORIZONTAL_GAP
    }
  }

  positionNodes(rootItem, 0, 40)

  return {
    nodes,
    edges,
    totalExecutionTime: Number(totalExecutionTime.toFixed(2)),
    totalPlanningTime: Number(totalPlanningTime.toFixed(2)),
    bottleneckNodeId: bottleneckId,
  }
}

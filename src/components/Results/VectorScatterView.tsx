import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  ScatterChart,
  Box,
  CircleDot,
  Compass,
  Sparkles,
} from 'lucide-react'
import { useDbStore } from '../../store/dbStore'
import { useEditorStore } from '../../store/editorStore'
import {
  runPCA,
  parseVector,
  cosineSimilarity,
  PCAResult,
  ProjectedPoint,
} from '../../engine/pca'
import { Button } from '../UI/Button'
import { Badge } from '../UI/Badge'

const CLUSTER_COLORS = [
  '#22d3ee', // cyan-400
  '#818cf8', // indigo-400
  '#34d399', // emerald-400
  '#f472b6', // pink-400
  '#fbbf24', // amber-400
  '#a78bfa', // purple-400
]

export const VectorScatterView: React.FC = () => {
  const { activeResult } = useDbStore()
  const { addTab } = useEditorStore()

  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [selectedCol, setSelectedCol] = useState<string>('')
  const [colorByCol, setColorByCol] = useState<string>('')
  const [hoveredPoint, setHoveredPoint] = useState<ProjectedPoint | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<ProjectedPoint | null>(null)

  // 3D rotation angles
  const [rotX, setRotX] = useState<number>(0.4)
  const [rotY, setRotY] = useState<number>(0.6)
  const isDraggingRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })

  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Detect vector columns
  const vectorColumns = useMemo(() => {
    if (!activeResult) return []
    const cols: string[] = []
    for (const col of activeResult.columns) {
      const sample = activeResult.rows.find((r) => r[col] !== null && r[col] !== undefined)?.[col]
      if (parseVector(sample) !== null) {
        cols.push(col)
      }
    }
    return cols
  }, [activeResult])

  // Available categorical columns for coloring
  const categoricalColumns = useMemo(() => {
    if (!activeResult) return []
    return activeResult.columns.filter((c) => !vectorColumns.includes(c))
  }, [activeResult, vectorColumns])

  useEffect(() => {
    if (vectorColumns.length > 0 && !vectorColumns.includes(selectedCol)) {
      setSelectedCol(vectorColumns[0])
    }
  }, [vectorColumns, selectedCol])

  // Extract vectors & run PCA
  const pcaResult = useMemo<PCAResult | null>(() => {
    if (!activeResult || !selectedCol) return null

    const validVectors: number[][] = []
    const validRows: Record<string, unknown>[] = []

    for (const row of activeResult.rows) {
      const parsed = parseVector(row[selectedCol])
      if (parsed) {
        validVectors.push(parsed)
        validRows.push(row)
      }
    }

    if (validVectors.length === 0) return null
    return runPCA(validVectors, validRows, 'id')
  }, [activeResult, selectedCol])

  // Top-k nearest neighbors of selectedPoint
  const nearestNeighbors = useMemo(() => {
    if (!selectedPoint || !pcaResult) return []
    const targetVec = selectedPoint.originalVector

    return pcaResult.points
      .filter((p) => p !== selectedPoint)
      .map((p) => ({
        point: p,
        similarity: cosineSimilarity(targetVec, p.originalVector),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
  }, [selectedPoint, pcaResult])

  // Handle canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pcaResult || pcaResult.points.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2

    ctx.clearRect(0, 0, width, height)

    // Find scale limits
    let maxDist = 0
    pcaResult.points.forEach((p) => {
      const d = Math.sqrt(p.x * p.x + p.y * p.y + (mode === '3d' ? p.z * p.z : 0))
      if (d > maxDist) maxDist = d
    })
    if (maxDist === 0) maxDist = 1
    const scale = (Math.min(width, height) * 0.38) / maxDist

    // Draw background grid axes
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, 20)
    ctx.lineTo(cx, height - 20)
    ctx.moveTo(20, cy)
    ctx.lineTo(width - 20, cy)
    ctx.stroke()

    // 3D coordinate transform
    const project3D = (p: ProjectedPoint) => {
      if (mode === '2d') {
        return {
          sx: cx + p.x * scale,
          sy: cy - p.y * scale,
        }
      }
      // 3D Rotation
      const cosY = Math.cos(rotY)
      const sinY = Math.sin(rotY)
      const cosX = Math.cos(rotX)
      const sinX = Math.sin(rotX)

      // Rotate around Y
      const x1 = p.x * cosY + p.z * sinY
      const z1 = -p.x * sinY + p.z * cosY

      // Rotate around X
      const y2 = p.y * cosX - z1 * sinX
      const z2 = p.y * sinX + z1 * cosX

      const cameraDist = 4
      const fov = 350
      const proj = fov / (cameraDist + z2 * 0.5)

      return {
        sx: cx + x1 * scale * (proj / 350),
        sy: cy - y2 * scale * (proj / 350),
      }
    }

    // Connect selected point to nearest neighbors
    if (selectedPoint) {
      const p1 = project3D(selectedPoint)
      nearestNeighbors.forEach((nn) => {
        const p2 = project3D(nn.point)
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.moveTo(p1.sx, p1.sy)
        ctx.lineTo(p2.sx, p2.sy)
        ctx.stroke()
        ctx.setLineDash([])
      })
    }

    // Color categories mapping
    const categoryMap = new Map<string, number>()
    let catCounter = 0
    if (colorByCol) {
      pcaResult.points.forEach((p) => {
        const val = String(p.rowData[colorByCol] ?? 'unknown')
        if (!categoryMap.has(val)) {
          categoryMap.set(val, catCounter++ % CLUSTER_COLORS.length)
        }
      })
    }

    // Draw points
    pcaResult.points.forEach((p) => {
      const { sx, sy } = project3D(p)
      const isSelected = selectedPoint === p
      const isHovered = hoveredPoint === p
      const isNeighbor = nearestNeighbors.some((nn) => nn.point === p)

      let color = CLUSTER_COLORS[p.clusterIndex % CLUSTER_COLORS.length]
      if (colorByCol) {
        const catVal = String(p.rowData[colorByCol] ?? 'unknown')
        const idx = categoryMap.get(catVal) ?? 0
        color = CLUSTER_COLORS[idx]
      }

      ctx.beginPath()
      const radius = isSelected ? 8 : isHovered ? 7 : isNeighbor ? 6 : 4.5
      ctx.arc(sx, sy, radius, 0, Math.PI * 2)

      if (isSelected) {
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = '#22d3ee'
        ctx.shadowBlur = 15
      } else if (isHovered) {
        ctx.fillStyle = '#22d3ee'
        ctx.shadowColor = '#22d3ee'
        ctx.shadowBlur = 10
      } else if (isNeighbor) {
        ctx.fillStyle = '#38bdf8'
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = color
        ctx.shadowBlur = 0
      }

      ctx.fill()
      ctx.strokeStyle = '#030712'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.shadowBlur = 0
    })
  }, [pcaResult, mode, rotX, rotY, selectedPoint, hoveredPoint, colorByCol, nearestNeighbors])

  // Mouse interaction for rotation and point selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === '3d') {
      isDraggingRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !pcaResult) return

    if (isDraggingRef.current && mode === '3d') {
      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y
      setRotY((y) => y + dx * 0.01)
      setRotX((x) => x + dy * 0.01)
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      return
    }

    // Hit-testing points
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2

    let maxDist = 0
    pcaResult.points.forEach((p) => {
      const d = Math.sqrt(p.x * p.x + p.y * p.y + (mode === '3d' ? p.z * p.z : 0))
      if (d > maxDist) maxDist = d
    })
    if (maxDist === 0) maxDist = 1
    const scale = (Math.min(width, height) * 0.38) / maxDist

    let found: ProjectedPoint | null = null
    for (const p of pcaResult.points) {
      let sx = cx + p.x * scale
      let sy = cy - p.y * scale

      if (mode === '3d') {
        const cosY = Math.cos(rotY)
        const sinY = Math.sin(rotY)
        const cosX = Math.cos(rotX)
        const sinX = Math.sin(rotX)
        const x1 = p.x * cosY + p.z * sinY
        const z1 = -p.x * sinY + p.z * cosY
        const y2 = p.y * cosX - z1 * sinX
        const z2 = p.y * sinX + z1 * cosX
        const fov = 350
        const proj = fov / (4 + z2 * 0.5)
        sx = cx + x1 * scale * (proj / 350)
        sy = cy - y2 * scale * (proj / 350)
      }

      const dist = Math.hypot(mx - sx, my - sy)
      if (dist < 10) {
        found = p
        break
      }
    }

    setHoveredPoint(found)
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  // Touch interaction for mobile / tablet rotation
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (mode === '3d' && e.touches.length > 0) {
      isDraggingRef.current = true
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current && mode === '3d' && e.touches.length > 0) {
      const dx = e.touches[0].clientX - lastMousePosRef.current.x
      const dy = e.touches[0].clientY - lastMousePosRef.current.y
      setRotY((y) => y + dx * 0.01)
      setRotX((x) => x + dy * 0.01)
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
  }

  const handleClick = () => {
    if (hoveredPoint) {
      setSelectedPoint(hoveredPoint)
    }
  }

  const loadSampleVectorQuery = () => {
    const sql = `-- RAG Vector Search & HNSW Index Demo
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  embedding vector(4)
);

INSERT INTO articles (title, category, embedding) VALUES
('Vector Databases Explained', 'ai', '[0.95, 0.12, 0.20, 0.05]'),
('Building RAG Pipelines with Python', 'ai', '[0.88, 0.35, 0.15, 0.10]'),
('Postgres Index Deep Dive', 'database', '[0.15, 0.90, 0.25, 0.30]'),
('WAL Logging Internals', 'database', '[0.10, 0.85, 0.40, 0.25]'),
('Vite and React Architecture', 'frontend', '[0.20, 0.25, 0.90, 0.15]'),
('WebAssembly Memory Management', 'frontend', '[0.25, 0.30, 0.85, 0.35]')
ON CONFLICT DO NOTHING;

SELECT id, title, category, embedding FROM articles;
`
    addTab('vector_demo.sql', sql)
  }

  if (vectorColumns.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 p-6 select-none">
        <ScatterChart size={36} className="text-slate-600" />
        <div className="text-center max-w-sm">
          <p className="text-sm font-medium text-slate-400">No Vector Columns in Current Result</p>
          <p className="text-xs text-slate-600 mt-1">
            Execute a query returning a <span className="font-mono text-cyan-400">vector(N)</span> column to visualize high-dimensional embeddings reduced to 2D/3D via PCA.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Sparkles size={13} />}
          onClick={loadSampleVectorQuery}
        >
          Load Vector Demo Query
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="h-10 px-3 sm:px-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Projection Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-800">
            <button
              onClick={() => setMode('2d')}
              className={`px-2 sm:px-2.5 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
                mode === '2d' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CircleDot size={12} />
              <span>2D PCA</span>
            </button>
            <button
              onClick={() => setMode('3d')}
              className={`px-2 sm:px-2.5 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
                mode === '3d' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box size={12} />
              <span className="hidden sm:inline">3D Interactive</span>
              <span className="sm:hidden">3D</span>
            </button>
          </div>

          {/* Vector Column Selector */}
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span className="hidden sm:inline">Vector Col:</span>
            <select
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-200 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs max-w-28 sm:max-w-none truncate"
            >
              {vectorColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Color by Categorical Column */}
          {categoricalColumns.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="hidden sm:inline">Color By:</span>
              <select
                value={colorByCol}
                onChange={(e) => setColorByCol(e.target.value)}
                className="px-2 py-0.5 bg-slate-950 border border-slate-800 text-slate-200 rounded focus:outline-none focus:border-cyan-500 text-xs max-w-28 sm:max-w-none truncate"
              >
                <option value="">Cluster (Auto)</option>
                {categoricalColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* PCA Metric Badges */}
        {pcaResult && (
          <div className="hidden md:flex items-center gap-2 text-xs shrink-0">
            <span className="text-slate-500 text-[11px]">
              Dim: <span className="font-mono text-slate-300">{pcaResult.totalDimensions}</span>
            </span>
            <span className="text-slate-500 text-[11px]">
              Samples: <span className="font-mono text-slate-300">{pcaResult.sampleCount}</span>
            </span>
            <Badge variant="cyan" size="xs">
              PC1: {(pcaResult.explainedVarianceRatio[0] * 100).toFixed(0)}%
            </Badge>
            <Badge variant="indigo" size="xs">
              PC2: {(pcaResult.explainedVarianceRatio[1] * 100).toFixed(0)}%
            </Badge>
            {mode === '3d' && (
              <Badge variant="emerald" size="xs">
                PC3: {(pcaResult.explainedVarianceRatio[2] * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick}
          className="w-full h-full cursor-crosshair"
        />

        {/* 3D Hint */}
        {mode === '3d' && (
          <div className="absolute top-3 left-3 bg-slate-900/80 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-400 flex items-center gap-1.5 backdrop-blur-xs">
            <Compass size={12} className="text-cyan-400" />
            <span className="hidden sm:inline">Click & drag to rotate 3D space</span>
            <span className="sm:hidden">Drag to rotate 3D</span>
          </div>
        )}

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900 border border-slate-700/80 rounded-md p-2 shadow-xl text-xs backdrop-blur-md max-w-xs"
            style={{
              bottom: 16,
              left: 16,
            }}
          >
            <div className="font-semibold text-slate-100 flex items-center justify-between gap-2 border-b border-slate-800 pb-1 mb-1">
              <span>Point #{hoveredPoint.id}</span>
              <span className="font-mono text-[10px] text-cyan-400">
                ({hoveredPoint.x.toFixed(2)}, {hoveredPoint.y.toFixed(2)})
              </span>
            </div>
            <div className="space-y-0.5 text-[11px] text-slate-300">
              {Object.entries(hoveredPoint.rowData)
                .filter(([k]) => k !== selectedCol)
                .slice(0, 4)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="text-slate-500 truncate">{k}:</span>
                    <span className="font-mono text-slate-200 truncate">{String(v)}</span>
                  </div>
                ))}
            </div>
            <p className="text-[10px] text-cyan-400/80 mt-1.5 italic">
              Click point to inspect nearest neighbors
            </p>
          </div>
        )}

        {/* Selected Point Nearest Neighbors Sidebar */}
        {selectedPoint && (
          <div className="absolute md:relative inset-y-0 right-0 w-72 max-w-[85vw] h-full bg-slate-900/95 border-l border-slate-800 p-3.5 flex flex-col gap-3 shadow-2xl backdrop-blur-md overflow-y-auto z-30 animate-in slide-in-from-right duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-xs font-semibold text-slate-100">Cosine KNN Inspector</h4>
                <p className="text-[11px] text-slate-500">Target: Point #{selectedPoint.id}</p>
              </div>
              <button
                onClick={() => setSelectedPoint(null)}
                className="text-xs text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide block mb-1.5">
                Top Nearest Neighbors
              </span>
              <div className="space-y-1.5">
                {nearestNeighbors.map((nn, i) => (
                  <div
                    key={nn.point.id}
                    className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">
                        #{i + 1} Point #{nn.point.id}
                      </span>
                      <Badge variant="cyan" size="xs">
                        {(nn.similarity * 100).toFixed(1)}% match
                      </Badge>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 truncate">
                      {Object.entries(nn.point.rowData)
                        .filter(([k]) => k !== selectedCol && k !== 'id')
                        .slice(0, 2)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' | ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import { Modal } from '../UI/Modal'
import { useUIStore } from '../../store/uiStore'
import { useEditorStore } from '../../store/editorStore'
import { useDbStore } from '../../store/dbStore'
import { Dna, Copy, Check, ArrowRight, Sparkles, Calculator } from 'lucide-react'
import { Button } from '../UI/Button'

// Deterministic normalized embedding synthesizer from text
function synthesizeEmbedding(text: string, dimensions: number): number[] {
  let seed = 0
  for (let i = 0; i < text.length; i++) {
    seed = (seed * 31 + text.charCodeAt(i)) >>> 0
  }

  const raw: number[] = []
  let sumSq = 0
  for (let i = 0; i < dimensions; i++) {
    // Linear congruential generator step
    seed = (seed * 1664525 + 1013904223) >>> 0
    const val = (seed / 4294967296) * 2 - 1 // between -1 and 1
    raw.push(val)
    sumSq += val * val
  }

  const norm = Math.sqrt(sumSq) || 1
  return raw.map((v) => Number((v / norm).toFixed(4)))
}

function parseVectorString(str: string): number[] | null {
  const clean = str.trim()
  if (!clean.startsWith('[') || !clean.endsWith(']')) return null
  const parts = clean.slice(1, -1).split(',')
  const nums = parts.map((p) => Number(p.trim()))
  if (nums.some((n) => isNaN(n))) return null
  return nums
}

export const VectorAssistantModal: React.FC = () => {
  const { vectorAssistantModalOpen, setVectorAssistantModalOpen } = useUIStore()
  const { updateSql, getActiveTab } = useEditorStore()
  const { catalog } = useDbStore()

  // Tab 1: Embeddings Generator
  const [inputText, setInputText] = useState('semantic vector retrieval and similarity')
  const [dimensions, setDimensions] = useState<number>(3)
  const [copiedVector, setCopiedVector] = useState(false)

  // Tab 2: Distance Sandbox
  const [vectorAStr, setVectorAStr] = useState('[0.85, 0.40, 0.20]')
  const [vectorBStr, setVectorBStr] = useState('[0.92, 0.15, 0.35]')

  // Active sub-tab
  const [mode, setMode] = useState<'generate' | 'compare'>('generate')

  const generatedVector = useMemo(() => {
    return synthesizeEmbedding(inputText || 'default', dimensions)
  }, [inputText, dimensions])

  const vectorLiteral = `[${generatedVector.join(', ')}]`

  // Calculations for Sandbox
  const distanceResults = useMemo(() => {
    const a = parseVectorString(vectorAStr)
    const b = parseVectorString(vectorBStr)

    if (!a || !b || a.length !== b.length || a.length === 0) {
      return null
    }

    let dot = 0
    let normASq = 0
    let normBSq = 0
    let l2Sq = 0

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normASq += a[i] * a[i]
      normBSq += b[i] * b[i]
      const diff = a[i] - b[i]
      l2Sq += diff * diff
    }

    const normA = Math.sqrt(normASq) || 1
    const normB = Math.sqrt(normBSq) || 1
    const cosineSim = Math.max(-1, Math.min(1, dot / (normA * normB)))
    const cosineDist = 1 - cosineSim
    const l2Dist = Math.sqrt(l2Sq)
    const angleRad = Math.acos(cosineSim)
    const angleDeg = (angleRad * 180) / Math.PI

    return {
      dimensions: a.length,
      cosineDistance: Number(cosineDist.toFixed(4)),
      cosineSimilarity: Number(cosineSim.toFixed(4)),
      l2Distance: Number(l2Dist.toFixed(4)),
      innerProduct: Number((-dot).toFixed(4)), // pgvector <#> operator returns negative dot
      angleDegrees: Number(angleDeg.toFixed(2)),
    }
  }, [vectorAStr, vectorBStr])

  if (!vectorAssistantModalOpen) return null

  const handleCopyVector = () => {
    navigator.clipboard.writeText(vectorLiteral)
    setCopiedVector(true)
    setTimeout(() => setCopiedVector(false), 1500)
  }

  const handleInsertQuery = () => {
    const activeTab = getActiveTab()
    const vectorTable = catalog?.tables.find((t) => t.columns.some((c) => c.isVector))
    const tableName = vectorTable ? vectorTable.name : 'documents'
    const vectorCol = vectorTable?.columns.find((c) => c.isVector)?.name || 'embedding'

    const query = `\n-- Semantic search with generated ${dimensions}-d embedding\nSELECT\n  *,\n  ROUND((1 - ("${vectorCol}" <=> '${vectorLiteral}'))::numeric, 4) AS similarity\nFROM "${tableName}"\nORDER BY "${vectorCol}" <=> '${vectorLiteral}'\nLIMIT 10;\n`
    updateSql(activeTab.sql + query)
    setVectorAssistantModalOpen(false)
  }

  return (
    <Modal
      isOpen={vectorAssistantModalOpen}
      onClose={() => setVectorAssistantModalOpen(false)}
      title="pgvector AI Assistant & Calculator"
      subtitle="Synthesize normalized vector embeddings and calculate geometric distances"
      icon={<Dna size={18} className="text-cyan-400" />}
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Mode Selector */}
        <div className="flex border-b border-slate-800 text-xs">
          <button
            onClick={() => setMode('generate')}
            className={`px-4 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              mode === 'generate'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={13} />
            Embedding Generator
          </button>
          <button
            onClick={() => setMode('compare')}
            className={`px-4 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              mode === 'compare'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator size={13} />
            Vector Distance Calculator
          </button>
        </div>

        {mode === 'generate' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Prompt / Text to Embed
              </label>
              <textarea
                rows={2}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. Distributed raft consensus and high throughput databases"
                className="w-full bg-slate-950 text-slate-100 p-2.5 text-xs rounded border border-slate-700 focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Vector Dimensions
                </label>
                <select
                  value={dimensions}
                  onChange={(e) => setDimensions(Number(e.target.value))}
                  className="bg-slate-950 text-slate-100 px-3 py-1.5 text-xs rounded border border-slate-700 focus:border-cyan-500 outline-none font-mono"
                >
                  <option value={3}>3 dimensions (Sandbox standard)</option>
                  <option value={8}>8 dimensions</option>
                  <option value={384}>384 dimensions (all-MiniLM-L6-v2)</option>
                  <option value={768}>768 dimensions (BERT / bge-base)</option>
                  <option value={1536}>1536 dimensions (text-embedding-3-small)</option>
                </select>
              </div>

              <div className="flex-1 pt-4 text-[11px] text-slate-500">
                L2 normalized vector ($\|v\|_2 = 1.0$), ready for cosine operator (<code className="text-cyan-400">&lt;=&gt;</code>)
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-400">Synthesized Vector Float Array:</span>
                <button
                  onClick={handleCopyVector}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedVector ? <Check size={12} /> : <Copy size={12} />}
                  {copiedVector ? 'Copied' : 'Copy Literal'}
                </button>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded p-2.5 max-h-24 overflow-y-auto font-mono text-xs text-cyan-300 break-all select-all">
                {vectorLiteral}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button variant="ghost" size="xs" onClick={() => setVectorAssistantModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="xs"
                icon={<ArrowRight size={13} />}
                onClick={handleInsertQuery}
              >
                Insert KNN Query into Editor
              </Button>
            </div>
          </div>
        )}

        {mode === 'compare' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Vector A (Array Format)
                </label>
                <input
                  type="text"
                  value={vectorAStr}
                  onChange={(e) => setVectorAStr(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 px-2.5 py-1.5 text-xs rounded border border-slate-700 focus:border-cyan-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Vector B (Array Format)
                </label>
                <input
                  type="text"
                  value={vectorBStr}
                  onChange={(e) => setVectorBStr(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 px-2.5 py-1.5 text-xs rounded border border-slate-700 focus:border-cyan-500 outline-none font-mono"
                />
              </div>
            </div>

            {distanceResults ? (
              <div className="bg-slate-950 p-3 rounded border border-slate-800 flex flex-col gap-2.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Cosine Distance (&lt;=&gt;)
                    </span>
                    <span className="text-base font-mono font-bold text-cyan-400">
                      {distanceResults.cosineDistance}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Similarity: {distanceResults.cosineSimilarity}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Euclidean L2 Distance (&lt;-&gt;)
                    </span>
                    <span className="text-base font-mono font-bold text-emerald-400">
                      {distanceResults.l2Distance}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Straight-line Euclidean distance
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Negative Inner Product (&lt;#&gt;)
                    </span>
                    <span className="text-base font-mono font-bold text-purple-400">
                      {distanceResults.innerProduct}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      pgvector &lt;#&gt; dot product
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                      Geometric Angle (&theta;)
                    </span>
                    <span className="text-base font-mono font-bold text-amber-400">
                      {distanceResults.angleDegrees}&deg;
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Angle between vectors in {distanceResults.dimensions}D space
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-950/60 border border-amber-800/60 rounded text-xs text-amber-300">
                Please enter valid vector arrays of the exact same dimensions (e.g.{' '}
                <code className="text-slate-100">[0.1, 0.2, 0.3]</code>).
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button variant="ghost" size="xs" onClick={() => setVectorAssistantModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export interface ProjectedPoint {
  id: string | number
  x: number
  y: number
  z: number
  originalVector: number[]
  rowData: Record<string, unknown>
  clusterIndex: number
}

export interface PCAResult {
  points: ProjectedPoint[]
  explainedVarianceRatio: [number, number, number]
  totalDimensions: number
  sampleCount: number
}

/**
 * Parses vector representation from string '[0.1, 0.2, ...]' or number array
 */
export function parseVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    return raw.map((v) => Number(v)).filter((v) => !isNaN(v))
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const parts = trimmed.slice(1, -1).split(',')
      const nums = parts.map((p) => Number(p.trim())).filter((n) => !isNaN(n))
      return nums.length > 0 ? nums : null
    }
  }
  return null
}

/**
 * Computes cosine similarity between two numeric vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Computes Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

/**
 * Performs Principal Component Analysis (PCA) to reduce N-dimensional vectors to 2D/3D
 */
export function runPCA(
  vectors: number[][],
  rows: Record<string, unknown>[],
  idColumn?: string
): PCAResult {
  const n = vectors.length
  if (n === 0) {
    return {
      points: [],
      explainedVarianceRatio: [0, 0, 0],
      totalDimensions: 0,
      sampleCount: 0,
    }
  }

  const d = vectors[0].length
  if (d === 0) {
    return {
      points: [],
      explainedVarianceRatio: [0, 0, 0],
      totalDimensions: 0,
      sampleCount: n,
    }
  }

  // 1. If d <= 3, directly map without dimension reduction
  if (d <= 3) {
    const points: ProjectedPoint[] = vectors.map((v, i) => {
      const idVal = idColumn ? rows[i][idColumn] : i + 1
      return {
        id: (idVal as string | number) ?? i + 1,
        x: v[0] || 0,
        y: v[1] || 0,
        z: v[2] || 0,
        originalVector: v,
        rowData: rows[i],
        clusterIndex: 0,
      }
    })
    assignSimpleClusters(points)
    return {
      points,
      explainedVarianceRatio: [1, 0, 0],
      totalDimensions: d,
      sampleCount: n,
    }
  }

  // 2. Mean centering
  const mean = new Float64Array(d)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      mean[j] += vectors[i][j]
    }
  }
  for (let j = 0; j < d; j++) {
    mean[j] /= n
  }

  const centered: number[][] = new Array(n)
  for (let i = 0; i < n; i++) {
    centered[i] = new Array(d)
    for (let j = 0; j < d; j++) {
      centered[i][j] = vectors[i][j] - mean[j]
    }
  }

  // 3. Covariance matrix (d x d)
  const cov: Float64Array[] = new Array(d)
  for (let i = 0; i < d; i++) {
    cov[i] = new Float64Array(d)
  }

  const denom = n > 1 ? n - 1 : 1
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      let sum = 0
      for (let k = 0; k < n; k++) {
        sum += centered[k][i] * centered[k][j]
      }
      const val = sum / denom
      cov[i][j] = val
      cov[j][i] = val
    }
  }

  // 4. Power iteration with deflation to find top 3 eigenvectors
  const eigenvectors: number[][] = []
  const eigenvalues: number[] = []

  let totalVariance = 0
  for (let i = 0; i < d; i++) {
    totalVariance += cov[i][i]
  }
  if (totalVariance === 0) totalVariance = 1

  const componentsToExtract = Math.min(3, d)

  for (let comp = 0; comp < componentsToExtract; comp++) {
    // Random initial vector
    let v = new Float64Array(d)
    for (let i = 0; i < d; i++) {
      v[i] = Math.sin((comp + 1) * (i + 1))
    }

    let lambda = 0
    // Max 40 power iterations
    for (let iter = 0; iter < 40; iter++) {
      // Multiply: next = Cov * v
      const nextV = new Float64Array(d)
      for (let i = 0; i < d; i++) {
        let sum = 0
        for (let j = 0; j < d; j++) {
          sum += cov[i][j] * v[j]
        }
        nextV[i] = sum
      }

      // Compute norm
      let norm = 0
      for (let i = 0; i < d; i++) {
        norm += nextV[i] * nextV[i]
      }
      norm = Math.sqrt(norm)
      if (norm === 0) break

      lambda = norm
      for (let i = 0; i < d; i++) {
        v[i] = nextV[i] / norm
      }
    }

    eigenvectors.push(Array.from(v))
    eigenvalues.push(lambda)

    // Deflate covariance matrix: Cov = Cov - lambda * (v * v^T)
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        cov[i][j] -= lambda * v[i] * v[j]
      }
    }
  }

  // 5. Project centered data onto eigenvectors
  const points: ProjectedPoint[] = centered.map((vec, idx) => {
    let x = 0
    let y = 0
    let z = 0

    if (eigenvectors[0]) {
      for (let j = 0; j < d; j++) x += vec[j] * eigenvectors[0][j]
    }
    if (eigenvectors[1]) {
      for (let j = 0; j < d; j++) y += vec[j] * eigenvectors[1][j]
    }
    if (eigenvectors[2]) {
      for (let j = 0; j < d; j++) z += vec[j] * eigenvectors[2][j]
    }

    const idVal = idColumn ? rows[idx][idColumn] : idx + 1

    return {
      id: (idVal as string | number) ?? idx + 1,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      z: Number(z.toFixed(4)),
      originalVector: vectors[idx],
      rowData: rows[idx],
      clusterIndex: 0,
    }
  })

  // Assign clusters based on angle or quadrant
  assignSimpleClusters(points)

  const varRatio1 = eigenvalues[0] ? eigenvalues[0] / totalVariance : 0
  const varRatio2 = eigenvalues[1] ? eigenvalues[1] / totalVariance : 0
  const varRatio3 = eigenvalues[2] ? eigenvalues[2] / totalVariance : 0

  return {
    points,
    explainedVarianceRatio: [
      Number(varRatio1.toFixed(3)),
      Number(varRatio2.toFixed(3)),
      Number(varRatio3.toFixed(3)),
    ],
    totalDimensions: d,
    sampleCount: n,
  }
}

function assignSimpleClusters(points: ProjectedPoint[]) {
  // Simple k-means clustering (k=3 or 4) for visual grouping
  if (points.length < 4) {
    points.forEach((p, i) => (p.clusterIndex = i))
    return
  }

  const k = Math.min(4, Math.floor(points.length / 2))
  // Initialize centroids
  const centroids = points.slice(0, k).map((p) => ({ x: p.x, y: p.y, z: p.z }))

  for (let iter = 0; iter < 5; iter++) {
    // Assignment
    for (const p of points) {
      let minDist = Infinity
      let bestCluster = 0
      for (let c = 0; c < k; c++) {
        const dx = p.x - centroids[c].x
        const dy = p.y - centroids[c].y
        const dz = p.z - centroids[c].z
        const d = dx * dx + dy * dy + dz * dz
        if (d < minDist) {
          minDist = d
          bestCluster = c
        }
      }
      p.clusterIndex = bestCluster
    }

    // Update centroids
    const counts = new Array(k).fill(0)
    const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, z: 0 }))
    for (const p of points) {
      counts[p.clusterIndex]++
      sums[p.clusterIndex].x += p.x
      sums[p.clusterIndex].y += p.y
      sums[p.clusterIndex].z += p.z
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        centroids[c].x = sums[c].x / counts[c]
        centroids[c].y = sums[c].y / counts[c]
        centroids[c].z = sums[c].z / counts[c]
      }
    }
  }
}

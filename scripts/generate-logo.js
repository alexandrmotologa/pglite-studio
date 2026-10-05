import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Resvg } from '@resvg/resvg-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function buildLogoSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="squircle-clip">
      <rect x="24" y="24" width="976" height="976" rx="220" />
    </clipPath>

    <!-- Electric Cyan Optic Gradient -->
    <linearGradient id="cyan-optic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="40%" stop-color="#00f5ff"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>

    <!-- Titanium Tusk Gradient -->
    <linearGradient id="titanium-tusk-left" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>

    <linearGradient id="titanium-tusk-right" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>

    <!-- Vector Prism Cyan Gradient -->
    <linearGradient id="prism-cyan" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00f5ff" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0.7"/>
    </linearGradient>

    <filter id="subtle-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.14" />
    </filter>
  </defs>

  <!-- Luxury White Squircle Container -->
  <rect x="24" y="24" width="976" height="976" rx="220" fill="#ffffff" stroke="#e2e8f0" stroke-width="6" />

  <g clip-path="url(#squircle-clip)">
    <g transform="translate(512, 512)" filter="url(#subtle-shadow)">

      <!-- Hexagonal Architectural Gateway Frame -->
      <polygon points="
        0,-410
        355,-205
        355,205
        0,410
        -355,205
        -355,-205
      " fill="none" stroke="#0f172a" stroke-width="40" stroke-linejoin="round" />

      <!-- Inner Dashed Telemetry Hexagon -->
      <polygon points="
        0,-375
        324,-187
        324,187
        0,375
        -324,187
        -324,-187
      " fill="none" stroke="#00f5ff" stroke-width="4" opacity="0.45" stroke-dasharray="16, 12" />

      <!-- Vector Coordinate Axis Ticks on Hexagon -->
      <line x1="0" y1="-375" x2="0" y2="-345" stroke="#00f5ff" stroke-width="3" opacity="0.6" />
      <line x1="0" y1="375" x2="0" y2="345" stroke="#00f5ff" stroke-width="3" opacity="0.6" />
      <line x1="-324" y1="-187" x2="-298" y2="-172" stroke="#00f5ff" stroke-width="3" opacity="0.6" />
      <line x1="324" y1="-187" x2="298" y2="-172" stroke="#00f5ff" stroke-width="3" opacity="0.6" />
      <line x1="-324" y1="187" x2="-298" y2="172" stroke="#00f5ff" stroke-width="3" opacity="0.6" />
      <line x1="324" y1="187" x2="298" y2="172" stroke="#00f5ff" stroke-width="3" opacity="0.6" />

      <!-- ============================================================== -->
      <!-- THE VECTOR MASCOT: GEOMETRIC SLONIK (POSTGRESQL ELEPHANT)     -->
      <!-- ============================================================== -->

      <!-- 1. Watertight Solid Obsidian Base Silhouette -->
      <path d="
        M 0 -290
        L 95 -260 L 190 -295 L 290 -230 L 310 -90 L 260 40 L 175 90
        L 145 180 L 115 130 L 70 120 L 55 240 L 35 295 L 0 310
        L -35 295 L -55 240 L -70 120 L -115 130 L -145 180 L -175 90
        L -260 40 L -310 -90 L -290 -230 L -190 -295 L -95 -260 Z
      " fill="#090d16" />

      <!-- 2. Outer Ears: Wide Architectural Polygonal Plates -->
      <!-- Left Outer Ear Base & Shadow -->
      <polygon points="-190,-295 -290,-230 -310,-90 -230,-100" fill="#0b0f19" />
      <polygon points="-310,-90 -260,40 -200,-10 -230,-100" fill="#111827" />
      <polygon points="-260,40 -175,90 -165,10 -200,-10" fill="#0f172a" />

      <!-- Left Ear Inner Illuminated Facets -->
      <polygon points="-190,-295 -230,-100 -140,-120 -95,-260" fill="#1e293b" />
      <polygon points="-230,-100 -200,-10 -140,-30 -140,-120" fill="#334155" />
      <polygon points="-200,-10 -165,10 -130,50 -140,-30" fill="#1e293b" />

      <!-- Right Outer Ear Base & Shadow -->
      <polygon points="190,-295 290,-230 310,-90 230,-100" fill="#0f172a" />
      <polygon points="310,-90 260,40 200,-10 230,-100" fill="#1e293b" />
      <polygon points="260,40 175,90 165,10 200,-10" fill="#172033" />

      <!-- Right Ear Inner Illuminated Facets -->
      <polygon points="190,-295 230,-100 140,-120 95,-260" fill="#334155" />
      <polygon points="230,-100 200,-10 140,-30 140,-120" fill="#475569" />
      <polygon points="200,-10 165,10 130,50 140,-30" fill="#334155" />

      <!-- 3. Crown & Temporal Plates (Vector Geometric Forehead) -->
      <!-- Central Forehead Diamond / Crown Peak -->
      <polygon points="0,-290 95,-260 0,-190" fill="#334155" />
      <polygon points="0,-290 -95,-260 0,-190" fill="#1e293b" />

      <!-- Temporal Upper Facets -->
      <polygon points="95,-260 140,-120 70,-130 0,-190" fill="#475569" />
      <polygon points="-95,-260 -140,-120 -70,-130 0,-190" fill="#1e293b" />

      <!-- Vector Prism Keystone (Crown Jewel of high-dimensional space) -->
      <polygon points="0,-190 45,-140 0,-90 -45,-140" fill="url(#prism-cyan)" stroke="#00f5ff" stroke-width="2" stroke-linejoin="round" />
      <polygon points="0,-190 0,-90 -45,-140" fill="#0284c7" opacity="0.6" />

      <!-- Mid-Brow Structural Bridge -->
      <polygon points="0,-90 70,-130 65,-50" fill="#334155" />
      <polygon points="0,-90 -70,-130 -65,-50" fill="#1e293b" />
      <polygon points="0,-90 65,-50 0,-20 -65,-50" fill="#0f172a" />

      <!-- 4. Focused Intelligent Eyes (Sharp Predator/Alert Almond Geometry) -->
      <!-- Left Eye Socket & Eye -->
      <polygon points="-140,-120 -65,-50 -105,-20 -140,-30" fill="#0b0f19" />
      <!-- Left Eye Almond Sclera & Iris -->
      <polygon points="-125,-60 -85,-55 -75,-40 -115,-45" fill="#061826" stroke="#0284c7" stroke-width="1.5" />
      <polygon points="-115,-58 -88,-54 -82,-43 -108,-47" fill="url(#cyan-optic)" />
      <!-- Left Eye Glint -->
      <polygon points="-105,-54 -95,-52 -98,-46" fill="#ffffff" />

      <!-- Right Eye Socket & Eye -->
      <polygon points="140,-120 65,-50 105,-20 140,-30" fill="#111827" />
      <!-- Right Eye Almond Sclera & Iris -->
      <polygon points="125,-60 85,-55 75,-40 115,-45" fill="#061826" stroke="#00f5ff" stroke-width="1.5" />
      <polygon points="115,-58 88,-54 82,-43 108,-47" fill="url(#cyan-optic)" />
      <!-- Right Eye Glint -->
      <polygon points="105,-54 95,-52 98,-46" fill="#ffffff" />

      <!-- 5. Cheeks & Muzzle Base Structure -->
      <polygon points="-65,-50 0,-20 0,60 -50,60 -105,-20" fill="#1e293b" />
      <polygon points="65,-50 0,-20 0,60 50,60 105,-20" fill="#334155" />
      <polygon points="-105,-20 -50,60 -70,120 -130,50" fill="#0f172a" />
      <polygon points="105,-20 50,60 70,120 130,50" fill="#1e293b" />

      <!-- 6. Powerful Titanium / Platinum Tusks -->
      <!-- Left Tusk -->
      <polygon points="-50,60 -70,120 -115,130 -145,180 -100,110 -60,80" fill="url(#titanium-tusk-left)" stroke="#64748b" stroke-width="1.5" stroke-linejoin="round" />
      <polygon points="-145,180 -100,110 -115,130" fill="#cbd5e1" />

      <!-- Right Tusk -->
      <polygon points="50,60 70,120 115,130 145,180 100,110 60,80" fill="url(#titanium-tusk-right)" stroke="#94a3b8" stroke-width="1.5" stroke-linejoin="round" />
      <polygon points="145,180 100,110 115,130" fill="#ffffff" />

      <!-- 7. Segmented Geometric Vector Trunk -->
      <!-- Trunk Root -->
      <polygon points="-50,60 0,60 0,110 -42,105" fill="#1e293b" />
      <polygon points="50,60 0,60 0,110 42,105" fill="#334155" />

      <!-- Trunk Segment 1 -->
      <polygon points="-42,105 0,110 0,165 -36,155" fill="#0f172a" />
      <polygon points="42,105 0,110 0,165 36,155" fill="#1e293b" />
      <line x1="-39" y1="130" x2="39" y2="130" stroke="#00f5ff" stroke-width="1.5" opacity="0.4" />

      <!-- Trunk Segment 2 -->
      <polygon points="-36,155 0,165 0,220 -30,210" fill="#1e293b" />
      <polygon points="36,155 0,165 0,220 30,210" fill="#334155" />
      <line x1="-33" y1="185" x2="33" y2="185" stroke="#00f5ff" stroke-width="1.5" opacity="0.4" />

      <!-- Trunk Segment 3 (Curving tip) -->
      <polygon points="-30,210 0,220 0,270 -24,260" fill="#0f172a" />
      <polygon points="30,210 0,220 0,270 24,260" fill="#1e293b" />

      <!-- Trunk Tip (Apex) -->
      <polygon points="-24,260 0,270 0,310 -15,295" fill="#1e293b" />
      <polygon points="24,260 0,270 0,310 15,295" fill="#38bdf8" />
      <polygon points="0,270 12,285 0,310 -12,285" fill="#00f5ff" opacity="0.8" />

    </g>
  </g>
</svg>`
}

async function main() {
  const outputDir = path.join(__dirname, '..', 'docs', 'images')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const svgContent = buildLogoSvg()
  const svgPath = path.join(outputDir, 'logo.svg')
  const pngPath = path.join(outputDir, 'logo.png')

  fs.writeFileSync(svgPath, svgContent, 'utf8')
  console.log(`Saved SVG to ${svgPath}`)

  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: 1024 },
  })
  const pngBuffer = resvg.render().asPng()
  fs.writeFileSync(pngPath, pngBuffer)
  console.log(`Successfully rendered PNG to ${pngPath} (1024x1024)`)
}

main().catch(console.error)

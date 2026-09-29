import type { ArtKind, ColorName } from '../lib/types'
import { COLOR_HEX } from '../lib/types'

/** Flat illustrations for demo pieces. Original artwork, no third-party images. */
const SHAPES: Record<ArtKind, { body: string; details?: string }> = {
  tee: {
    body: 'M68 42 L88 32 Q100 44 112 32 L132 42 L166 74 L146 94 L134 82 L134 206 L66 206 L66 82 L54 94 L34 74 Z',
    details: 'M88 32 Q100 50 112 32',
  },
  shirt: {
    body: 'M70 40 L88 30 L100 44 L112 30 L130 40 L150 60 L164 196 L146 200 L134 96 L134 208 L66 208 L66 96 L54 200 L36 196 L50 60 Z',
    details: 'M88 30 L96 52 L100 44 L104 52 L112 30 M100 50 L100 206 M100 80 h0.1 M100 110 h0.1 M100 140 h0.1 M100 170 h0.1',
  },
  knit: {
    body: 'M70 38 Q100 50 130 38 L152 56 L168 190 L148 196 L136 98 L138 206 L62 206 L64 98 L52 196 L32 190 L48 56 Z',
    details: 'M84 40 Q100 56 116 40 M62 194 H138 M62 200 H138 M150 184 L166 180 M50 184 L34 180',
  },
  trousers: {
    body: 'M64 30 H136 L148 214 H110 L100 92 L90 214 H52 Z',
    details: 'M64 44 H136 M100 44 V92 M82 44 L84 100 M118 44 L116 100',
  },
  jeans: {
    body: 'M66 30 H134 L144 214 H108 L100 90 L92 214 H56 Z',
    details: 'M66 44 H134 M100 44 V90 M70 56 Q80 70 90 56 M110 56 Q120 70 130 56 M60 196 H90 M110 196 H141',
  },
  skirt: {
    body: 'M72 44 H128 L160 196 Q100 210 40 196 Z',
    details: 'M72 58 H128 M88 58 L78 200 M112 58 L122 200',
  },
  blazer: {
    body: 'M68 36 L90 28 L100 40 L110 28 L132 36 L152 58 L166 198 L146 202 L136 104 L138 212 L62 212 L64 104 L54 202 L34 198 L48 58 Z',
    details: 'M90 28 L84 70 L100 140 L116 70 L110 28 M100 140 V212 M104 160 h0.1 M104 184 h0.1 M72 160 H92 M108 160 H128',
  },
  jacket: {
    body: 'M68 36 L90 26 Q100 34 110 26 L132 36 L154 58 L168 180 L148 186 L136 104 L138 188 L62 188 L64 104 L52 186 L32 180 L46 58 Z',
    details: 'M90 26 L86 44 L100 52 L114 44 L110 26 M100 52 V188 M62 176 H138 M74 110 H92 M108 110 H126',
  },
  coat: {
    body: 'M68 32 L90 24 L100 36 L110 24 L132 32 L152 54 L164 190 L146 194 L136 102 L144 226 L56 226 L64 102 L54 194 L36 190 L48 54 Z',
    details: 'M90 24 L82 72 L104 112 M110 24 L118 72 L104 112 M104 112 V226 M112 130 h0.1 M112 160 h0.1 M68 140 H88 M112 140 H132 M60 136 L140 136',
  },
  dress: {
    body: 'M82 26 L88 26 Q100 44 112 26 L118 26 L126 92 Q124 100 128 106 L164 214 Q100 226 36 214 L72 106 Q76 100 74 92 Z',
    details: 'M74 92 Q100 100 126 92 M82 26 L78 10 M118 26 L122 10',
  },
  sneakers: {
    body: 'M30 150 Q34 118 62 112 L100 106 Q112 100 118 110 Q140 128 168 134 Q180 138 178 156 L178 166 L30 166 Z',
    details: 'M30 156 H178 M76 112 L84 130 M88 110 L96 128 M100 108 L108 126',
  },
  loafers: {
    body: 'M28 154 Q30 132 58 128 L118 124 Q146 124 168 140 Q180 148 176 162 L28 162 Z',
    details: 'M28 156 H176 M104 126 Q120 146 144 134 M112 136 H134',
  },
  boots: {
    body: 'M70 30 H122 L124 136 Q160 142 172 158 L172 178 L62 178 L66 130 Z',
    details: 'M62 168 H172 M72 44 H120 M118 60 V130',
  },
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const c = (shift: number) => Math.max(0, Math.min(255, ((n >> shift) & 255) + amount))
  return `rgb(${c(16)}, ${c(8)}, ${c(0)})`
}

export function GarmentArt({ kind, color, className }: { kind: ArtKind; color: ColorName; className?: string }) {
  const shape = SHAPES[kind]
  const fill = COLOR_HEX[color]
  const light = ['white', 'cream', 'beige', 'yellow', 'pink'].includes(color)
  const stroke = light ? '#8d8479' : shade(fill, -45)
  const detail = light ? 'rgba(60,50,40,0.35)' : 'rgba(255,255,255,0.28)'
  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-hidden="true">
      <path d={shape.body} fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      {shape.details && (
        <path d={shape.details} fill="none" stroke={detail} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

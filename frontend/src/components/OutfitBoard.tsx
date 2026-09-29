import { t } from '../i18n/en'
import type { Piece } from '../lib/types'
import { PieceImage } from './PieceImage'
import { Badge } from './ui'

/**
 * A flat-lay board: the new piece gets the large tile, closet pieces stack beside it.
 * This is a composition of separate photos, not a rendering of the pieces worn together.
 */
export function OutfitBoard({ pieces, highlightId, compact = false }: { pieces: Piece[]; highlightId: string; compact?: boolean }) {
  const hero = pieces.find((p) => p.id === highlightId) ?? pieces[0]
  const rest = pieces.filter((p) => p.id !== hero.id)
  return (
    <div className={`grid aspect-[5/6] grid-cols-[1.35fr_1fr] gap-2 ${compact ? '' : 'sm:gap-3'}`}>
      <figure className="relative min-h-0 overflow-hidden rounded-2xl bg-blush/45">
        <div className="absolute inset-0">
          <PieceImage piece={hero} />
        </div>
        <div className="absolute start-3 top-3">
          <Badge tone="plum">{t.looks.newPiece}</Badge>
        </div>
        {!compact && <figcaption className="sr-only">{hero.name}</figcaption>}
      </figure>
      <div className="grid min-h-0 gap-2 sm:gap-3" style={{ gridTemplateRows: `repeat(${Math.max(rest.length, 1)}, minmax(0, 1fr))` }}>
        {rest.map((p) => (
          <figure key={p.id} className="relative min-h-0 overflow-hidden rounded-2xl bg-ivory">
            <div className={`absolute inset-x-0 top-0 ${compact ? 'bottom-0' : 'bottom-5'}`}>
              <PieceImage piece={p} fit="contain" />
            </div>
            {!compact && (
              <figcaption className="absolute inset-x-2 bottom-2 truncate text-[11px] font-medium text-ink/70">{p.name}</figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  )
}

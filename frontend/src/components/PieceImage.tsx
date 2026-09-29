import { useObjectUrl } from '../lib/image'
import type { Piece } from '../lib/types'
import { GarmentArt } from './GarmentArt'

/** Shows the user's photo, or the drawn illustration for sample pieces. */
export function PieceImage({ piece, className = '', fit = 'cover' }: { piece: Piece; className?: string; fit?: 'cover' | 'contain' }) {
  const url = useObjectUrl(piece.image)
  if (url) {
    return <img src={url} alt={piece.name} className={`size-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`} />
  }
  if (piece.art) {
    return (
      <div className={`flex size-full items-center justify-center ${fit === 'contain' ? 'p-[5%]' : 'p-[12%]'} ${className}`} role="img" aria-label={piece.name}>
        <GarmentArt kind={piece.art.kind} color={piece.color} className="size-full drop-shadow-[0_10px_14px_rgba(30,26,24,0.12)]" />
      </div>
    )
  }
  return <div className={`size-full bg-sand ${className}`} role="img" aria-label={piece.name} />
}

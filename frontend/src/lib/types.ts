export const CATEGORIES = ['top', 'bottom', 'outerwear', 'dress', 'shoes'] as const
export type Category = (typeof CATEGORIES)[number]

export const OCCASIONS = ['casual', 'work', 'evening', 'active'] as const
export type Occasion = (typeof OCCASIONS)[number]

export const NEUTRALS = ['black', 'white', 'cream', 'beige', 'camel', 'brown', 'grey', 'navy', 'denim', 'olive'] as const
export const ACCENTS = ['burgundy', 'red', 'pink', 'blue', 'green', 'yellow', 'purple', 'orange'] as const
export type ColorName = (typeof NEUTRALS)[number] | (typeof ACCENTS)[number]
export const COLORS: readonly ColorName[] = [...NEUTRALS, ...ACCENTS]

export const COLOR_HEX: Record<ColorName, string> = {
  black: '#1d1c1c', white: '#f8f7f4', cream: '#efe6d4', beige: '#d8c4a6', camel: '#b98a55',
  brown: '#6b4a33', grey: '#9b9a98', navy: '#233152', denim: '#5476a0', olive: '#6d6b3f',
  burgundy: '#6e1f33', red: '#c0332f', pink: '#e7a3b5', blue: '#3f7fd0', green: '#3d8a5a',
  yellow: '#e8c547', purple: '#7a4f9a', orange: '#e07b39',
}

export function isNeutral(color: ColorName): boolean {
  return (NEUTRALS as readonly string[]).includes(color)
}

export type ArtKind =
  | 'tee' | 'shirt' | 'knit' | 'trousers' | 'jeans' | 'skirt'
  | 'blazer' | 'jacket' | 'coat' | 'dress' | 'sneakers' | 'loafers' | 'boots'

export interface Piece {
  id: string
  name: string
  category: Category
  color: ColorName
  occasions: Occasion[]
  /** User photo, stored only in this browser (IndexedDB). */
  image?: Blob
  /** Illustration for demo pieces, drawn in-app. */
  art?: { kind: ArtKind }
  demo?: boolean
  createdAt: number
}

export interface Candidate extends Piece {
  price: number
  budget?: number
}

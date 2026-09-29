import type { ArtKind, Candidate, Category, ColorName, Occasion, Piece } from './types'

const demo = (id: string, name: string, category: Category, color: ColorName, occasions: Occasion[], kind: ArtKind): Piece => ({
  id: `demo-${id}`, name, category, color, occasions, art: { kind }, demo: true, createdAt: 0,
})

/** Sample closet for judges and first-time visitors. Clearly marked as demo data in the UI. */
export const DEMO_CLOSET: Piece[] = [
  demo('tee-white', 'White crew tee', 'top', 'white', ['casual', 'active'], 'tee'),
  demo('shirt-blue', 'Blue poplin shirt', 'top', 'blue', ['work', 'casual'], 'shirt'),
  demo('knit-cream', 'Cream knit sweater', 'top', 'cream', ['casual', 'work'], 'knit'),
  demo('tee-black', 'Black fitted tee', 'top', 'black', ['casual', 'evening'], 'tee'),
  demo('jeans', 'Straight-leg jeans', 'bottom', 'denim', ['casual'], 'jeans'),
  demo('trousers-black', 'Black tailored trousers', 'bottom', 'black', ['work', 'evening'], 'trousers'),
  demo('trousers-beige', 'Beige wide-leg trousers', 'bottom', 'beige', ['work', 'casual'], 'trousers'),
  demo('skirt-burgundy', 'Burgundy midi skirt', 'bottom', 'burgundy', ['evening', 'work'], 'skirt'),
  demo('dress-navy', 'Navy slip dress', 'dress', 'navy', ['evening'], 'dress'),
  demo('sneakers', 'White sneakers', 'shoes', 'white', ['casual', 'active'], 'sneakers'),
  demo('loafers', 'Brown loafers', 'shoes', 'brown', ['work', 'casual'], 'loafers'),
]

export const DEMO_CANDIDATES: Candidate[] = [
  { ...demo('cand-blazer', 'Camel blazer', 'outerwear', 'camel', ['work', 'casual'], 'blazer'), price: 89 },
  { ...demo('cand-jacket', 'Green utility jacket', 'outerwear', 'green', ['casual'], 'jacket'), price: 65 },
]

/**
 * Declared, deterministic outfit rules. No hidden scores are shown to users;
 * ranking only orders outfits that already pass every rule.
 *
 * Rule 1 — Complete look: top + bottom, or a dress. Outerwear layers over a complete look.
 * Rule 2 — Shared occasion: every piece must be tagged with at least one common occasion.
 * Rule 3 — One statement color: at most one non-neutral color family per outfit
 *          (several pieces in the same accent color count as one, i.e. tonal dressing).
 * Shoes are added when a pair passes rules 2 and 3; they are never required.
 */
import type { Candidate, Category, ColorName, Occasion, Piece } from './types'
import { OCCASIONS, isNeutral } from './types'

export type Reason =
  | { kind: 'occasion'; occasions: Occasion[] }
  | { kind: 'neutralBase' }
  | { kind: 'accent'; color: ColorName }
  | { kind: 'tonal'; color: ColorName }
  | { kind: 'layer' }

export type Exclusion = { kind: 'occasion' } | { kind: 'accentClash'; color: ColorName } | { kind: 'noCompleteLook' }

export interface Outfit {
  id: string
  pieces: Piece[]
  sharedOccasions: Occasion[]
  reasons: Reason[]
}

export interface Evaluation {
  outfits: Outfit[]
  /** Core combinations (without optional shoes) that pass all rules. */
  combinations: number
  /** Closet pieces that appear in at least one valid combination. */
  matchedPieceIds: string[]
  /** Closet pieces in a relevant category that never pass, with the first failing rule. */
  excluded: { piece: Piece; reason: Exclusion }[]
  /** Which categories the candidate needs from the closet but the closet lacks. */
  missing: Category[]
  budget: { price: number; budget?: number; within?: boolean; difference?: number }
  costPerCombination?: number
}

const SLOT_ORDER: Category[] = ['outerwear', 'top', 'dress', 'bottom', 'shoes']

export function sharedOccasions(pieces: Piece[]): Occasion[] {
  return OCCASIONS.filter((o) => pieces.every((p) => p.occasions.includes(o)))
}

function accentColors(pieces: Piece[]): ColorName[] {
  return [...new Set(pieces.map((p) => p.color).filter((c) => !isNeutral(c)))]
}

export function passes(pieces: Piece[]): boolean {
  return sharedOccasions(pieces).length > 0 && accentColors(pieces).length <= 1
}

/** Required closet slots for each candidate category (alternatives are OR'ed). */
function baseLooks(candidate: Piece, closet: Piece[]): Piece[][] {
  const by = (c: Category) => closet.filter((p) => p.category === c)
  const pairs = (a: Piece[], b: Piece[]) => a.flatMap((x) => b.map((y) => [x, y]))
  switch (candidate.category) {
    case 'top':
      return by('bottom').map((b) => [candidate, b])
    case 'bottom':
      return by('top').map((t) => [t, candidate])
    case 'dress':
      return [[candidate]]
    case 'outerwear':
    case 'shoes':
      return [...pairs(by('top'), by('bottom')), ...by('dress').map((d) => [d])].map((look) => [candidate, ...look])
  }
}

function neededCategories(candidate: Piece): Category[] {
  switch (candidate.category) {
    case 'top': return ['bottom']
    case 'bottom': return ['top']
    case 'dress': return []
    case 'outerwear':
    case 'shoes': return ['top', 'bottom', 'dress']
  }
}

function sortPieces(pieces: Piece[]): Piece[] {
  return [...pieces].sort((a, b) => SLOT_ORDER.indexOf(a.category) - SLOT_ORDER.indexOf(b.category))
}

function reasonsFor(pieces: Piece[], candidate: Piece): Reason[] {
  const reasons: Reason[] = [{ kind: 'occasion', occasions: sharedOccasions(pieces) }]
  const accents = accentColors(pieces)
  if (accents.length === 0) reasons.push({ kind: 'neutralBase' })
  else if (pieces.filter((p) => p.color === accents[0]).length > 1) reasons.push({ kind: 'tonal', color: accents[0] })
  else reasons.push({ kind: 'accent', color: accents[0] })
  if (candidate.category === 'outerwear') reasons.push({ kind: 'layer' })
  return reasons
}

function rank(pieces: Piece[]): number {
  // Only orders looks that already pass: more shared occasions, then calmer color balance.
  return sharedOccasions(pieces).length * 10 + pieces.filter((p) => isNeutral(p.color)).length
}

export function evaluate(candidate: Candidate, closet: Piece[], limit = 3): Evaluation {
  const others = closet.filter((p) => p.id !== candidate.id)
  const valid = baseLooks(candidate, others).filter(passes)
  const shoes = candidate.category === 'shoes' ? [] : others.filter((p) => p.category === 'shoes')

  const looks = valid
    .map((look) => {
      const pair = shoes.filter((s) => passes([...look, s])).sort((a, b) => rank([...look, b]) - rank([...look, a]))[0]
      return pair ? [...look, pair] : look
    })
    .sort((a, b) => rank(b) - rank(a))

  // Greedy pick that prefers looks reusing fewer closet pieces already shown.
  const picked: Piece[][] = []
  const used = new Map<string, number>()
  const pool = [...looks]
  while (picked.length < limit && pool.length) {
    let bestIndex = 0
    let best = -Infinity
    pool.forEach((look, i) => {
      const reuse = look.reduce((n, p) => n + (p.id === candidate.id ? 0 : used.get(p.id) ?? 0), 0)
      const score = rank(look) - reuse * 6
      if (score > best) [best, bestIndex] = [score, i]
    })
    const [look] = pool.splice(bestIndex, 1)
    picked.push(look)
    look.forEach((p) => used.set(p.id, (used.get(p.id) ?? 0) + 1))
  }

  const matched = new Set(valid.flat().map((p) => p.id))
  looks.flat().forEach((p) => matched.add(p.id))
  matched.delete(candidate.id)

  const relevant = new Set<Category>([...neededCategories(candidate), ...(candidate.category === 'shoes' ? [] : ['shoes' as const])])
  const excluded = others
    .filter((p) => relevant.has(p.category) && !matched.has(p.id))
    .map((piece) => ({ piece, reason: exclusionFor(candidate, piece) }))

  const has = (c: Category) => others.some((p) => p.category === c)
  const needsLook = candidate.category === 'outerwear' || candidate.category === 'shoes'
  const missing = needsLook
    ? has('dress') || (has('top') && has('bottom')) ? [] : (['top', 'bottom'] as Category[]).filter((c) => !has(c))
    : neededCategories(candidate).filter((c) => !has(c))

  const { price, budget } = candidate
  return {
    outfits: picked.map((pieces) => ({
      id: pieces.map((p) => p.id).join('+'),
      pieces: sortPieces(pieces),
      sharedOccasions: sharedOccasions(pieces),
      reasons: reasonsFor(pieces, candidate),
    })),
    combinations: valid.length,
    matchedPieceIds: [...matched],
    excluded,
    missing,
    budget: budget ? { price, budget, within: price <= budget, difference: Math.abs(budget - price) } : { price },
    costPerCombination: valid.length ? price / valid.length : undefined,
  }
}

function exclusionFor(candidate: Piece, piece: Piece): Exclusion {
  if (sharedOccasions([candidate, piece]).length === 0) return { kind: 'occasion' }
  const clash = accentColors([candidate, piece]).find((c) => c !== candidate.color)
  if (clash) return { kind: 'accentClash', color: clash }
  // Fine as a pair, but every complete look with it breaks a rule through a third piece.
  return { kind: 'noCompleteLook' }
}

import { describe, expect, it } from 'vitest'
import { evaluate, passes } from './rules'
import type { Candidate, Category, ColorName, Occasion, Piece } from './types'

let n = 0
const piece = (category: Category, color: ColorName, occasions: Occasion[]): Piece => ({
  id: `p${++n}`, name: `${color} ${category}`, category, color, occasions, createdAt: n,
})
const candidate = (category: Category, color: ColorName, occasions: Occasion[], price = 100, budget?: number): Candidate => ({
  ...piece(category, color, occasions), price, budget,
})

describe('passes', () => {
  it('requires a shared occasion', () => {
    expect(passes([piece('top', 'white', ['work']), piece('bottom', 'black', ['active'])])).toBe(false)
  })
  it('allows one statement color, including tonal repeats', () => {
    expect(passes([piece('top', 'red', ['casual']), piece('bottom', 'denim', ['casual'])])).toBe(true)
    expect(passes([piece('top', 'pink', ['casual']), piece('bottom', 'pink', ['casual'])])).toBe(true)
    expect(passes([piece('top', 'red', ['casual']), piece('bottom', 'green', ['casual'])])).toBe(false)
  })
})

describe('evaluate', () => {
  it('builds outerwear looks over complete outfits and counts combinations', () => {
    const closet = [
      piece('top', 'white', ['casual', 'work']),
      piece('top', 'red', ['casual']),
      piece('bottom', 'denim', ['casual']),
      piece('bottom', 'green', ['casual']),
    ]
    const result = evaluate(candidate('outerwear', 'camel', ['casual', 'work']), closet)
    // white+denim, white+green, red+denim pass; red+green clashes.
    expect(result.combinations).toBe(3)
    expect(result.outfits).toHaveLength(3)
    expect(result.outfits[0].pieces[0].category).toBe('outerwear')
    expect(result.outfits[0].reasons.some((r) => r.kind === 'layer')).toBe(true)
  })

  it('reports empty results honestly with the missing category', () => {
    const result = evaluate(candidate('top', 'white', ['casual']), [piece('top', 'black', ['casual'])])
    expect(result.outfits).toEqual([])
    expect(result.missing).toEqual(['bottom'])
    expect(result.costPerCombination).toBeUndefined()
  })

  it('explains why a piece is excluded', () => {
    const formal = piece('bottom', 'black', ['evening'])
    const clash = piece('bottom', 'green', ['casual'])
    const result = evaluate(candidate('top', 'red', ['casual']), [formal, clash])
    const reasons = Object.fromEntries(result.excluded.map((e) => [e.piece.id, e.reason.kind]))
    expect(reasons[formal.id]).toBe('occasion')
    expect(reasons[clash.id]).toBe('accentClash')
  })

  it('adds shoes only when they pass the rules', () => {
    const closet = [piece('bottom', 'navy', ['work']), piece('shoes', 'black', ['work']), piece('shoes', 'pink', ['work'])]
    const result = evaluate(candidate('top', 'blue', ['work']), closet)
    expect(result.outfits[0].pieces.map((p) => p.color)).toEqual(['blue', 'navy', 'black'])
  })

  it('computes budget fit and price per combination', () => {
    const closet = [piece('bottom', 'black', ['casual']), piece('bottom', 'denim', ['casual'])]
    const result = evaluate(candidate('top', 'white', ['casual'], 120, 100), closet)
    expect(result.budget).toEqual({ price: 120, budget: 100, within: false, difference: 20 })
    expect(result.costPerCombination).toBe(60)
  })

  it('prefers variety across the suggested outfits', () => {
    const closet = [
      piece('top', 'white', ['casual', 'work']),
      piece('top', 'grey', ['casual']),
      piece('bottom', 'black', ['casual', 'work']),
      piece('bottom', 'denim', ['casual']),
    ]
    const result = evaluate(candidate('outerwear', 'black', ['casual', 'work']), closet, 2)
    const [a, b] = result.outfits.map((o) => new Set(o.pieces.map((p) => p.id)))
    expect([...a].filter((id) => b.has(id))).toHaveLength(1) // only the candidate is shared
  })
})

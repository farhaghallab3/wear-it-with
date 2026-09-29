import { useState, type FormEvent } from 'react'
import { t } from '../i18n/en'
import { ACCEPTED_IMAGES, newId, shrinkImage } from '../lib/image'
import type { Candidate, Category, ColorName, Occasion, Piece } from '../lib/types'
import { ACCENTS, CATEGORIES, COLOR_HEX, NEUTRALS, OCCASIONS } from '../lib/types'
import { PieceImage } from './PieceImage'
import { Notice, Spinner } from './ui'

interface Props<T extends Piece> {
  initial?: T
  withPrice?: boolean
  onSave: (piece: T) => void
  onCancel: () => void
  onDelete?: () => void
}

export function PieceForm<T extends Piece>({ initial, withPrice, onSave, onCancel, onDelete }: Props<T>) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? (withPrice ? 'outerwear' : 'top'))
  const [color, setColor] = useState<ColorName>(initial?.color ?? 'black')
  const [occasions, setOccasions] = useState<Occasion[]>(initial?.occasions ?? ['casual'])
  const [image, setImage] = useState<Blob | undefined>(initial?.image)
  const initialCandidate = initial as Candidate | undefined
  const [price, setPrice] = useState(initialCandidate?.price?.toString() ?? '')
  const [budget, setBudget] = useState(initialCandidate?.budget?.toString() ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const hasVisual = Boolean(image || initial?.art)
  const priceValue = Number(price)
  const priceOk = !withPrice || (price !== '' && priceValue >= 0)

  async function pickPhoto(file?: File) {
    if (!file) return
    setBusy(true)
    setError(undefined)
    try {
      setImage(await shrinkImage(file))
    } catch {
      setError(t.piece.photoError)
    } finally {
      setBusy(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const missing = [
      !name.trim() && t.piece.missing.name,
      !hasVisual && t.piece.missing.photo,
      occasions.length === 0 && t.piece.missing.occasion,
      !priceOk && t.piece.missing.price,
    ].filter((m): m is string => Boolean(m))
    if (missing.length) {
      setError(t.piece.required(missing))
      return
    }
    const piece: Piece = {
      ...initial,
      id: initial?.id ?? newId(),
      name: name.trim(),
      category,
      color,
      occasions,
      image,
      // A new photo replaces the sample illustration and removes the sample flag.
      art: image ? undefined : initial?.art,
      demo: image && image !== initial?.image ? false : initial?.demo,
      createdAt: initial?.createdAt ?? Date.now(),
    }
    const result = withPrice
      ? ({ ...piece, price: priceValue, budget: budget === '' ? undefined : Number(budget) } as Candidate)
      : piece
    onSave(result as T)
  }

  const preview: Piece = { id: 'preview', name: name || 'Preview', category, color, occasions, image, art: image ? undefined : initial?.art, createdAt: 0 }

  return (
    <form onSubmit={submit} className="grid gap-7 sm:grid-cols-[200px_1fr]">
      <div>
        <span className="field-label">{t.piece.photo}</span>
        <label className="group relative block aspect-[3/4] max-w-44 cursor-pointer sm:max-w-none overflow-hidden rounded-2xl bg-ivory ring-plum has-[:focus-visible]:ring-2">
          {hasVisual ? (
            <PieceImage piece={preview} />
          ) : (
            <span className="flex size-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M4 7h3l2-3h6l2 3h3v13H4z" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {t.piece.choosePhoto}
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-paper/70">
              <Spinner />
            </span>
          )}
          <input type="file" accept={ACCEPTED_IMAGES} className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </label>
        <p className="mt-2 text-xs text-muted">{hasVisual ? t.piece.replacePhoto : t.piece.photoHint}</p>
        {withPrice && <p className="mt-2 text-xs text-muted">{t.consider.tryOnPhotoNote}</p>}
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="piece-name" className="field-label">{t.piece.name}</label>
          <input id="piece-name" className="input" value={name} maxLength={60} placeholder={t.piece.namePlaceholder} onChange={(e) => setName(e.target.value)} />
        </div>

        <fieldset>
          <legend className="field-label">{t.piece.category}</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label key={c} className="chip">
                <input type="radio" name="category" className="sr-only" checked={category === c} onChange={() => setCategory(c)} />
                {t.category[c]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="field-label">{t.piece.color}</legend>
          <p className="-mt-1 mb-3 text-xs text-muted">{t.piece.colorHelp}</p>
          {[{ label: t.piece.neutrals, colors: NEUTRALS }, { label: t.piece.accents, colors: ACCENTS }].map((group) => (
            <div key={group.label} className="mb-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.colors.map((c) => (
                  <label key={c} className="chip py-1.5 ps-1.5">
                    <input type="radio" name="color" className="sr-only" checked={color === c} onChange={() => setColor(c)} />
                    <span className="size-5 rounded-full ring-1 ring-ink/15 [label:has(:checked)_&]:ring-2 [label:has(:checked)_&]:ring-paper/70" style={{ background: COLOR_HEX[c] }} />
                    {t.color(c)}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        <fieldset>
          <legend className="field-label">{t.piece.occasions}</legend>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <label key={o} className="chip">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={occasions.includes(o)}
                  onChange={(e) => setOccasions(e.target.checked ? [...occasions, o] : occasions.filter((x) => x !== o))}
                />
                {t.occasion[o]}
              </label>
            ))}
          </div>
        </fieldset>

        {withPrice && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="price" className="field-label">{t.consider.price}</label>
              <input id="price" className="input" type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label htmlFor="budget" className="field-label">{t.consider.budget}</label>
              <input id="budget" className="input" type="number" inputMode="decimal" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} aria-describedby="budget-hint" />
              <p id="budget-hint" className="mt-1 text-xs text-muted">{t.consider.budgetHint}</p>
            </div>
          </div>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <button type="submit" className="btn-primary" disabled={busy}>{t.piece.save}</button>
          <button type="button" className="btn-ghost" onClick={onCancel}>{t.piece.cancel}</button>
          {onDelete && (
            <button
              type="button"
              className="btn-link ms-auto text-rust"
              onClick={() => window.confirm(t.piece.confirmDelete) && onDelete()}
            >
              {t.piece.delete}
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

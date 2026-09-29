import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GarmentArt } from '../components/GarmentArt'
import { OutfitBoard } from '../components/OutfitBoard'
import { PieceImage } from '../components/PieceImage'
import { Arrow, EmptyState, PageHeader } from '../components/ui'
import { money, t } from '../i18n/en'
import { evaluate, type Evaluation } from '../lib/rules'
import { useStore } from '../lib/store'
import type { Candidate } from '../lib/types'
import { Loading } from './Closet'

export function Looks() {
  const { ready, closet, candidates, activeCandidate, setActiveCandidate } = useStore()
  const navigate = useNavigate()
  const result = useMemo(() => (activeCandidate ? evaluate(activeCandidate, closet) : undefined), [activeCandidate, closet])

  if (!ready) return <Loading />
  if (!activeCandidate || !result) {
    return (
      <>
        <PageHeader eyebrow={`03 · ${t.app.nav.looks}`} title={t.looks.noCandidate} />
        <EmptyState title={t.looks.noCandidate} body={t.looks.noCandidateBody} art={<GarmentArt kind="jacket" color="olive" />}>
          <Link to="/consider" className="btn-primary">{t.consider.add}</Link>
        </EmptyState>
      </>
    )
  }

  const relevantTotal = result.matchedPieceIds.length + result.excluded.length

  return (
    <>
      <div className="mb-10 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
        <PageHeader eyebrow={`03 · ${t.app.nav.looks}`} title={t.looks.title(activeCandidate.name)} />
        {candidates.length > 1 && (
          <div className="flex flex-wrap gap-2 lg:mb-12" role="group" aria-label="Choose option">
            {candidates.map((c) => (
              <label key={c.id} className="chip">
                <input type="radio" name="candidate" className="sr-only" checked={c.id === activeCandidate.id} onChange={() => setActiveCandidate(c.id)} />
                {c.name}
              </label>
            ))}
            <Link to="/compare" className="btn-link ms-2">{t.looks.compare} <Arrow /></Link>
          </div>
        )}
      </div>

      <Summary candidate={activeCandidate} result={result} relevantTotal={relevantTotal} />

      {result.outfits.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title={t.looks.noLooks}
            body={result.missing.length ? t.looks.missing(result.missing) : t.looks.noLooksBody}
          >
            <Link to="/closet" className="btn-primary">{t.closet.add}</Link>
          </EmptyState>
        </div>
      ) : (
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {result.outfits.map((outfit, i) => (
            <li key={outfit.id} className="card flex flex-col p-3 sm:p-4">
              <OutfitBoard pieces={outfit.pieces} highlightId={activeCandidate.id} />
              <div className="flex flex-1 flex-col px-2 pb-2 pt-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-2xl italic">{t.looks.look(i + 1)}</h2>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {outfit.sharedOccasions.map((o) => t.occasion[o]).join(' · ')}
                  </p>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-plum">{t.looks.why}</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed">
                  {outfit.reasons.map((r) => (
                    <li key={r.kind} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-plum" aria-hidden="true" />
                      {t.reason(r)}
                    </li>
                  ))}
                </ul>
                <button className="btn-primary mt-6 w-full" onClick={() => navigate(`/try-on?look=${encodeURIComponent(outfit.id)}`)}>
                  {t.looks.preview}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {result.excluded.length > 0 && (
        <section className="mt-16" aria-labelledby="excluded">
          <h2 id="excluded" className="mb-5 text-3xl">{t.looks.notMatched}</h2>
          <ul className="flex gap-3 overflow-x-auto pb-2">
            {result.excluded.map(({ piece, reason }) => (
              <li key={piece.id} className="w-36 shrink-0">
                <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-ivory opacity-70 grayscale-[35%]">
                  <PieceImage piece={piece} />
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{piece.name}</p>
                <p className="text-xs text-muted">{t.exclusion(reason)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="card mt-16 p-6 sm:p-8">
        <summary className="cursor-pointer font-display text-2xl">{t.looks.rulesTitle}</summary>
        <ol className="mt-5 list-decimal space-y-3 ps-5 text-sm leading-relaxed">
          {t.looks.rules.map((rule) => <li key={rule}>{rule}</li>)}
        </ol>
        <p className="mt-5 text-xs text-muted">{t.looks.rulesNote}</p>
      </details>
    </>
  )
}

function Summary({ candidate, result, relevantTotal }: { candidate: Candidate; result: Evaluation; relevantTotal: number }) {
  const { budget } = result
  const budgetText =
    budget.budget === undefined
      ? t.looks.noBudget
      : budget.difference === 0
        ? t.looks.onBudget
        : budget.within
          ? t.looks.withinBudget(money(budget.difference!))
          : t.looks.overBudget(money(budget.difference!))

  return (
    <div className="grid gap-px overflow-hidden rounded-3xl bg-line sm:grid-cols-[auto_1fr_1fr_1fr]">
      <div className="flex items-center gap-4 bg-ivory p-4 sm:pe-8">
        <div className="aspect-[3/4] w-16 overflow-hidden rounded-xl bg-paper">
          <PieceImage piece={candidate} />
        </div>
        <div>
          <p className="font-display text-3xl">{money(candidate.price)}</p>
          <p className={`text-sm font-semibold ${budget.within === false ? 'text-rust' : budget.within ? 'text-sage' : 'text-muted'}`}>
            {budgetText}
          </p>
        </div>
      </div>
      <Stat value={String(result.combinations)} label={t.looks.combinationsLabel} help={t.looks.combinationsHelp} />
      <Stat
        value={`${result.matchedPieceIds.length}/${relevantTotal}`}
        label={t.looks.pairsWithLabel}
        help={t.looks.pairsWithHelp}
      />
      <Stat
        value={result.costPerCombination !== undefined ? money(result.costPerCombination) : '—'}
        label={t.looks.pricePerLook}
        help={t.looks.pricePerLookHelp}
      />
    </div>
  )
}

function Stat({ value, label, help }: { value: string; label: string; help: string }) {
  return (
    <div className="bg-ivory p-5">
      <p className="font-display text-4xl">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-muted">{help}</p>
    </div>
  )
}

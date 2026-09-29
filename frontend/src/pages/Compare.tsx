import { Link } from 'react-router-dom'
import { GarmentArt } from '../components/GarmentArt'
import { PieceImage } from '../components/PieceImage'
import { EmptyState, PageHeader } from '../components/ui'
import { money, t } from '../i18n/en'
import { evaluate } from '../lib/rules'
import { useStore } from '../lib/store'
import { Loading } from './Closet'

export function Compare() {
  const { ready, closet, candidates, setActiveCandidate } = useStore()
  if (!ready) return <Loading />

  if (candidates.length < 2) {
    return (
      <>
        <PageHeader title={t.compare.title} />
        <EmptyState title={t.compare.needTwo} body={t.compare.needTwoBody} art={<GarmentArt kind="blazer" color="navy" />}>
          <Link to="/consider" className="btn-primary">{t.consider.addAnother}</Link>
        </EmptyState>
      </>
    )
  }

  const [a, b] = candidates.map((c) => ({ c, r: evaluate(c, closet) }))
  const verdicts: string[] = []
  const diff = a.r.combinations - b.r.combinations
  if (diff !== 0) {
    const more = diff > 0 ? a : b
    verdicts.push(t.compare.verdictMore(more.c.name, Math.abs(diff)))
  } else verdicts.push(t.compare.verdictTie)
  if (a.c.price !== b.c.price) {
    const cheaper = a.c.price < b.c.price ? a : b
    verdicts.push(t.compare.verdictCheaper(cheaper.c.name, money(Math.abs(a.c.price - b.c.price))))
  }
  const withinA = a.r.budget.within
  const withinB = b.r.budget.within
  if (withinA !== undefined && withinB !== undefined && withinA !== withinB) {
    verdicts.push(t.compare.verdictBudget((withinA ? a : b).c.name))
  }

  const rows: { label: string; value: (x: typeof a) => string }[] = [
    { label: t.compare.price, value: (x) => money(x.c.price) },
    {
      label: t.compare.budget,
      value: (x) =>
        x.r.budget.budget === undefined
          ? '—'
          : x.r.budget.within
            ? t.looks.withinBudget(money(x.r.budget.difference!))
            : t.looks.overBudget(money(x.r.budget.difference!)),
    },
    { label: t.compare.combinations, value: (x) => String(x.r.combinations) },
    { label: t.compare.pairsWith, value: (x) => `${x.r.matchedPieceIds.length}/${x.r.matchedPieceIds.length + x.r.excluded.length}` },
    { label: t.compare.perLook, value: (x) => (x.r.costPerCombination !== undefined ? money(x.r.costPerCombination) : '—') },
  ]

  return (
    <>
      <PageHeader title={t.compare.title}>{t.compare.subtitle}</PageHeader>

      <div className="overflow-hidden rounded-3xl bg-ivory">
        <div className="grid grid-cols-[minmax(0,0.8fr)_1fr_1fr] gap-px bg-line">
          <div className="bg-ivory" />
          {[a, b].map((x) => (
            <div key={x.c.id} className="bg-ivory p-3 sm:p-6">
              <div className="mx-auto aspect-[3/4] w-full max-w-40 overflow-hidden rounded-2xl bg-paper">
                <PieceImage piece={x.c} />
              </div>
              <p className="mt-3 text-center font-display text-lg leading-tight sm:text-2xl">{x.c.name}</p>
              <p className="mt-2 text-center">
                <Link to="/looks" onClick={() => setActiveCandidate(x.c.id)} className="btn-link">{t.consider.seeLooks}</Link>
              </p>
            </div>
          ))}
          {rows.map((row) => (
            <Row key={row.label} label={row.label} a={row.value(a)} b={row.value(b)} />
          ))}
        </div>
      </div>

      <section className="mt-10 max-w-2xl">
        <ul className="space-y-3 font-display text-2xl leading-snug">
          {verdicts.map((v) => <li key={v}>{v}</li>)}
        </ul>
        <p className="mt-5 text-sm text-muted">{t.compare.note}</p>
      </section>
    </>
  )
}

function Row({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <>
      <div className="bg-ivory p-3 text-[11px] font-semibold uppercase tracking-wide text-muted [overflow-wrap:anywhere] sm:p-6 sm:text-sm sm:tracking-wider">{label}</div>
      <div className="bg-paper p-3 text-center text-base font-semibold sm:p-6 sm:text-lg">{a}</div>
      <div className="bg-paper p-3 text-center text-base font-semibold sm:p-6 sm:text-lg">{b}</div>
    </>
  )
}

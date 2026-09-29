import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GarmentArt } from '../components/GarmentArt'
import { PieceForm } from '../components/PieceForm'
import { PieceImage } from '../components/PieceImage'
import { Arrow, Badge, EmptyState, Notice, PageHeader, Sheet, Spinner } from '../components/ui'
import { t } from '../i18n/en'
import { MAX_CLOSET, useStore } from '../lib/store'
import type { Category, Piece } from '../lib/types'
import { CATEGORIES } from '../lib/types'

export function Closet() {
  const { ready, closet, savePiece, removePiece, loadDemo, clearDemo } = useStore()
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [editing, setEditing] = useState<Piece | 'new' | null>(null)

  if (!ready) return <Loading />

  const visible = filter === 'all' ? closet : closet.filter((p) => p.category === filter)
  const hasDemo = closet.some((p) => p.demo)
  const close = () => setEditing(null)

  return (
    <>
      <PageHeader eyebrow={`01 · ${t.app.nav.closet}`} title={t.closet.title}>
        {t.closet.subtitle}
      </PageHeader>

      {closet.length === 0 ? (
        <EmptyState
          title={t.closet.empty}
          body={t.closet.emptyBody}
          art={<GarmentArt kind="shirt" color="cream" />}
        >
          <button className="btn-primary" onClick={() => setEditing('new')}>{t.closet.add}</button>
          <button className="btn-ghost" onClick={loadDemo}>{t.closet.loadDemo}</button>
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
              {(['all', ...CATEGORIES] as const).map((c) => (
                <label key={c} className="chip">
                  <input type="radio" name="filter" className="sr-only" checked={filter === c} onChange={() => setFilter(c)} />
                  {c === 'all' ? t.closet.all : t.category[c]}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted">{t.closet.count(closet.length)}</p>
          </div>

          {hasDemo && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Notice>{t.closet.demoNotice}</Notice>
              <button className="btn-link" onClick={clearDemo}>{t.closet.clearDemo}</button>
            </div>
          )}

          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            <li>
              <button
                onClick={() => setEditing('new')}
                disabled={closet.length >= MAX_CLOSET}
                title={closet.length >= MAX_CLOSET ? t.closet.full : undefined}
                className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line text-muted transition hover:border-plum hover:text-plum disabled:opacity-40"
              >
                <span className="text-4xl font-light">+</span>
                <span className="text-sm font-semibold">{t.closet.add}</span>
              </button>
            </li>
            {visible.map((piece) => (
              <li key={piece.id}>
                <button onClick={() => setEditing(piece)} className="group block w-full text-start">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-ivory transition group-hover:shadow-lg group-hover:shadow-ink/10">
                    <PieceImage piece={piece} className="transition duration-500 group-hover:scale-[1.03]" />
                    {piece.demo && (
                      <span className="absolute start-3 top-3"><Badge tone="demo">{t.piece.demo}</Badge></span>
                    )}
                  </div>
                  <p className="mt-3 truncate font-semibold">{piece.name}</p>
                  <p className="text-sm text-muted">
                    {t.category[piece.category]} · {piece.occasions.map((o) => t.occasion[o]).join(', ')}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-14 flex justify-end">
            <Link to="/consider" className="btn-dark">{t.closet.next} <Arrow /></Link>
          </div>
        </>
      )}

      <Sheet open={editing !== null} onClose={close} title={editing === 'new' ? t.piece.addTitle : t.piece.editTitle}>
        <PieceForm<Piece>
          key={editing === 'new' ? 'new' : editing?.id}
          initial={editing && editing !== 'new' ? editing : undefined}
          onCancel={close}
          onSave={(piece) => {
            savePiece(piece)
            close()
          }}
          onDelete={
            editing && editing !== 'new'
              ? () => {
                  removePiece(editing.id)
                  close()
                }
              : undefined
          }
        />
      </Sheet>
    </>
  )
}

export function Loading() {
  return (
    <div className="flex items-center gap-3 py-24 text-muted" role="status">
      <Spinner /> {t.states.loading}
    </div>
  )
}

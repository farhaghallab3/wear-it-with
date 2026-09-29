import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GarmentArt } from '../components/GarmentArt'
import { PieceForm } from '../components/PieceForm'
import { PieceImage } from '../components/PieceImage'
import { Arrow, Badge, EmptyState, Notice, PageHeader, Sheet } from '../components/ui'
import { money, t } from '../i18n/en'
import { MAX_CANDIDATES, useStore } from '../lib/store'
import type { Candidate } from '../lib/types'
import { Loading } from './Closet'

export function Consider() {
  const { ready, closet, candidates, activeCandidate, saveCandidate, removeCandidate, setActiveCandidate } = useStore()
  const [editing, setEditing] = useState<Candidate | 'new' | null>(null)
  const navigate = useNavigate()

  if (!ready) return <Loading />
  const close = () => setEditing(null)

  return (
    <>
      <PageHeader eyebrow={`02 · ${t.app.nav.consider}`} title={t.consider.title}>
        {t.consider.subtitle}
      </PageHeader>

      {closet.length === 0 && (
        <div className="mb-8">
          <Notice>
            {t.consider.needsCloset} <Link to="/closet" className="font-semibold underline">{t.app.nav.closet}</Link>
          </Notice>
        </div>
      )}

      {candidates.length === 0 ? (
        <EmptyState title={t.consider.empty} body={t.consider.emptyBody} art={<GarmentArt kind="coat" color="camel" />}>
          <button className="btn-primary" onClick={() => setEditing('new')}>{t.consider.add}</button>
        </EmptyState>
      ) : (
        <>
          <ul className="grid gap-5 md:grid-cols-2">
            {candidates.map((c) => {
              const active = c.id === activeCandidate?.id
              return (
                <li key={c.id} className={`card flex gap-5 p-4 sm:p-5 ${active ? 'ring-2 ring-plum' : ''}`}>
                  <div className="relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-2xl bg-paper sm:w-40">
                    <PieceImage piece={c} />
                    {c.demo && <span className="absolute start-2 top-2"><Badge tone="demo">{t.piece.demo}</Badge></span>}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t.category[c.category]}</p>
                    <h2 className="mt-1 text-2xl leading-tight">{c.name}</h2>
                    <p className="mt-2 font-display text-3xl">{money(c.price)}</p>
                    {c.budget !== undefined && (
                      <p className="text-sm text-muted">{t.compare.budget}: {money(c.budget)}</p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
                      {active ? (
                        <Badge tone="plum">{t.consider.active}</Badge>
                      ) : (
                        <button className="btn-link" onClick={() => setActiveCandidate(c.id)}>{t.consider.select}</button>
                      )}
                      <button className="btn-link text-ink" onClick={() => setEditing(c)}>{t.piece.editTitle}</button>
                      <button className="btn-link text-rust" onClick={() => window.confirm(t.piece.confirmDelete) && removeCandidate(c.id)}>
                        {t.consider.remove}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
            {candidates.length < MAX_CANDIDATES && (
              <li>
                <button
                  onClick={() => setEditing('new')}
                  className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line text-muted transition hover:border-plum hover:text-plum"
                >
                  <span className="text-4xl font-light">+</span>
                  <span className="text-sm font-semibold">{t.consider.addAnother}</span>
                </button>
              </li>
            )}
          </ul>
          {candidates.length >= MAX_CANDIDATES && <p className="mt-4 text-sm text-muted">{t.consider.limit}</p>}

          <div className="mt-14 flex flex-wrap justify-end gap-3">
            {candidates.length === MAX_CANDIDATES && (
              <Link to="/compare" className="btn-ghost">{t.looks.compare}</Link>
            )}
            <button className="btn-dark" onClick={() => navigate('/looks')} disabled={!activeCandidate}>
              {t.consider.seeLooks} <Arrow />
            </button>
          </div>
        </>
      )}

      <Sheet open={editing !== null} onClose={close} title={editing === 'new' ? t.consider.add : t.piece.editTitle}>
        <PieceForm<Candidate>
          key={editing === 'new' ? 'new' : editing?.id}
          withPrice
          initial={editing && editing !== 'new' ? editing : undefined}
          onCancel={close}
          onSave={(candidate) => {
            saveCandidate(candidate)
            close()
          }}
        />
      </Sheet>
    </>
  )
}

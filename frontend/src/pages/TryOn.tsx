import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { GarmentArt } from '../components/GarmentArt'
import { OutfitBoard } from '../components/OutfitBoard'
import { PieceImage } from '../components/PieceImage'
import { Badge, EmptyState, Notice, PageHeader, Spinner } from '../components/ui'
import { t } from '../i18n/en'
import { ApiError, api, type TryOn as TryOnTask, type TryOnConfig } from '../lib/api'
import { ACCEPTED_IMAGES, fitForTryOn, shrinkImage, tryOnImageProblem, useObjectUrl } from '../lib/image'
import { evaluate } from '../lib/rules'
import { useStore } from '../lib/store'
import type { Category, Piece } from '../lib/types'
import { Loading } from './Closet'

/**
 * Our categories → YouCam Clothes V4 `garment_category`. One category per request, so a full look
 * is layered: each result becomes the base photo for the next piece. Shoes are not in the MVP.
 * Docs: lower-body references should show the garment being worn, not a flat product photo.
 */
const YOUCAM_CATEGORY: Partial<Record<Category, string>> = {
  bottom: 'lower_body', top: 'upper_body', outerwear: 'outer', dress: 'full_body',
}
const LAYER_ORDER: Category[] = ['bottom', 'dress', 'top', 'outerwear']
const POLL_MS = 10_000
const POLL_DEADLINE_MS = 5 * 60_000

/** Progress through a chain of layers; a single-piece try-on is a chain of one. */
interface Step {
  piece: Piece
  queue: Piece[]
  step: number
  total: number
}

type Phase =
  | { kind: 'idle' }
  | ({ kind: 'uploading' } & Step)
  | ({ kind: 'running'; task: TryOnTask; startedAt: number } & Step)
  | { kind: 'success'; task: TryOnTask; image: Blob }
  | { kind: 'failed'; message: string; hint?: string; code?: string }

export function TryOn() {
  const { ready, closet, activeCandidate } = useStore()
  const [params, setParams] = useSearchParams()
  const [config, setConfig] = useState<TryOnConfig>()
  const [configError, setConfigError] = useState<string>()
  const [garmentProblem, setGarmentProblem] = useState<string | null>()
  const [garment, setGarment] = useState<Blob>()
  const [person, setPerson] = useState<Blob>()
  /** The untouched photo the user picked; `person` becomes the latest result when layering. */
  const [original, setOriginal] = useState<Blob>()
  const [layers, setLayers] = useState<Piece[]>([])
  const [selectedId, setSelectedId] = useState<string>()
  const [personProblem, setPersonProblem] = useState<string>()
  const [consent, setConsent] = useState(false)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const personUrl = useObjectUrl(person)
  const originalUrl = useObjectUrl(original)
  const resultUrl = useObjectUrl(phase.kind === 'success' ? phase.image : undefined)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => void (mounted.current = false)
  }, [])

  const loadConfig = useCallback(() => {
    api.config().then(setConfig).catch((e: ApiError) => setConfigError(e.code === 'offline' ? t.tryOn.serverOffline : e.message))
  }, [])
  useEffect(loadConfig, [loadConfig])

  const evaluation = useMemo(() => (activeCandidate ? evaluate(activeCandidate, closet) : undefined), [activeCandidate, closet])
  const lookId = params.get('look')
  const look = evaluation?.outfits.find((o) => o.id === lookId) ?? evaluation?.outfits[0]

  // Pieces you can put on: the chosen look's pieces, bottom-up; otherwise just the new piece.
  const options = useMemo(() => {
    const pieces = look?.pieces ?? (activeCandidate ? [activeCandidate] : [])
    return pieces
      .filter((p) => p.category !== 'shoes')
      .sort((a, b) => LAYER_ORDER.indexOf(a.category) - LAYER_ORDER.indexOf(b.category))
  }, [look, activeCandidate])
  const selected = options.find((p) => p.id === selectedId) ?? options.find((p) => p.id === activeCandidate?.id) ?? options[0]
  const tryable = options.filter((p) => p.image && YOUCAM_CATEGORY[p.category])
  const youcamCategory = selected ? YOUCAM_CATEGORY[selected.category] : undefined

  useEffect(() => {
    setGarment(undefined)
    setGarmentProblem(undefined)
    if (!selected?.image) return
    fitForTryOn(selected.image)
      .then((fitted) => {
        setGarment(fitted ?? undefined)
        setGarmentProblem(fitted ? null : t.tryOn.garmentProblem)
      })
      .catch(() => setGarmentProblem(t.tryOn.photoProblem.unreadable))
  }, [selected?.image])

  // Poll our server, which polls YouCam. Never re-creates a task on its own.
  useEffect(() => {
    if (phase.kind !== 'running') return
    const timer = setTimeout(async () => {
      if (Date.now() - phase.startedAt > POLL_DEADLINE_MS) {
        setPhase({ kind: 'failed', code: 'timeout', message: 'This is taking longer than usual. The preview may still finish.' })
        return
      }
      try {
        const task = await api.get(phase.task.id)
        if (!mounted.current) return
        if (task.state === 'success') {
          const image = await api.image(task.id)
          if (!mounted.current) return
          setLayers((prev) => [...prev, phase.piece])
          if (phase.queue.length) {
            // Next layer goes on top of this result.
            const base = await shrinkImage(image, 2048)
            setPerson(base)
            start(phase.queue[0], base, phase.queue.slice(1), phase.step + 1, phase.total)
          } else {
            setPhase({ kind: 'success', task, image })
          }
        } else if (task.state === 'error') {
          setPhase({ kind: 'failed', code: task.error?.code, message: task.error?.message ?? '', hint: task.error?.hint })
        } else {
          setPhase({ ...phase, task })
        }
      } catch (e) {
        const error = e as ApiError
        if (error.code === 'offline') setPhase({ ...phase }) // transient: keep polling
        else setPhase({ kind: 'failed', code: error.code, message: error.message })
      }
    }, POLL_MS)
    return () => clearTimeout(timer)
  }, [phase])

  async function pickPerson(file?: File) {
    if (!file) return
    setPersonProblem(undefined)
    setPhase({ kind: 'idle' })
    try {
      // Re-encode in memory: fixes orientation and drops EXIF (e.g. location) before upload.
      const blob = await shrinkImage(file, 2048)
      const problem = await tryOnImageProblem(blob)
      setLayers([])
      if (problem) {
        setPerson(undefined)
        setOriginal(undefined)
        setPersonProblem(t.tryOn.photoProblem[problem])
      } else {
        setPerson(blob)
        setOriginal(blob)
      }
    } catch {
      setPersonProblem(t.tryOn.photoProblem.unreadable)
    }
  }

  /** Use the current result as the base photo, then pick the next piece to put on. */
  async function layerOnResult() {
    if (phase.kind !== 'success') return
    try {
      setPerson(await shrinkImage(phase.image, 2048))
      setPhase({ kind: 'idle' })
      const next = options.find((p) => !layers.some((l) => l.id === p.id) && p.image && YOUCAM_CATEGORY[p.category])
      if (next) setSelectedId(next.id)
    } catch {
      setPersonProblem(t.tryOn.photoProblem.unreadable)
    }
  }

  /** Create one real YouCam task for `piece` on `base`; `queue` continues after it succeeds. */
  async function start(piece: Piece, base: Blob, queue: Piece[], step: number, total: number) {
    const category = YOUCAM_CATEGORY[piece.category]
    const fitted = piece.image ? await fitForTryOn(piece.image).catch(() => null) : null
    if (!category || !fitted) {
      setPhase({ kind: 'failed', message: `${piece.name}: ${t.tryOn.garmentProblem}` })
      return
    }
    const progress = { piece, queue, step, total }
    setPhase({ kind: 'uploading', ...progress })
    const form = new FormData()
    form.append('person', base, 'person.jpg')
    form.append('garment', fitted, 'garment.jpg')
    form.append('category', category)
    form.append('consent', 'true')
    try {
      const task = await api.create(form)
      setPhase({ kind: 'running', task, startedAt: Date.now(), ...progress })
    } catch (e) {
      const error = e as ApiError
      setPhase({ kind: 'failed', code: error.code, message: error.code === 'offline' ? t.tryOn.serverOffline : error.message })
    } finally {
      loadConfig()
    }
  }

  function generate() {
    if (!selected || !garment || !person || !consent) return
    start(selected, person, [], 1, 1)
  }

  /** Put on every piece of the look that has a real photo, bottom-up, starting from the original photo. */
  function tryFullLook() {
    const base = original ?? person
    if (!base || !consent || tryable.length === 0) return
    setLayers([])
    setPerson(base)
    start(tryable[0], base, tryable.slice(1), 1, tryable.length)
  }

  async function forget() {
    if (phase.kind === 'success') await api.forget(phase.task.id).catch(() => undefined)
    setPhase({ kind: 'idle' })
    setPerson(original)
    setLayers([])
  }

  if (!ready) return <Loading />

  if (!activeCandidate) {
    return (
      <>
        <PageHeader eyebrow={`04 · ${t.app.nav.tryOn}`} title={t.tryOn.title} />
        <EmptyState title={t.looks.noCandidate} body={t.looks.noCandidateBody} art={<GarmentArt kind="dress" color="burgundy" />}>
          <Link to="/consider" className="btn-primary">{t.consider.add}</Link>
        </EmptyState>
      </>
    )
  }

  const busy = phase.kind === 'uploading' || phase.kind === 'running'
  const blocker = configError
    ? configError
    : !selected || !youcamCategory
        ? t.tryOn.unsupported(t.category[selected?.category ?? activeCandidate.category])
        : !selected.image
          ? t.tryOn.noPhoto
          : garmentProblem
  const canGenerate = Boolean(config?.tryon_enabled && !blocker && garment && person && consent && !busy && config.session_remaining > 0)
  const canFullLook = Boolean(
    config?.tryon_enabled && !configError && person && consent && !busy && tryable.length > 1 && config.session_remaining >= tryable.length,
  )

  return (
    <>
      <PageHeader eyebrow={`04 · ${t.app.nav.tryOn}`} title={t.tryOn.title}>
        {t.tryOn.subtitle}
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        {/* Stage: the photo of you, then the real result */}
        <section aria-label={t.tryOn.personPhoto} aria-live="polite" className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative aspect-[3/4] overflow-hidden rounded-[2rem] bg-ivory">
            {phase.kind === 'success' && resultUrl ? (
              <>
                <img src={resultUrl} alt={t.tryOn.resultAlt(layers.map((p) => p.name))} className="size-full object-cover" />
                <div className="absolute start-4 top-4"><Badge tone="plum">{t.tryOn.resultLabel}</Badge></div>
                {originalUrl && (
                  <img src={originalUrl} alt="Your original photo" className="absolute bottom-4 end-4 aspect-[3/4] w-20 rounded-xl border-2 border-paper object-cover shadow-lg sm:w-28" />
                )}
              </>
            ) : personUrl ? (
              <>
                <img src={personUrl} alt="Your photo" className={`size-full object-cover transition ${busy ? 'scale-[1.02] blur-[2px] brightness-90' : ''}`} />
                {busy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/35 p-6 text-center text-paper">
                    <Spinner className="size-8" />
                    <p className="font-display text-2xl">{phase.kind === 'uploading' ? t.tryOn.uploading : t.tryOn.generating}</p>
                    {(phase.kind === 'uploading' || phase.kind === 'running') && (
                      <p className="text-sm font-semibold">{t.tryOn.progress(phase.step, phase.total, phase.piece.name)}</p>
                    )}
                    {phase.kind === 'running' && <p className="max-w-xs text-sm opacity-90">{t.tryOn.generatingBody}</p>}
                  </div>
                )}
              </>
            ) : (
              <label className="flex size-full cursor-pointer flex-col items-center justify-center gap-4 p-8 text-center ring-plum has-[:focus-visible]:ring-2">
                <svg viewBox="0 0 64 64" className="size-16 text-plum/60" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="32" cy="20" r="9" />
                  <path d="M14 56c2-12 9-19 18-19s16 7 18 19" strokeLinecap="round" />
                </svg>
                <span className="btn-primary pointer-events-none">{t.tryOn.choosePerson}</span>
                <span className="max-w-xs text-sm text-muted">{t.tryOn.personHint}</span>
                <input type="file" accept={ACCEPTED_IMAGES} className="sr-only" onChange={(e) => pickPerson(e.target.files?.[0])} />
              </label>
            )}
          </div>

          {phase.kind === 'success' && resultUrl && (
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={resultUrl} download="wear-it-with-preview.png" className="btn-ghost">{t.tryOn.download}</a>
              <button className="btn-ghost" onClick={forget}>{t.tryOn.forget}</button>
              <button className="btn-dark" onClick={layerOnResult}>{t.tryOn.layer}</button>
            </div>
          )}
          {layers.length > 0 && phase.kind !== 'success' && !busy && (
            <p className="mt-4 text-xs text-muted">{t.tryOn.partial}</p>
          )}
          {layers.length > 0 && (
            <p className="mt-4 text-sm">
              <span className="font-semibold">{t.tryOn.wearing}</span> {layers.map((p) => p.name).join(' + ')}
            </p>
          )}
          {personUrl && !busy && (
            <label className="btn-link mt-4 cursor-pointer">
              {t.tryOn.replacePerson}
              <input type="file" accept={ACCEPTED_IMAGES} className="sr-only" onChange={(e) => pickPerson(e.target.files?.[0])} />
            </label>
          )}
          <p className="mt-3 text-xs text-muted">{t.tryOn.personMemory}</p>
          {personProblem && <div className="mt-3"><Notice tone="error">{personProblem}</Notice></div>}
        </section>

        {/* Controls and the honest outfit board */}
        <section className="space-y-6">
          <fieldset>
            <legend className="field-label">{t.tryOn.pickPiece}</legend>
            <div className="grid gap-2">
              {options.map((p) => {
                const reason = !YOUCAM_CATEGORY[p.category] ? t.tryOn.notSupportedShort : !p.image ? t.tryOn.needsPhotoShort : undefined
                const worn = layers.some((l) => l.id === p.id)
                return (
                  <label
                    key={p.id}
                    className={`card flex items-center gap-4 p-3 ring-plum has-[:checked]:ring-2 ${reason ? 'opacity-55' : 'cursor-pointer'}`}
                  >
                    <input
                      type="radio"
                      name="piece"
                      className="sr-only"
                      disabled={Boolean(reason) || busy}
                      checked={selected?.id === p.id}
                      onChange={() => setSelectedId(p.id)}
                    />
                    <div className="aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg bg-paper">
                      <PieceImage piece={p} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-xs text-muted">
                        {t.category[p.category]}
                        {p.id === activeCandidate.id && ` · ${t.looks.newPiece}`}
                        {reason && ` · ${reason}`}
                        {p.category === 'bottom' && !reason && ` · ${t.tryOn.bottomHint}`}
                      </p>
                    </div>
                    {worn && <Badge>{t.tryOn.on}</Badge>}
                  </label>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-muted">{t.tryOn.layerHint}</p>
          </fieldset>

          <Notice>{t.tryOn.honesty}</Notice>

          {config && !config.tryon_enabled && !configError && (
            <Notice tone="error"><strong>{t.tryOn.notConfigured}.</strong> {t.tryOn.notConfiguredBody}</Notice>
          )}
          {blocker && <Notice tone="error">{blocker}</Notice>}

          {phase.kind === 'failed' && (
            <Notice tone="error">
              {phase.message}
              {phase.hint && <span className="mt-1 block">{phase.hint}</span>}
              {phase.code && <span className="mt-1 block text-xs opacity-75">Code: {phase.code}</span>}
            </Notice>
          )}

          <label className="flex cursor-pointer gap-3 rounded-2xl border border-line p-4 text-sm leading-relaxed has-[:checked]:border-plum">
            <input type="checkbox" className="mt-1 size-4 shrink-0 accent-plum" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              {t.tryOn.consent}{' '}
              <a className="underline" href="https://www.perfectcorp.com/perfectbeauty/youcam/privacy-policy-api" target="_blank" rel="noreferrer">{t.tryOn.privacyLink}</a>
              {' · '}
              <a className="underline" href="https://docs.perfectcorp.com/develop/file_retention_period" target="_blank" rel="noreferrer">{t.tryOn.retentionLink}</a>
            </span>
          </label>

          <div>
            {tryable.length > 1 && (
              <button className="btn-primary mb-3 w-full py-4 text-base" disabled={!canFullLook} onClick={tryFullLook}>
                {busy ? <Spinner /> : null}
                {t.tryOn.fullLook(tryable.length)}
              </button>
            )}
            <button
              className={`${tryable.length > 1 ? 'btn-ghost' : 'btn-primary'} w-full py-4 text-base`}
              disabled={!canGenerate}
              onClick={generate}
            >
              {busy && tryable.length <= 1 ? <Spinner /> : null}
              {busy && tryable.length <= 1 ? t.tryOn.generating : t.tryOn.generateOne(selected?.name ?? '')}
            </button>
            {config?.tryon_enabled && config.session_remaining < Math.max(1, tryable.length) && (
              <div className="mt-3"><Notice>{t.tryOn.limitReached}</Notice></div>
            )}
          </div>

          <p className="text-xs leading-relaxed text-muted">{t.tryOn.disclaimer}</p>

          {look && evaluation && (
            <div className="border-t border-line pt-6">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-2xl">{t.tryOn.board}</h2>
                {evaluation.outfits.length > 1 && (
                  <select
                    aria-label={t.tryOn.pickLook}
                    className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm"
                    value={look.id}
                    onChange={(e) => setParams({ look: e.target.value }, { replace: true })}
                  >
                    {evaluation.outfits.map((o, i) => <option key={o.id} value={o.id}>{t.looks.look(i + 1)}</option>)}
                  </select>
                )}
              </div>
              <OutfitBoard pieces={look.pieces} highlightId={activeCandidate.id} compact />
            </div>
          )}
        </section>
      </div>
    </>
  )
}

import { useEffect, useRef, type ReactNode } from 'react'

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 max-w-2xl sm:mb-12">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="text-4xl leading-[1.05] sm:text-6xl">{title}</h1>
      {children && <div className="mt-4 text-base text-muted sm:text-lg">{children}</div>}
    </header>
  )
}

export function EmptyState({ title, body, children, art }: { title: string; body: string; children?: ReactNode; art?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center sm:py-20">
      {art && <div className="mb-6 w-28 opacity-80">{art}</div>}
      <h2 className="text-3xl">{title}</h2>
      <p className="mt-3 max-w-md text-muted">{body}</p>
      {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const styles = {
    info: 'bg-plum-soft text-plum-deep',
    error: 'bg-rust-soft text-rust',
    success: 'bg-sage-soft text-sage',
  }[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${styles}`}>
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'plum' | 'demo' }) {
  const styles = {
    neutral: 'bg-paper/90 text-ink',
    plum: 'bg-plum text-paper',
    demo: 'bg-ink/80 text-paper',
  }[tone]
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${styles}`}>{children}</span>
}

/** Native <dialog>: focus trapping, Escape to close, and top-layer rendering for free. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-paper p-0 text-ink shadow-2xl
        sm:m-auto sm:max-w-2xl sm:rounded-3xl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-6 py-4 backdrop-blur">
        <h2 className="text-2xl">{title}</h2>
        <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-ink/5" aria-label="Close">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-6">{open && children}</div>
    </dialog>
  )
}

export function Arrow({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} rtl:-scale-x-100`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

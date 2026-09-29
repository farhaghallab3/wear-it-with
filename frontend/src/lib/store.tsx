import { get, set } from 'idb-keyval'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEMO_CANDIDATES, DEMO_CLOSET } from './demo'
import type { Candidate, Piece } from './types'

/** Closet data lives only in this browser's IndexedDB. Person photos are never stored here. */
const KEY = 'wiw.v1'
export const MAX_CANDIDATES = 2
export const MAX_CLOSET = 40

interface Saved {
  closet: Piece[]
  candidates: Candidate[]
  activeCandidateId?: string
}

interface Store extends Saved {
  ready: boolean
  storageError: boolean
  activeCandidate?: Candidate
  savePiece: (piece: Piece) => void
  removePiece: (id: string) => void
  saveCandidate: (candidate: Candidate) => void
  removeCandidate: (id: string) => void
  setActiveCandidate: (id: string) => void
  loadDemo: () => void
  clearDemo: () => void
}

const StoreContext = createContext<Store | null>(null)

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Saved>({ closet: [], candidates: [] })
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)

  useEffect(() => {
    get<Saved>(KEY)
      .then((saved) => saved && setData(saved))
      .catch(() => setStorageError(true))
      .finally(() => setReady(true))
  }, [])

  const update = useCallback((fn: (d: Saved) => Saved) => {
    setData((prev) => {
      const next = fn(prev)
      set(KEY, next).catch(() => setStorageError(true))
      return next
    })
  }, [])

  const store = useMemo<Store>(() => {
    const activeCandidate = data.candidates.find((c) => c.id === data.activeCandidateId) ?? data.candidates[0]
    return {
      ...data,
      ready,
      storageError,
      activeCandidate,
      savePiece: (piece) => update((d) => ({ ...d, closet: upsert(d.closet, piece) })),
      removePiece: (id) => update((d) => ({ ...d, closet: d.closet.filter((p) => p.id !== id) })),
      saveCandidate: (candidate) =>
        update((d) => ({ ...d, candidates: upsert(d.candidates, candidate).slice(-MAX_CANDIDATES), activeCandidateId: candidate.id })),
      removeCandidate: (id) =>
        update((d) => ({ ...d, candidates: d.candidates.filter((c) => c.id !== id), activeCandidateId: undefined })),
      setActiveCandidate: (id) => update((d) => ({ ...d, activeCandidateId: id })),
      loadDemo: () =>
        update((d) => ({
          closet: [...DEMO_CLOSET, ...d.closet.filter((p) => !p.demo)],
          candidates: d.candidates.some((c) => !c.demo) ? d.candidates : DEMO_CANDIDATES,
          activeCandidateId: d.candidates.some((c) => !c.demo) ? d.activeCandidateId : DEMO_CANDIDATES[0].id,
        })),
      clearDemo: () =>
        update((d) => ({
          closet: d.closet.filter((p) => !p.demo),
          candidates: d.candidates.filter((c) => !c.demo),
          activeCandidateId: undefined,
        })),
    }
  }, [data, ready, storageError, update])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store
}

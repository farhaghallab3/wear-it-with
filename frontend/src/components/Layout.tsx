import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { t } from '../i18n/en'
import { useStore } from '../lib/store'
import { Notice } from './ui'

const NAV = [
  { to: '/closet', label: t.app.nav.closet, step: 1 },
  { to: '/consider', label: t.app.nav.consider, step: 2 },
  { to: '/looks', label: t.app.nav.looks, step: 3 },
  { to: '/try-on', label: t.app.nav.tryOn, step: 4 },
]

export function Layout() {
  const { storageError } = useStore()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        {t.app.skip}
      </a>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-4">
          <NavLink to="/" className="font-display text-2xl italic tracking-tight">
            {t.app.name}
          </NavLink>
          <nav aria-label="Main" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ol className="flex gap-1 whitespace-nowrap">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
                        isActive ? 'bg-ink text-paper' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                      }`
                    }
                  >
                    <span className="text-[11px] opacity-60">{item.step}</span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </header>
      {storageError && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-8">
          <Notice tone="error">{t.states.storageError}</Notice>
        </div>
      )}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-8 sm:px-8 sm:pt-14">
        <Outlet />
      </main>
      <footer className="border-t border-line/70 py-8 text-center text-xs text-muted">
        <p className="px-4">{t.home.privacy}</p>
        <p className="mt-2 px-4">Virtual try-on powered by YouCam API (Perfect Corp.). Previews are approximations.</p>
      </footer>
    </div>
  )
}

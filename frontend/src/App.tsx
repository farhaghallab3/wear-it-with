import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { StoreProvider } from './lib/store'
import { Closet } from './pages/Closet'
import { Compare } from './pages/Compare'
import { Consider } from './pages/Consider'
import { Home } from './pages/Home'
import { Looks } from './pages/Looks'
import { TryOn } from './pages/TryOn'

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="closet" element={<Closet />} />
            <Route path="consider" element={<Consider />} />
            <Route path="looks" element={<Looks />} />
            <Route path="compare" element={<Compare />} />
            <Route path="try-on" element={<TryOn />} />
            <Route path="*" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}

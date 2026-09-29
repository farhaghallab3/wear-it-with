import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { locale } from './i18n/en'
import './index.css'

document.documentElement.lang = locale.lang
document.documentElement.dir = locale.dir

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

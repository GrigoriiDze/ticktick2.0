import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { syncStatusBar } from './platform/statusbar'
import { initAccent, initTheme } from './platform/theme'
import { App } from './ui/App'

initTheme()
initAccent()
syncStatusBar()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

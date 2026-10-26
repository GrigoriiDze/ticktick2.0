import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { syncStatusBar } from './platform/statusbar'
import { initAccent, initTheme } from './platform/theme'
import { App } from './ui/App'

initTheme()
initAccent()
syncStatusBar()

// Блокировка pinch-to-zoom жестов на мобильных устройствах (iOS + Android WebView)
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault()
  }
}, { passive: false })
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault()
  }
}, { passive: false })
document.addEventListener('gesturestart', (e) => e.preventDefault())
document.addEventListener('gesturechange', (e) => e.preventDefault())
document.addEventListener('gestureend', (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

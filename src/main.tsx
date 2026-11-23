import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

// Self-hosted fonts → they're bundled into the app, so they work offline from first install.
import '@fontsource/limelight/latin-400.css' // display: GHARANA wordmark, room titles
import '@fontsource/poiret-one/latin-400.css' // deco caps: labels, wing names
import '@fontsource/cormorant-garamond/latin-400.css' // body
import '@fontsource/cormorant-garamond/latin-600.css'
import '@fontsource/jetbrains-mono/latin-400.css' // numbers: clear l vs 1 vs I
import '@fontsource/jetbrains-mono/latin-600.css'
import '@fontsource/noto-serif-devanagari/devanagari-400.css' // Sanskrit / Hindi
import '@fontsource/noto-sans-gurmukhi/gurmukhi-400.css' // Punjabi
import './index.css'
import './estate.css'

import { App } from './app/App'
import { requestPersistentStorage } from './db/db'

registerSW({ immediate: true })
requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

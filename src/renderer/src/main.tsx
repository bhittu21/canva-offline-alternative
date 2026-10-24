import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { loadFonts } from './fonts/fontList'
import { clearThumbCache } from './library/thumbnails'
import { uiStore } from './store/uiStore'
import { restorePanelWidths } from './shell/PanelResizer'
import './styles.css'

restorePanelWidths()

// Text is measured with the real fonts, so measure again once they are ready.
void loadFonts().finally(() => {
  clearThumbCache('')
  uiStore.setState({ fontEpoch: uiStore.getState().fontEpoch + 1 })
})

// Template checks for the test scripts; only loaded when a development build is started with the check switch.
if (new URLSearchParams(location.search).has('template-qa')) {
  void import('./library/gen/qa').then((qa) => {
    ;(window as unknown as { templateQa: typeof qa }).templateQa = qa
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { ensureFontsFor, loadFonts, onFontLoaded, refreshFonts } from './fonts/fontList'
import { editorStore } from './store/editorStore'
import { clearThumbCache } from './library/thumbnails'
import { uiStore } from './store/uiStore'
import { restorePanelWidths } from './shell/PanelResizer'
import './styles.css'

restorePanelWidths()

// Text is measured with the real fonts, so measure again once they are ready.
const fontsChanged = () => {
  clearThumbCache('')
  uiStore.setState({ fontEpoch: uiStore.getState().fontEpoch + 1 })
}
onFontLoaded(fontsChanged)
void loadFonts().finally(fontsChanged)

// Installed fonts and fonts the user added: listed now, loaded when a design uses them.
void refreshFonts().then(() => watchDocumentFonts())

function watchDocumentFonts(): void {
  let lastDoc: unknown = null
  const check = () => {
    const doc = editorStore.getState().history?.present
    if (!doc || doc === lastDoc) return
    lastDoc = doc
    ensureFontsFor(doc.pages.flatMap((p) => p.elements.flatMap((el) => ('fontFamily' in el ? [el.fontFamily] : []))))
  }
  check()
  editorStore.subscribe(check)
}

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

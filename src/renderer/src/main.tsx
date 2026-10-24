import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { loadFonts } from './fonts/fontList'
import { clearThumbCache } from './library/thumbnails'
import { uiStore } from './store/uiStore'
import './styles.css'

// Text is measured with the real fonts, so measure again once they are ready.
void loadFonts().finally(() => {
  clearThumbCache('')
  uiStore.setState({ fontEpoch: uiStore.getState().fontEpoch + 1 })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

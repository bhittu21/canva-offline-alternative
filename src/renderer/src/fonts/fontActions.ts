import { showError, showToast } from '@renderer/components/toast'
import { confirmAction } from '@renderer/store/uiStore'
import { refreshFonts } from './fontList'

/** Lets the user pick font files (.ttf, .otf, .woff, .woff2) and adds them to the app. Returns the families added. */
export async function addFontFiles(): Promise<string[]> {
  try {
    const result = await window.api.fonts.addDialog()
    if (!result) return []
    await refreshFonts()
    const families = [...new Set(result.added.map((f) => f.family))]
    if (families.length) showToast(families.length === 1 ? `Added the font “${families[0]}”` : `Added ${families.length} fonts: ${families.join(', ')}`)
    if (result.skipped.length) showToast(`Not added: ${result.skipped.map((s) => `${s.name} (${s.reason})`).join('; ')}`, 'error')
    return families
  } catch (error) {
    showError(error, 'The fonts could not be added.')
    return []
  }
}

/** Removes a font the user added. Designs that use it fall back to another font. */
export async function removeFontFamily(family: string): Promise<void> {
  const choice = await confirmAction({ title: `Remove “${family}”?`, message: 'Designs that use this font will show another font until you add it again.', confirmLabel: 'Remove', danger: true })
  if (choice !== 'confirm') return
  try {
    await window.api.fonts.remove(family)
    await refreshFonts()
    showToast(`Removed “${family}”`)
  } catch (error) {
    showError(error, 'The font could not be removed.')
  }
}

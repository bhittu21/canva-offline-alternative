# Design Studio

A Canva-inspired design studio for Windows that works completely offline. No
account, no login, no cloud: your designs are saved as files on your own PC.
Online extras (stock photos, AI, background removal) are optional, use your own
keys, and only run after you agree.

It is an independent project. It does not use Canva's code, templates, assets,
APIs or servers.

## What you can do

**Design**
- Start from 20 original templates (social posts, stories, presentations, video
  thumbnails, print, business, documents), a blank preset or a custom size
- Text: headings, subheadings, body text, 12 ready-made text combinations, 26 bundled
  open-licence fonts, outline, highlight and curved text
- Elements: shapes, lines and arrows, decorative shapes, badges and callouts,
  patterns, infographics, frames (photo masks, grids, mockups), charts (column, bar, line, area, pie, donut) and tables with
  editable data
- About 1,900 Lucide icons with search, categories, favourites and recents
- Photos: your own images (file, drag and drop, paste), an uploads library, and
  optional Unsplash or Pexels search with photographer credits
- Image tools: crop zoom and focus, flip, filter presets, brightness, contrast,
  saturation and more, borders, rounded corners and shape masks
- Brand kit: colours, fonts and logos, applied with one click

**Edit**
- Multiple pages, page thumbnails, duplicate and reorder pages
- Move, resize, rotate, snap to the page, other elements and guides; rulers
- Multi-select, group and ungroup, align and distribute, lock and hide
- Layers panel with thumbnails and drag-to-reorder
- Undo and redo for every change; right-click menu; command palette (Ctrl+K)
- Light and dark theme

**Save and share**
- Save as `.odesign` files; reopen from Recent designs or by double-clicking the file
- Autosave to the file once it has been saved; unsaved work is kept as a
  recovery copy and offered back after a crash
- Download PNG, JPG, WebP, SVG or PDF, any size, all pages or chosen pages
  (images of several pages come as a ZIP)
- Resize a design, or make a resized copy
- Save your own designs as templates and import template files

**AI Studio (optional)**
- Design assistant: describe a design and get an editable page, with a preview
  you can add, use to replace the page, or regenerate
- Writing assistant: write, rewrite in a tone, translate, suggest headlines
- Layout assistant: describe a change ("make the title bigger") and review the
  plan before applying it; offline quick fixes too
- Photo tools: generate an image (with a provider that supports it), remove
  backgrounds via remove.bg; magic eraser, upscale and expand are marked Planned
- Works with a free local model (Ollama, LM Studio) or your own key for Google
  Gemini, Groq, OpenRouter, OpenAI, Anthropic Claude or another
  OpenAI-compatible service

## Install on Windows (no developer tools needed)

1. Open the repository's **Actions** tab on GitHub, pick the latest green
   **CI** run on `main`, and download **Design-Studio-Setup** at the bottom.
2. Unzip it and run `Design-Studio-Setup-<version>.exe`.
3. Windows SmartScreen may say "Windows protected your PC" because the installer
   is not code-signed. Click **More info**, then **Run anyway**.
4. The installer is per-user (no administrator rights needed). It adds Start
   menu and desktop shortcuts and opens `.odesign` files with the app.

Uninstall from **Settings › Apps**. Your designs and settings are kept.

## Run from source (for development)

1. Install **Node.js LTS** from <https://nodejs.org> (the Windows installer, default options).
2. Install **Git** from <https://git-scm.com/download/win> (default options).
3. Open **Command Prompt** and run:

   ```
   cd %USERPROFILE%\Documents
   git clone https://github.com/bhittu21/design-studio.git
   cd design-studio
   npm install
   npm run dev
   ```

   The first `npm run dev` downloads Electron (about 100 MB), so it needs
   internet once. After that the app only goes online for features you turn on.

To update later: `git pull`, then `npm install`, then `npm run dev`.

To build the installer yourself: `npm run dist`. The `.exe` appears in `dist\`.

## Online features and privacy

Nothing is sent anywhere unless you set up a service and agree.

| Feature | Service | What is sent | Needs |
| --- | --- | --- | --- |
| Stock photos | Unsplash or Pexels | Your search words; photo downloads | Your free API key |
| AI assistants | The provider you choose | The text you type, the page size, brand colours; for layout help, a text summary of the page (no images) | A local model, or your own key |
| Generate an image | The provider you choose | Your prompt | A provider with an image model |
| Remove background | remove.bg | The selected image | Your remove.bg key |

- Keys are encrypted with Windows (Electron `safeStorage`) and stored in your
  user profile. The app window never reads a saved key back; requests are made
  by the app's background process.
- Keys and prompts are never written to design files, exports or logs. The AI
  activity list shows only time, provider, model, feature, duration and token
  counts, and is cleared when the app closes.
- Each online AI provider asks for consent once, naming the provider and its
  address. You can withdraw consent or remove a key in **Settings**.
- remove.bg's standalone API is moving to Canva on 1 December 2026.

## Known limitations

- PDF export is image-based: text in the PDF is not selectable. SVG export keeps
  shapes and text as vectors.
- AI output quality depends on the model. Small local models can produce plain
  layouts; invalid parts of an answer are left out and the app says so.
- Magic eraser, upscaling and image expansion are not built yet (labelled Planned).
- No video, animation, real-time collaboration or cloud sync.
- Designs use the bundled fonts; installed Windows fonts are not listed yet.
- The installer is not code-signed, so Windows shows a SmartScreen warning.

See [docs/ROADMAP.md](docs/ROADMAP.md) for what is done and what is planned.

## Keyboard shortcuts

Press **?** in the app for the full list, or **Ctrl+K** to search every command.

| Action | Shortcut |
| --- | --- |
| Undo / Redo | Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) |
| Save / Save as | Ctrl+S / Ctrl+Shift+S |
| Open / Export | Ctrl+O / Ctrl+E |
| Command palette | Ctrl+K |
| Duplicate / Delete | Ctrl+D / Delete |
| Copy / Paste | Ctrl+C / Ctrl+V |
| Group / Ungroup | Ctrl+G / Ctrl+Shift+G |
| Select all | Ctrl+A |
| Lock / Hide | Ctrl+Shift+L / Ctrl+Shift+H |
| Bring forward / to front | Ctrl+] / Ctrl+Shift+] |
| Send backward / to back | Ctrl+[ / Ctrl+Shift+[ |
| Move by 1 px / 10 px | Arrow keys / Shift+Arrow keys |
| Edit selected text | Enter (finish with Esc) |
| Zoom / Pan | Ctrl+mouse wheel / hold Space and drag |

## For developers

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app with live reload |
| `npm test` | Run unit tests |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Build the production bundle into `out/` |
| `npm run dist` | Build the Windows installer into `dist/` |

Stack: Electron, React, TypeScript, Vite (electron-vite), Konva, Zustand + Immer,
fflate, zod, pdf-lib, Lucide icons, Fontsource fonts. CI on GitHub's Windows
runners type-checks, tests, builds and produces the installer.

```
src/
  main/       Electron main process: window, menus, dialogs, safe file writes,
              encrypted keys, photo/AI/remove.bg requests, recovery storage
  preload/    the only bridge between the UI and the computer (window.api)
  shared/     document model, file format, presets, AI layout contract
  renderer/   React UI
    src/shell/      top bar, command palette, context menu, confirmations
    src/editor/     Konva canvas, elements, snapping, rulers, commands
    src/panels/     the left rail panels (design, elements, text, photos, ...)
    src/inspector/  the right-hand properties panel
    src/dialogs/    export, resize, settings, shortcuts, save template
    src/library/    templates, elements, text combos, thumbnails
    src/ai/         AI Studio state, consent, layout conversion
    src/render/     shared renderer used by the canvas, exports and thumbnails
    src/io/         open, save, autosave, recovery, image import
tests/unit/   model, history, file format, resize and AI layout tests
```

### Project file format

A `.odesign` file is a zip containing `manifest.json`, `document.json` and an
`assets/` folder with every image the design uses. Files are written to a
temporary file first and then renamed, so a crash while saving cannot damage an
existing design. Older single-page files are upgraded when opened.

### Licences of bundled content

- Icons: [Lucide](https://lucide.dev) (ISC licence)
- Fonts: [Fontsource](https://fontsource.org) packages of Google Fonts (SIL Open Font Licence)
- Templates, text combinations and element shapes: original to this project
- Stock photos are not bundled; they are fetched on demand under the Unsplash or Pexels licence

# Offline Design Editor

A Canva-inspired design editor for Windows that works completely offline. No
account, no login, no cloud: your designs are saved as files on your own PC.

## What works today

- Start a design from presets (Instagram, presentations, A4, posters...) or a custom size
- Add text (heading, subheading, body), shapes (square, circle, triangle, star, line) and images
- Import images from a file dialog, by dragging files onto the page, or by pasting with Ctrl+V
- Select, move, resize and rotate elements, with snapping guides to the page and other elements
- Edit text directly on the page; change font, size, colour, bold, italic, underline, alignment, spacing
- Undo and redo every change; layers panel to reorder, rename, hide and lock elements
- Save designs as `.odesign` files and reopen them, including from a Recent designs list
- Export to PNG, JPG, WebP, SVG and PDF at any size, with aspect-ratio presets, a ratio lock,
  fit-or-fill for different shapes (never stretched), quality and transparent backgrounds
- Resize a design (or create a resized copy) while scaling, centring or keeping its content

See [docs/ROADMAP.md](docs/ROADMAP.md) for everything that is planned, and what works offline.

## Run it on Windows (first time)

1. Install **Node.js LTS** from <https://nodejs.org> (the Windows installer, default options).
2. Install **Git** from <https://git-scm.com/download/win> (default options).
3. Open **Command Prompt** and run:

   ```
   cd %USERPROFILE%\Documents
   git clone https://github.com/bhittu21/offline-design-editor.git
   cd offline-design-editor
   npm install
   npm run dev
   ```

   The first `git clone` opens a GitHub sign-in window because the repository is private.
   The first `npm run dev` downloads Electron (about 100 MB), so it needs internet once.
   After that, the app itself never uses the network.

## Run it again later

```
cd %USERPROFILE%\Documents\offline-design-editor
git pull
npm install
npm run dev
```

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Undo / Redo | Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) |
| Save / Save as | Ctrl+S / Ctrl+Shift+S |
| Open | Ctrl+O |
| Import image | Ctrl+I |
| Export | Ctrl+E |
| Duplicate | Ctrl+D |
| Copy / Paste elements | Ctrl+C / Ctrl+V |
| Delete | Delete or Backspace |
| Move by 1 px / 10 px | Arrow keys / Shift+Arrow keys |
| Edit selected text | Enter (finish with Esc or Ctrl+Enter) |
| Bring forward / to front | Ctrl+] / Ctrl+Shift+] |
| Send backward / to back | Ctrl+[ / Ctrl+Shift+[ |
| Zoom | Ctrl+mouse wheel |
| Select several | Shift+click, or drag a box on empty space |

## For developers

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app with live reload |
| `npm test` | Run unit tests |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Build the production bundle into `out/` |

Stack: Electron, React, TypeScript, Vite (electron-vite), Konva, Zustand + Immer, fflate, zod.

```
src/
  main/       Electron main process: window, menus, dialogs, safe file writes
  preload/    the only bridge between the UI and the computer (window.api)
  shared/     document model, project file format, presets (used by both sides)
  renderer/   React UI
    src/store/    document store and undo/redo history
    src/editor/   Konva canvas, elements, transformer, snapping, text editor
    src/panels/   side panels: text, shapes, uploads, layers, properties
    src/io/       open, save and image import
tests/unit/   model, history and project file tests
```

### Project file format

A `.odesign` file is a zip containing `manifest.json`, `document.json` and an
`assets/` folder with every image the design uses. Files are written to a
temporary file first and then renamed, so a crash while saving cannot damage an
existing design.

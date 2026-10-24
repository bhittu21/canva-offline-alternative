# Roadmap

Offline Design Studio is an independent, Canva-inspired desktop design app for
Windows. It does not use Canva's code, templates, assets, APIs or servers, and
it never needs a Canva account.

The app is built in phases. Each phase ends with a working, tested app. This
file is the source of truth for what exists today and what is planned. A
feature is only marked **Done** once it works in the app and has been tested.

## Availability categories

Every feature belongs to one of three categories:

| Category | Meaning |
| --- | --- |
| **Offline** | Works entirely on your PC with no internet connection. All editing, saving and exporting is in this category. |
| **Optional online** | Needs an internet connection and, where applicable, your own API key. Always optional; the editor works fully without it. |
| **Future** | Needs more infrastructure or research. Documented here, built only when the foundations support it. |

The app never sends your designs or images to an online service unless you
turn that feature on, are told which provider receives the content, and agree.

## Status

Legend: **Done** · **In progress** · **Planned** · **Future**

### Phase 1: Reliable editor foundation (Offline)

| Feature | Status |
| --- | --- |
| Electron + React + TypeScript + Konva app shell | Done |
| Text, shapes and images; move, resize, rotate | Done |
| Snapping to page and other elements | Done |
| Layers: reorder, rename, hide, lock | Done |
| Undo/redo for every change | Done |
| Save, Save As, reopen, recent designs (`.odesign` files) | Done |
| Image import: dialog, drag and drop, paste | Done |
| Export dialog: PNG, JPEG, WebP, SVG (vector), PDF (image-based); size, aspect presets, ratio lock, fit or fill, quality, transparency, preview, progress | Done |
| Resize design: scale, centre or keep content, never stretched; or create a resized copy | Done |
| Windows development build (`npm run dev`) | Done |

### Phase 2: Professional design workflows (Offline)

| Feature | Status |
| --- | --- |
| Multiple pages per design (add, duplicate, reorder, delete) | Done |
| Autosave and crash recovery | Done |
| Grouping and ungrouping | Done |
| Rulers, guides, align/distribute between elements | Done |
| Resized copies with smarter layout (per-element repositioning beyond uniform scaling) | Planned |
| Vector PDF with selectable text and embedded fonts | Planned |
| Local template library (20 original templates) with categories, search and preview | Done |
| Save your own designs as templates; import template files | Done |
| Element library (shapes, lines, decorative, callouts, patterns, diagrams, mockups) and about 1,900 Lucide icons with search, categories, favourites, recents | Done |
| Bundled open-licence fonts (26) | Done |
| Use installed Windows fonts | Planned |
| Typography: text combinations, spacing, outline, highlight | Done |
| Bulleted and numbered lists | Planned |

### Phase 3: Photo, video and advanced design (Offline)

| Feature | Status |
| --- | --- |
| Crop (zoom and focus), flip, image resize | Done |
| Brightness, contrast, saturation, filter presets | Done |
| Image transparency, shape masks, frames, photo grids | Done |
| Text effects: shadow, outline, highlight | Done |
| Glow effect | Planned |
| Curved text | Done |
| Mockups (original artwork: phone, laptop, browser window, instant photo) | Done |
| Element animations | Planned |
| Video clips, trimming, timeline, transitions; audio with volume | Future |
| Video export (MP4/WebM), GIF export | Future |
| HEIC import (needs an extra decoder) | Future |

### Phase 4: Optional AI (Optional online, some Offline)

Stock photos from Unsplash and Pexels (your own free key, credits kept) are Done (online).

AI is never required. Each AI feature is separate and can be turned on or off
on its own. Provider options will be researched before each feature is built:
free tiers (with their real, verified limits), open-source models that run
locally, licences, hardware needs and privacy. Paid services are used only
with your own key and your explicit consent.

| Feature | Likely approach | Status |
| --- | --- | --- |
| AI settings: providers, models, API key, test connection, consent, activity log | Keys encrypted with Windows (safeStorage), never in project files or logs | Done |
| Background removal | Optional online via remove.bg (your own key, consent first). Local offline remover planned (remove.bg standalone API ends 1 Dec 2026) | Done (online) |
| Writing help: write, rewrite in a tone, translate, headlines | Local model or optional API | Done |
| Text-to-image generation | Optional API with an image model (OpenAI-compatible) | Done (online) |
| Prompt-to-design and layout edits by instruction, validated before use | Local model or optional API | Done |
| Magic eraser, upscaling, image expansion | Optional API; local where feasible | Planned |
| Speech transcription and captions | Local model | Future |
| Video and audio generation | Optional API | Future |

### Phase 5: Productivity and extensibility

| Feature | Category | Status |
| --- | --- | --- |
| Brand kit: logos, colours, fonts | Offline | Done |
| Folders, tags and search for designs | Offline | Planned |
| Bulk create designs from CSV/XLSX data | Offline | Planned |
| Import CSV/XLSX and place data in designs | Offline | Planned |
| Presentation mode and slide management | Offline | Planned |
| PDF import, view, annotate, sign, compress | Offline | Future |
| Plugin system for optional integrations (Slack, Google Photos, Teams...) | Optional online | Future |
| Real-time collaboration, comments, sharing | Needs a sync server | Future |

Collaboration across computers cannot work without networking. The first
releases are single-user and local only.

### Phase 6: Production readiness

| Feature | Status |
| --- | --- |
| Windows installer (.exe, per-user), file association for `.odesign`, built by CI | Done (built by CI; not code-signed) |
| Offline test pass (no network at all) | Planned |
| Performance and memory checks with large designs and images | Planned |
| Project integrity and recovery tests | Done (unit tests plus end-to-end save, reopen and crash recovery) |
| Security review of credentials and dependencies | In progress (keys checked absent from files and exports in tests) |
| User guide and list of known limitations | Done (README) |

## Rules the project follows

- No buttons that look like they work but do nothing. Unfinished features are hidden or clearly labelled.
- Content is never stretched by accident when resizing or exporting.
- Every bundled font, icon, template, image and model has its licence checked and recorded.
- API keys are never written into source code, the installer, project files, exports or logs.
- An AI feature is only described as supported once it is built and tested.

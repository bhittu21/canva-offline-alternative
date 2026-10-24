# Roadmap

Offline Design Editor is an independent, Canva-inspired desktop design app for
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
| Multiple pages per design | Planned |
| Autosave and crash recovery | Planned |
| Grouping and ungrouping | Planned |
| Rulers, guides, align/distribute between elements | Planned |
| Resized copies with smarter layout (per-element repositioning beyond uniform scaling) | Planned |
| Vector PDF with selectable text and embedded fonts | Planned |
| Local template library (original, bundled templates) with categories and preview | Planned |
| Save your own designs as templates; import template packs | Planned |
| Asset library: shapes, icons, stickers, illustrations with search, categories, favourites | Planned |
| Bundled open-licence fonts and use of installed Windows fonts | Planned |
| Typography: more text styles, lists, spacing | Planned |

### Phase 3: Photo, video and advanced design (Offline)

| Feature | Status |
| --- | --- |
| Crop, flip, image resize | Planned |
| Brightness, contrast, saturation, filters | Planned |
| Image transparency, masks, shape clipping, frames | Planned |
| Text effects: shadow, outline, highlight, glow | Planned |
| Curved text | Planned |
| Mockups (original or properly licensed artwork) | Planned |
| Element animations | Planned |
| Video clips, trimming, timeline, transitions; audio with volume | Future |
| Video export (MP4/WebM), GIF export | Future |
| HEIC import (needs an extra decoder) | Future |

### Phase 4: Optional AI (Optional online, some Offline)

AI is never required. Each AI feature is separate and can be turned on or off
on its own. Provider options will be researched before each feature is built:
free tiers (with their real, verified limits), open-source models that run
locally, licences, hardware needs and privacy. Paid services are used only
with your own key and your explicit consent.

| Feature | Likely approach | Status |
| --- | --- | --- |
| AI settings: provider, model, API key, test connection, per-feature switches | Keys stored with Windows credential protection, never in project files or logs | Planned |
| Background removal | Local model first; optional API | Planned |
| Writing help: generate, rewrite, summarise, proofread, translate | Local model or optional API | Planned |
| Text-to-image generation | Local model (needs a capable GPU) or optional API | Planned |
| Layout, palette and font suggestions; prompt-to-design | Optional API; local where feasible | Future |
| Object removal, image expansion, edit by instruction | Optional API; local where feasible | Future |
| Speech transcription and captions | Local model | Future |
| Video and audio generation | Optional API | Future |

### Phase 5: Productivity and extensibility

| Feature | Category | Status |
| --- | --- | --- |
| Brand kit: logos, colours, fonts, reusable styles | Offline | Planned |
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
| Windows installer (.exe), file association for `.odesign` | Planned |
| Offline test pass (no network at all) | Planned |
| Performance and memory checks with large designs and images | Planned |
| Project integrity and recovery tests | In progress (unit tests for the file format) |
| Security review of credentials and dependencies | Planned |
| User guide and list of known limitations | Planned |

## Rules the project follows

- No buttons that look like they work but do nothing. Unfinished features are hidden or clearly labelled.
- Content is never stretched by accident when resizing or exporting.
- Every bundled font, icon, template, image and model has its licence checked and recorded.
- API keys are never written into source code, the installer, project files, exports or logs.
- An AI feature is only described as supported once it is built and tested.

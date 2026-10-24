export interface CanvasPreset {
  id: string
  label: string
  group: string
  width: number
  height: number
}

/** Common design sizes, in pixels. Print sizes assume 300 DPI. */
export const canvasPresets: CanvasPreset[] = [
  { id: 'instagram-post', label: 'Instagram post', group: 'Social media', width: 1080, height: 1080 },
  { id: 'instagram-portrait', label: 'Instagram portrait', group: 'Social media', width: 1080, height: 1350 },
  { id: 'instagram-story', label: 'Story / Reel', group: 'Social media', width: 1080, height: 1920 },
  { id: 'facebook-post', label: 'Facebook post', group: 'Social media', width: 1200, height: 630 },
  { id: 'youtube-thumbnail', label: 'YouTube thumbnail', group: 'Social media', width: 1280, height: 720 },
  { id: 'presentation', label: 'Presentation 16:9', group: 'Presentations', width: 1920, height: 1080 },
  { id: 'presentation-4-3', label: 'Presentation 4:3', group: 'Presentations', width: 1024, height: 768 },
  { id: 'a4-portrait', label: 'A4 portrait', group: 'Print', width: 2480, height: 3508 },
  { id: 'a4-landscape', label: 'A4 landscape', group: 'Print', width: 3508, height: 2480 },
  { id: 'letter-portrait', label: 'US Letter', group: 'Print', width: 2550, height: 3300 },
  { id: 'poster', label: 'Poster 18x24 in', group: 'Print', width: 5400, height: 7200 },
  { id: 'business-card', label: 'Business card', group: 'Print', width: 1050, height: 600 }
]

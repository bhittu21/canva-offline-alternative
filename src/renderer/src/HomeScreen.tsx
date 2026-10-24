import { useEffect, useState } from 'react'
import type { RecentFile } from '@shared/ipc'
import { canvasPresets } from '@shared/presets'
import { Icon } from './components/Icon'
import { openDesignDialog, openDesignPath } from './io/projectIo'

const MAX_SIDE = 10000

export function HomeScreen({ onCreate }: { onCreate: (width: number, height: number, title?: string) => void }) {
  const [recent, setRecent] = useState<RecentFile[]>([])
  const [width, setWidth] = useState(1080)
  const [height, setHeight] = useState(1080)

  useEffect(() => {
    window.api.listRecentFiles().then(setRecent).catch(() => setRecent([]))
  }, [])

  const groups = [...new Set(canvasPresets.map((p) => p.group))]
  const validCustom = width >= 1 && height >= 1 && width <= MAX_SIDE && height <= MAX_SIDE

  return (
    <div className="home">
      <header className="home-header">
        <h1>Offline Design Editor</h1>
        <button className="button" onClick={() => void openDesignDialog()}>
          <Icon name="folder" size={18} /> Open design
        </button>
      </header>

      <section>
        <h2>Create a design</h2>
        {groups.map((group) => (
          <div key={group} className="preset-group">
            <h3>{group}</h3>
            <div className="preset-grid">
              {canvasPresets
                .filter((p) => p.group === group)
                .map((preset) => (
                  <button key={preset.id} className="preset" onClick={() => onCreate(preset.width, preset.height, preset.label)}>
                    <span className="preset-thumb">
                      <span
                        style={{
                          aspectRatio: `${preset.width} / ${preset.height}`,
                          [preset.width >= preset.height ? 'width' : 'height']: '100%'
                        }}
                      />
                    </span>
                    <span className="preset-label">{preset.label}</span>
                    <span className="preset-size">
                      {preset.width} × {preset.height} px
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}

        <form
          className="custom-size"
          onSubmit={(e) => {
            e.preventDefault()
            if (validCustom) onCreate(width, height, 'Custom design')
          }}
        >
          <h3>Custom size</h3>
          <label>
            Width
            <input type="number" min={1} max={MAX_SIDE} value={width} onChange={(e) => setWidth(Math.round(Number(e.target.value)))} />
          </label>
          <span>×</span>
          <label>
            Height
            <input type="number" min={1} max={MAX_SIDE} value={height} onChange={(e) => setHeight(Math.round(Number(e.target.value)))} />
          </label>
          <span className="muted">px</span>
          <button className="button primary" type="submit" disabled={!validCustom}>
            Create
          </button>
        </form>
      </section>

      <section>
        <h2>Recent designs</h2>
        {recent.length === 0 ? (
          <p className="muted">Designs you save will appear here.</p>
        ) : (
          <ul className="recent-list">
            {recent.map((file) => (
              <li key={file.path}>
                <button className="recent" onClick={() => void openDesignPath(file.path)} title={file.path}>
                  <span className="recent-title">{file.title}</span>
                  <span className="recent-path">{file.path}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

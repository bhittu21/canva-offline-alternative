import type { ReactNode } from 'react'
import type { DesignElement, TextElement } from '@shared/model'
import { withTextHeight } from '@renderer/render/text'
import { editor } from '@renderer/store/editorStore'

/** A titled block in the inspector. */
export function Section({ title, badge, action, children }: { title: ReactNode; badge?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="insp-section">
      <div className="insp-title">
        <span className="row" style={{ gap: 6 }}>
          {title}
          {badge}
        </span>
        {action}
      </div>
      {children}
    </section>
  )
}

/**
 * Updates one element. Changes with the same label in quick succession (a
 * slider being dragged, a number being typed) merge into one undo step.
 * Text keeps its box height in step with its content.
 */
export function updater<T extends DesignElement>(el: T) {
  return (patch: Partial<T>, label = 'Edit') => {
    const full = el.type === 'text' ? withTextHeight(el as TextElement, patch as Partial<TextElement>) : patch
    editor.updateElement(el.id, full as Partial<DesignElement>, label, `${el.id}:${label}`)
  }
}

export function ToggleButton(props: { on: boolean; title: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button className={`icon-btn${props.on ? ' active' : ''}`} aria-pressed={props.on} title={props.title} aria-label={props.title} data-tip={props.title} disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  )
}

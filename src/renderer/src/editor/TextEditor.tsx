import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TextElement } from '@shared/model'
import { editor } from '@renderer/store/editorStore'
import { withTextHeight } from './textMeasure'

interface Props {
  element: TextElement
  view: { zoom: number; x: number; y: number }
}

/**
 * Typing happens in a real text box placed exactly over the canvas text, so the
 * keyboard, cursor, selection and IME all behave like any other Windows text box.
 */
export function TextEditor({ element, view }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState(element.text)
  const done = useRef(false)

  useEffect(() => {
    const textarea = ref.current
    if (!textarea) return
    textarea.focus()
    textarea.select()
  }, [])

  useLayoutEffect(() => {
    const textarea = ref.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value, view.zoom])

  const finish = (commit: boolean) => {
    if (done.current) return
    done.current = true
    editor.setEditingText(null)
    if (!commit || value === element.text) return
    if (value.trim() === '') {
      // An emptied text box is removed, like in Canva.
      editor.changePage('Delete text', (page) => {
        page.elements = page.elements.filter((el) => el.id !== element.id)
      })
      return
    }
    editor.updateElement(element.id, withTextHeight(element, { text: value }), 'Edit text')
  }

  const italic = element.fontStyle.includes('italic')
  const bold = element.fontStyle.includes('bold')

  return (
    <textarea
      ref={ref}
      className="text-editor"
      value={value}
      spellCheck={false}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') finish(true)
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) finish(true)
      }}
      style={{
        left: view.x + element.x * view.zoom,
        top: view.y + element.y * view.zoom,
        width: element.width * view.zoom,
        transform: `rotate(${element.rotation}deg)`,
        fontFamily: `"${element.fontFamily}"`,
        textTransform: element.uppercase ? 'uppercase' : 'none',
        fontSize: element.fontSize * view.zoom,
        fontWeight: bold ? 'bold' : 'normal',
        fontStyle: italic ? 'italic' : 'normal',
        textDecoration: element.underline ? 'underline' : 'none',
        lineHeight: element.lineHeight,
        letterSpacing: element.letterSpacing * view.zoom,
        color: element.fill,
        textAlign: element.align,
        opacity: element.opacity
      }}
    />
  )
}

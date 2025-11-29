import React, { useRef, useEffect, useState, useCallback } from 'react'
import './RichTextEditor.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  className = ''
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const isComposing = useRef(false)

  // Only update content from props when editor is not focused and not empty initially
  useEffect(() => {
    if (!isFocused && editorRef.current && editorRef.current.innerHTML === '' && value) {
      editorRef.current.innerHTML = value
    }
  }, [value, isFocused])

  const updateContent = useCallback(() => {
    if (editorRef.current && !isComposing.current) {
      onChange(editorRef.current.innerHTML)
    }
  }, [onChange])

  const handleInput = useCallback(() => {
    updateContent()
  }, [updateContent])

  const handleCompositionStart = useCallback(() => {
    isComposing.current = true
  }, [])

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false
    updateContent()
  }, [updateContent])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement

    // Handle Tab navigation in tables
    if (e.key === 'Tab' && (target.tagName === 'TD' || target.tagName === 'TH')) {
      e.preventDefault()
      const table = target.closest('table')
      if (table) {
        const cells = Array.from(table.querySelectorAll('td, th')) as HTMLElement[]
        const currentIndex = cells.indexOf(target)
        const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1

        if (nextIndex >= 0 && nextIndex < cells.length) {
          cells[nextIndex].focus()
          // Set cursor at the end of the cell
          const range = document.createRange()
          const selection = window.getSelection()
          range.selectNodeContents(cells[nextIndex])
          range.collapse(false)
          selection?.removeAllRanges()
          selection?.addRange(range)
        }
      }
      return
    }

    // Handle Enter in table cells
    if (e.key === 'Enter' && (target.tagName === 'TD' || target.tagName === 'TH')) {
      e.preventDefault()
      document.execCommand('insertHTML', false, '<br>')
      return
    }

    // Regular Enter handling
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      document.execCommand('insertHTML', false, '<div><br></div>')
      return
    }
  }, [])

  const execCommand = useCallback((command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus()
      document.execCommand(command, false, value)
      updateContent()
    }
  }, [updateContent])

  const insertTable = useCallback(() => {
    if (editorRef.current) {
      const tableHTML = `
        <div><br></div>
        <table>
          <thead>
            <tr>
              <th contenteditable="true">Header 1</th>
              <th contenteditable="true">Header 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td contenteditable="true">Cell 1</td>
              <td contenteditable="true">Cell 2</td>
            </tr>
          </tbody>
        </table>
        <div><br></div>
      `
      editorRef.current.focus()
      document.execCommand('insertHTML', false, tableHTML)
      updateContent()

      // Focus on first cell
      setTimeout(() => {
        const firstCell = editorRef.current?.querySelector('th[contenteditable="true"]') as HTMLElement
        if (firstCell) {
          firstCell.focus()
          // Select all text in the cell
          const range = document.createRange()
          const selection = window.getSelection()
          range.selectNodeContents(firstCell)
          selection?.removeAllRanges()
          selection?.addRange(range)
        }
      }, 100)
    }
  }, [updateContent])

  const insertLink = useCallback(() => {
    const url = prompt('Nhập URL:')
    if (url && editorRef.current) {
      const selection = window.getSelection()
      const selectedText = selection?.toString() || 'Link text'
      const linkHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selectedText}</a>`
      editorRef.current.focus()
      document.execCommand('insertHTML', false, linkHTML)
      updateContent()
    }
  }, [updateContent])

  const insertList = useCallback(() => {
    execCommand('insertUnorderedList')
  }, [execCommand])

  const insertQuote = useCallback(() => {
    if (editorRef.current) {
      const selection = window.getSelection()
      const selectedText = selection?.toString() || 'Quote text'
      const quoteHTML = `<blockquote>${selectedText}</blockquote><div><br></div>`
      editorRef.current.focus()
      document.execCommand('insertHTML', false, quoteHTML)
      updateContent()
    }
  }, [updateContent])

  const addTableRow = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const cell = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? range.commonAncestorContainer as HTMLElement
        : range.commonAncestorContainer.parentElement

      const row = cell?.closest('tr')
      if (row) {
        const newRow = row.cloneNode(true) as HTMLTableRowElement
        // Clear content of new row cells
        const cells = newRow.querySelectorAll('td, th')
        cells.forEach(cell => {
          if (cell.tagName === 'TH') {
            // Convert headers to data cells for new rows
            const td = document.createElement('td')
            // Remove inline styles if any, let CSS handle it
            td.removeAttribute('style')
            td.setAttribute('contenteditable', 'true')
            td.textContent = 'New cell'
            cell.parentNode?.replaceChild(td, cell)
          } else {
            cell.textContent = 'New cell'
          }
        })
        row.parentNode?.insertBefore(newRow, row.nextSibling)
        updateContent()
      }
    }
  }, [updateContent])

  const removeImage = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const element = range.commonAncestorContainer

      let imgElement: HTMLElement | null = null
      if (element.nodeType === Node.ELEMENT_NODE) {
        imgElement = element as HTMLElement
      } else if (element.parentElement) {
        imgElement = element.parentElement
      }

      if (imgElement?.tagName === 'IMG') {
        imgElement.remove()
        updateContent()
      } else {
        const img = imgElement?.querySelector('img')
        if (img) {
          img.remove()
          updateContent()
        }
      }
    }
  }, [updateContent])

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      <div className="editor-toolbar">
        <button type="button" onClick={() => execCommand('bold')} title="Bold (Ctrl+B)" style={{ fontWeight: 'bold' }}>B</button>
        <button type="button" onClick={() => execCommand('italic')} title="Italic (Ctrl+I)" style={{ fontStyle: 'italic' }}>I</button>
        <button type="button" onClick={() => execCommand('underline')} title="Underline (Ctrl+U)" style={{ textDecoration: 'underline' }}>U</button>
        <button type="button" onClick={() => execCommand('strikeThrough')} title="Strikethrough" style={{ textDecoration: 'line-through' }}>S</button>

        <div className="separator" />

        <button type="button" onClick={() => execCommand('formatBlock', 'h1')} title="Heading 1" style={{ fontWeight: 'bold' }}>H1</button>
        <button type="button" onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2" style={{ fontWeight: 'bold' }}>H2</button>
        <button type="button" onClick={() => execCommand('formatBlock', 'h3')} title="Heading 3" style={{ fontWeight: 'bold' }}>H3</button>

        <div className="separator" />

        <button type="button" onClick={insertLink} title="Insert Link">🔗 Link</button>
        <button type="button" onClick={insertList} title="Bullet List">• List</button>
        <button type="button" onClick={insertQuote} title="Quote">❞ Quote</button>
        <button type="button" onClick={insertTable} title="Insert Table">⊞ Table</button>
        <button type="button" onClick={addTableRow} title="Add Row (click inside table first)">➕ Row</button>

        <div className="separator" />

        <button type="button" onClick={removeImage} className="delete-btn" title="Remove Selected Image">🗑️ Delete</button>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        className="editor-content"
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />
    </div>
  )
}

export default RichTextEditor

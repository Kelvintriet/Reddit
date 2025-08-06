import React, { useRef, useEffect, useState, useCallback } from 'react'

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
  const isUpdatingFromProps = useRef(false)

  const updateContent = useCallback(() => {
    if (editorRef.current && !isUpdatingFromProps.current) {
      const html = editorRef.current.innerHTML
      onChange(html)
    }
  }, [onChange])

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value && !isFocused) {
      isUpdatingFromProps.current = true
      editorRef.current.innerHTML = value
      isUpdatingFromProps.current = false
    }
  }, [value, isFocused])

  const handleInput = useCallback((e: React.FormEvent) => {
    e.preventDefault()
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
        <table style="border-collapse: collapse; width: 100%; margin: 10px 0; border: 1px solid #ddd;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 12px; background-color: #f5f5f5; font-weight: bold; text-align: left;" contenteditable="true">Header 1</th>
              <th style="border: 1px solid #ddd; padding: 12px; background-color: #f5f5f5; font-weight: bold; text-align: left;" contenteditable="true">Header 2</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: left;" contenteditable="true">Cell 1</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: left;" contenteditable="true">Cell 2</td>
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
      const quoteHTML = `<blockquote style="border-left: 4px solid #ddd; padding-left: 16px; margin: 16px 0; font-style: italic; color: #666;">${selectedText}</blockquote><div><br></div>`
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
            td.setAttribute('style', cell.getAttribute('style') || '')
            td.setAttribute('contenteditable', 'true')
            td.style.backgroundColor = 'white'
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
      <div className="editor-toolbar" style={{
        display: 'flex',
        gap: '8px',
        padding: '12px',
        borderBottom: '1px solid #ddd',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px 8px 0 0',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <button
          type="button"
          onClick={() => execCommand('bold')}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        
        <button
          type="button"
          onClick={() => execCommand('italic')}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            fontStyle: 'italic',
            cursor: 'pointer'
          }}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        
        <button
          type="button"
          onClick={() => execCommand('underline')}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
          title="Underline (Ctrl+U)"
        >
          U
        </button>
        
        <button
          type="button"
          onClick={() => execCommand('strikeThrough')}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            textDecoration: 'line-through',
            cursor: 'pointer'
          }}
          title="Strikethrough"
        >
          S
        </button>

        <div style={{ width: '1px', backgroundColor: '#ddd', height: '20px', margin: '0 4px' }} />

        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'h1')}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          title="Heading 1"
        >
          H1
        </button>
        
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'h2')}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          title="Heading 2"
        >
          H2
        </button>
        
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'h3')}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
          title="Heading 3"
        >
          H3
        </button>

        <div style={{ width: '1px', backgroundColor: '#ddd', height: '20px', margin: '0 4px' }} />

        <button
          type="button"
          onClick={insertLink}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
          title="Insert Link"
        >
          🔗 Link
        </button>
        
        <button
          type="button"
          onClick={insertList}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
          title="Bullet List"
        >
          • List
        </button>
        
        <button
          type="button"
          onClick={insertQuote}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
          title="Quote"
        >
          ❞ Quote
        </button>
        
        <button
          type="button"
          onClick={insertTable}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: 'white',
            cursor: 'pointer'
          }}
          title="Insert Table"
        >
          ⊞ Table
        </button>

        <button
          type="button"
          onClick={addTableRow}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: '#e7f3ff',
            cursor: 'pointer'
          }}
          title="Add Row (click inside table first)"
        >
          ➕ Row
        </button>

        <div style={{ width: '1px', backgroundColor: '#ddd', height: '20px', margin: '0 4px' }} />

        <button
          type="button"
          onClick={removeImage}
          style={{ 
            padding: '8px 12px', 
            border: '1px solid #ddd', 
            borderRadius: '6px', 
            backgroundColor: '#ff4444', 
            color: 'white',
            cursor: 'pointer'
          }}
          title="Remove Selected Image"
        >
          🗑️ Delete
        </button>
      </div>

      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          minHeight: '250px',
          padding: '20px',
          border: `2px solid ${isFocused ? '#007bff' : '#ddd'}`,
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          outline: 'none',
          backgroundColor: 'white',
          lineHeight: '1.6',
          fontSize: '16px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
        suppressContentEditableWarning={true}
        dangerouslySetInnerHTML={{ __html: value || '' }}
        data-placeholder={placeholder}
      />
      
      {/* CSS styles */}
      <style>{`
        .rich-text-editor [contenteditable]:empty::before {
          content: attr(data-placeholder);
          color: #999;
          font-style: italic;
          pointer-events: none;
        }
        
        .rich-text-editor [contenteditable] img {
          max-width: 100%;
          height: auto;
          cursor: pointer;
          border: 2px solid transparent;
          border-radius: 4px;
        }
        
        .rich-text-editor [contenteditable] img:hover {
          border: 2px solid #007bff;
        }
        
        .rich-text-editor [contenteditable] table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
          border: 1px solid #ddd;
        }
        
        .rich-text-editor [contenteditable] table th,
        .rich-text-editor [contenteditable] table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
          min-width: 120px;
          position: relative;
          vertical-align: top;
        }
        
        .rich-text-editor [contenteditable] table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        
        .rich-text-editor [contenteditable] table th:focus,
        .rich-text-editor [contenteditable] table td:focus {
          outline: 2px solid #007bff;
          background-color: #f0f8ff;
        }
        
        .rich-text-editor [contenteditable] blockquote {
          border-left: 4px solid #007bff;
          padding-left: 16px;
          margin: 16px 0;
          font-style: italic;
          color: #555;
          background-color: #f8f9fa;
          padding: 16px;
          border-radius: 4px;
        }
        
        .rich-text-editor [contenteditable] h1,
        .rich-text-editor [contenteditable] h2,
        .rich-text-editor [contenteditable] h3 {
          margin: 20px 0 10px 0;
          font-weight: bold;
          line-height: 1.3;
        }
        
        .rich-text-editor [contenteditable] h1 {
          font-size: 2em;
          border-bottom: 2px solid #eee;
          padding-bottom: 8px;
        }
        
        .rich-text-editor [contenteditable] h2 {
          font-size: 1.5em;
        }
        
        .rich-text-editor [contenteditable] h3 {
          font-size: 1.25em;
        }
        
        .rich-text-editor [contenteditable] ul,
        .rich-text-editor [contenteditable] ol {
          margin: 16px 0;
          padding-left: 30px;
        }
        
        .rich-text-editor [contenteditable] li {
          margin: 8px 0;
          line-height: 1.5;
        }
        
        .rich-text-editor [contenteditable] a {
          color: #007bff;
          text-decoration: underline;
        }
        
        .rich-text-editor [contenteditable] a:hover {
          color: #0056b3;
        }
      `}</style>
    </div>
  )
}

export default RichTextEditor 
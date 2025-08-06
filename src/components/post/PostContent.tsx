import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface PostContentProps {
  content: string
  contentType?: 'markdown' | 'html'
  className?: string
}

const PostContent: React.FC<PostContentProps> = ({ 
  content, 
  contentType = 'html', 
  className = '' 
}) => {
  if (contentType === 'markdown') {
    return (
      <div className={`post-content-markdown ${className}`}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Headers
            h1: ({children}) => (
              <h1 style={{
                fontSize: '2em',
                fontWeight: 'bold',
                marginBottom: '0.5em',
                marginTop: '1em',
                borderBottom: '1px solid #eee',
                paddingBottom: '0.3em'
              }}>
                {children}
              </h1>
            ),
            h2: ({children}) => (
              <h2 style={{
                fontSize: '1.5em',
                fontWeight: 'bold',
                marginBottom: '0.5em',
                marginTop: '1em',
                borderBottom: '1px solid #eee',
                paddingBottom: '0.3em'
              }}>
                {children}
              </h2>
            ),
            h3: ({children}) => (
              <h3 style={{
                fontSize: '1.25em',
                fontWeight: 'bold',
                marginBottom: '0.5em',
                marginTop: '1em'
              }}>
                {children}
              </h3>
            ),
            h4: ({children}) => (
              <h4 style={{
                fontSize: '1.1em',
                fontWeight: 'bold',
                marginBottom: '0.5em',
                marginTop: '1em'
              }}>
                {children}
              </h4>
            ),
            h5: ({children}) => (
              <h5 style={{
                fontSize: '1em',
                fontWeight: 'bold',
                marginBottom: '0.5em',
                marginTop: '1em'
              }}>
                {children}
              </h5>
            ),
            h6: ({children}) => (
              <h6 style={{
                fontSize: '0.9em',
                fontWeight: 'bold',
                marginBottom: '0.5em',
                marginTop: '1em',
                color: '#666'
              }}>
                {children}
              </h6>
            ),
            // Tables
            table: ({children}) => (
              <table style={{
                border: '1px solid #ddd',
                borderCollapse: 'collapse',
                width: '100%',
                marginBottom: '1rem'
              }}>
                {children}
              </table>
            ),
            th: ({children}) => (
              <th style={{
                border: '1px solid #ddd',
                padding: '8px',
                backgroundColor: '#f5f5f5',
                fontWeight: 'bold'
              }}>
                {children}
              </th>
            ),
            td: ({children}) => (
              <td style={{
                border: '1px solid #ddd',
                padding: '8px'
              }}>
                {children}
              </td>
            ),
            // Code
            code: ({children, className}) => {
              const isInline = !className
              return isInline ? (
                <code style={{
                  backgroundColor: '#f4f4f4',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.9em',
                  fontFamily: 'monospace'
                }}>
                  {children}
                </code>
              ) : (
                <pre style={{
                  backgroundColor: '#f4f4f4',
                  padding: '1rem',
                  borderRadius: '5px',
                  overflow: 'auto',
                  marginBottom: '1rem'
                }}>
                  <code style={{ fontFamily: 'monospace' }}>{children}</code>
                </pre>
              )
            },
            // Blockquotes
            blockquote: ({children}) => (
              <blockquote style={{
                borderLeft: '4px solid #ddd',
                paddingLeft: '1rem',
                margin: '1rem 0',
                fontStyle: 'italic',
                color: '#666',
                backgroundColor: '#f9f9f9',
                padding: '0.5rem 1rem'
              }}>
                {children}
              </blockquote>
            ),
            // Lists
            ul: ({children}) => (
              <ul style={{
                paddingLeft: '2rem',
                marginBottom: '1rem'
              }}>
                {children}
              </ul>
            ),
            ol: ({children}) => (
              <ol style={{
                paddingLeft: '2rem',
                marginBottom: '1rem'
              }}>
                {children}
              </ol>
            ),
            li: ({children}) => (
              <li style={{
                marginBottom: '0.25rem'
              }}>
                {children}
              </li>
            ),
            // Links
            a: ({children, href}) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#007bff',
                  textDecoration: 'underline'
                }}
              >
                {children}
              </a>
            ),
            // Paragraphs
            p: ({children}) => (
              <p style={{
                marginBottom: '1rem',
                lineHeight: '1.6'
              }}>
                {children}
              </p>
            ),
            // Emphasis
            strong: ({children}) => (
              <strong style={{ fontWeight: 'bold' }}>
                {children}
              </strong>
            ),
            em: ({children}) => (
              <em style={{ fontStyle: 'italic' }}>
                {children}
              </em>
            ),
            // Horizontal rule
            hr: () => (
              <hr style={{
                border: 'none',
                borderTop: '1px solid #ddd',
                margin: '2rem 0'
              }} />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  }

  // Default to HTML rendering
  return (
    <div 
      className={`post-content-html ${className}`}
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  )
}

export default PostContent

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './PostContent.css'

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
            h1: ({children}) => <h1>{children}</h1>,
            h2: ({children}) => <h2>{children}</h2>,
            h3: ({children}) => <h3>{children}</h3>,
            h4: ({children}) => <h4>{children}</h4>,
            h5: ({children}) => <h5>{children}</h5>,
            h6: ({children}) => <h6>{children}</h6>,
            // Tables
            table: ({children}) => <table>{children}</table>,
            th: ({children}) => <th>{children}</th>,
            td: ({children}) => <td>{children}</td>,
            // Code
            code: ({children, className}) => {
              const isInline = !className
              return isInline ? (
                <code>{children}</code>
              ) : (
                <pre>
                  <code className={className}>{children}</code>
                </pre>
              )
            },
            // Blockquotes
            blockquote: ({children}) => <blockquote>{children}</blockquote>,
            // Lists
            ul: ({children}) => <ul>{children}</ul>,
            ol: ({children}) => <ol>{children}</ol>,
            li: ({children}) => <li>{children}</li>,
            // Links
            a: ({children, href}) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            // Paragraphs
            p: ({children}) => <p>{children}</p>,
            // Emphasis
            strong: ({children}) => <strong>{children}</strong>,
            em: ({children}) => <em>{children}</em>,
            // Horizontal rule
            hr: () => <hr />
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

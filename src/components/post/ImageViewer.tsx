import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface ImageViewerProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  postId: string
  authorId: string
  subreddit?: string
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  currentIndex,
  onClose,
  postId,
  authorId,
  subreddit
}) => {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageIndex, setImageIndex] = useState(currentIndex)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // Reset position and scale when image changes
  useEffect(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [imageIndex])

  // Handle URL updates
  useEffect(() => {
    const imageId = `image${imageIndex + 1}`
    const basePath = subreddit 
      ? `/r/${subreddit}/post/${postId}` 
      : `/u/${authorId}/post/${postId}`
    
    const newUrl = `${basePath}#${imageId}`
    window.history.replaceState(null, '', newUrl)
  }, [imageIndex, postId, authorId, subreddit])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && imageIndex > 0) {
        setImageIndex(imageIndex - 1)
      } else if (e.key === 'ArrowRight' && imageIndex < images.length - 1) {
        setImageIndex(imageIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [imageIndex, images.length, onClose])

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    
    if (e.ctrlKey) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newScale = Math.min(Math.max(scale * delta, 0.1), 5)

      // Adjust position to zoom towards mouse cursor
      const scaleChange = newScale / scale
      const newX = mouseX - (mouseX - position.x) * scaleChange
      const newY = mouseY - (mouseY - position.y) * scaleChange

      setScale(newScale)
      setPosition({ x: newX, y: newY })
    }
  }

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const resetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const zoomIn = () => {
    const newScale = Math.min(scale * 1.2, 5)
    setScale(newScale)
  }

  const zoomOut = () => {
    const newScale = Math.max(scale * 0.8, 0.1)
    setScale(newScale)
  }

  return (
    <div 
      className="image-viewer-overlay"
      onClick={handleBackgroundClick}
      onWheel={handleWheel}
    >
      <div className="image-viewer-container" ref={containerRef}>
        {/* Controls */}
        <div className="image-viewer-controls">
          <button 
            className="control-btn close-btn"
            onClick={onClose}
            title="Đóng (Esc)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          
          <div className="zoom-controls">
            <button 
              className="control-btn"
              onClick={zoomOut}
              title="Thu nhỏ"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            
            <span className="zoom-level">{Math.round(scale * 100)}%</span>
            
            <button 
              className="control-btn"
              onClick={zoomIn}
              title="Phóng to"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            
            <button 
              className="control-btn"
              onClick={resetZoom}
              title="Đặt lại zoom"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            {imageIndex > 0 && (
              <button 
                className="nav-btn nav-prev"
                onClick={() => setImageIndex(imageIndex - 1)}
                title="Ảnh trước"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="15,18 9,12 15,6"/>
                </svg>
              </button>
            )}
            
            {imageIndex < images.length - 1 && (
              <button 
                className="nav-btn nav-next"
                onClick={() => setImageIndex(imageIndex + 1)}
                title="Ảnh tiếp"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </button>
            )}
          </>
        )}

        {/* Image */}
        <div className="image-container">
          <img
            ref={imageRef}
            src={images[imageIndex]}
            alt={`Ảnh ${imageIndex + 1}`}
            className="viewer-image"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            draggable={false}
          />
        </div>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="image-counter">
            {imageIndex + 1} / {images.length}
          </div>
        )}

        {/* Instructions */}
        <div className="viewer-instructions">
          <p>Ctrl + Scroll để zoom • Kéo để di chuyển • Esc để đóng</p>
        </div>
      </div>
    </div>
  )
}

export default ImageViewer 
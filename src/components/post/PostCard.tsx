import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, Share2, Bookmark, Download, Play, AlertTriangle, Edit3 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'
import { useAuthStore } from '../../store/authStore'
import { usePostsStore } from '../../store/usePostsStore'
import { useLanguageStore } from '../../store/useLanguageStore'
import { isImageFile, isVideoFile, isDangerousFile, getFileIcon } from '../../services/appwrite/storage'
import { softDeletePost } from '../../collections/posts'
import { generateEditToken } from '../../services/editTokenService'
import ImageViewer from './ImageViewer'
import PostContent from './PostContent'

interface PostCardProps {
  post: {
    id: string
    title: string
    body?: string
    contentType?: 'markdown' | 'html'
    author: {
      uid: string
      displayName: string
      photoURL?: string
    }
    community?: {
      name: string
      displayName: string
    }
    imageUrls?: string[]
    attachments?: Array<{
      id: string
      name: string
      type: string
      size: number
      url: string
      downloadUrl: string
    }>
    createdAt: any
    upvotes: number
    downvotes: number
    commentCount: number
    type: 'text' | 'image' | 'link'
    isDeleted?: boolean
  }
  onVote?: (postId: string, voteType: 'up' | 'down') => void
  userVote?: 'up' | 'down' | null
}

const PostCard: React.FC<PostCardProps> = ({ post, onVote, userVote }) => {
  const { user } = useAuthStore()
  const { removePostFromState } = usePostsStore()
  const { t, language } = useLanguageStore()
  const navigate = useNavigate()
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const handleVote = (voteType: 'up' | 'down') => {
    if (!user || post.isDeleted) {
      // TODO: Show login modal
      return
    }
    onVote?.(post.id, voteType)
  }

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
    setImageViewerOpen(true)
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const handleEditPost = async () => {
    if (!user) {
      // TODO: Show login modal
      return
    }

    try {
      const token = await generateEditToken(post.id, user.uid)
      navigate(`/edit-post/${post.id}/${token}`)
    } catch (error) {
      console.error('Error generating edit token:', error)
      alert(t('editLinkFailed'))
    }
  }

  const handleDeletePost = async () => {
    if (!user || user.uid !== post.author.uid) {
      console.error('Only post author can delete the post.')
      return
    }

    if (window.confirm(t('confirmDeletePost'))) {
      try {
        await softDeletePost(post.id, user.uid)
        // Remove post from state instead of refreshing the page
        removePostFromState(post.id)
        alert(t('postDeleted'))
      } catch (error) {
        console.error('Error deleting post:', error)
        alert(t('deletePostFailed'))
      }
    }
  }

  const renderFileIcon = (type: string) => {
    const iconType = getFileIcon(type)

    switch (iconType) {
      case 'video':
        return <Play className="w-6 h-6" />
      case 'pdf':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <path d="M9,13H16V14H9V13M9,16H14V17H9V16" />
          </svg>
        )
      case 'text':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <path d="M8,12H16V13H8V12M8,15H13V16H8V15" />
          </svg>
        )
      case 'word':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <path d="M8,12L10,17L12,12L14,17L16,12" />
          </svg>
        )
      case 'excel':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <path d="M8,12L12,16M12,12L8,16M16,12V16" />
          </svg>
        )
      case 'powerpoint':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <path d="M8,12H12V16H8V12M8,12V10H12" />
          </svg>
        )
      case 'archive':
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="21,8 21,21 3,21 3,8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
    }
  }

  const renderAttachment = (attachment: any, index: number) => {
    console.log('🎬 Rendering attachment:', attachment)

    if (isImageFile(attachment.type)) {
      return (
        <div key={attachment.id} className="post-attachment">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="post-image clickable-image"
            onClick={() => handleImageClick(index)}
            onError={(e) => {
              console.error('Failed to load image:', attachment.url);
              // Replace with fallback image placeholder
              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTA2LjYyNyA3MCAxMTIgNzUuMzczIDExMiA4MkMxMTIgODguNjI3IDEwNi42MjcgOTQgMTAwIDk0Qzk3LjIzODYgOTQgOTQuNzM4NiA5Mi44MDA3IDkzIDkwLjk5OTNDOTEuMjYxNCA4OS4xOTg2IDkwIDg2LjcxOTMgOTAgODRDOTAgNzcuMzczIDk1LjM3MyA3MiAxMDIgNzJIMTAwWiIgZmlsbD0iIzk5OUEzOSIvPgo8cGF0aCBkPSJNNzAgMTMwSDE0MFYxNDBMNzAgMTMwWiIgZmlsbD0iIzk5OTkzOSIvPgo8L3N2Zz4K';
              e.currentTarget.onclick = null; // Remove click handler for broken images
            }}
          />
          <div className="attachment-actions">
            <button
              className="download-btn"
              onClick={() => handleDownload(attachment.downloadUrl, attachment.name)}
              title={t('download')}
            >
              <Download className="w-4 h-4" />
              {t('download')}
            </button>
          </div>
        </div>
      )
    } else if (isVideoFile(attachment.type)) {
      console.log('🎬 Rendering video:', {
        url: attachment.url,
        type: attachment.type,
        name: attachment.name
      })

      return (
        <div key={attachment.id} className="post-attachment">
          <video
            src={attachment.url}
            controls
            preload="metadata"
            className="post-video"
            style={{ maxWidth: '100%', borderRadius: '8px' }}
            onLoadStart={() => {
              console.log('🎬 Video load started:', attachment.url)
            }}
            onCanPlay={() => {
              console.log('🎬 Video can play:', attachment.url)
            }}
            onError={(e) => {
              console.error('🎬 Video error:', {
                url: attachment.url,
                error: e.currentTarget.error,
                networkState: e.currentTarget.networkState,
                readyState: e.currentTarget.readyState
              })
              // Không ẩn video ngay lập tức, thay vào đó hiển thị thông báo lỗi
              e.currentTarget.style.display = 'none'

              // Tạo thông báo lỗi
              const errorDiv = document.createElement('div')
              errorDiv.className = 'video-error'
              errorDiv.innerHTML = `
                <div style="padding: 20px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; color: #6c757d;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="vertical-align: middle; margin-right: 8px;">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    {t('videoLoadError')}
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 12px; color: #6c757d;">
                    ${attachment.name}
                  </p>
                </div>
              `
              e.currentTarget.parentNode?.appendChild(errorDiv)
            }}
          />
          <div className="attachment-actions">
            <button
              className="download-btn"
              onClick={() => handleDownload(attachment.downloadUrl, attachment.name)}
              title={t('download')}
            >
              <Download className="w-4 h-4" />
              {t('download')}
            </button>
          </div>
        </div>
      )
    } else {
      return (
        <div key={attachment.id} className="post-attachment file-attachment">
          <div className="file-info">
            <div className="file-icon">
              {renderFileIcon(attachment.type)}
            </div>
            <div className="file-details">
              <p className="file-name">{attachment.name}</p>
              <p className="file-size">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
              {isDangerousFile(attachment.type, attachment.name) && (
                <div className="file-warning">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('fileDangerous')}</span>
                </div>
              )}
            </div>
          </div>
          <button
            className="download-btn"
            onClick={() => handleDownload(attachment.downloadUrl, attachment.name)}
            title={t('download')}
          >
            <Download className="w-4 h-4" />
            {t('download')}
          </button>
        </div>
      )
    }
  }

  // Combine imageUrls and attachments for image viewer
  const allImages = [
    ...(post.imageUrls || []),
    ...(post.attachments || [])
      .filter(att => isImageFile(att.type))
      .map(att => att.url)
  ]

  return (
    <div className="post-card">
      <div className="post-vote">
        <button
          className={`vote-button upvote ${userVote === 'up' ? 'active' : ''} ${post.isDeleted ? 'disabled' : ''}`}
          onClick={() => handleVote('up')}
          disabled={post.isDeleted}
          title={post.isDeleted ? t('cannotVoteDeleted') : t('upvote')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M7 14l5-5 5 5" />
          </svg>
        </button>
        <span className={`vote-score ${userVote === 'up' ? 'text-upvote' : userVote === 'down' ? 'text-downvote' : ''}`}>
          {post.upvotes - post.downvotes}
        </span>
        <button
          className={`vote-button downvote ${userVote === 'down' ? 'active' : ''} ${post.isDeleted ? 'disabled' : ''}`}
          onClick={() => handleVote('down')}
          disabled={post.isDeleted}
          title={post.isDeleted ? t('cannotVoteDeleted') : t('downvote')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M17 10l-5 5-5-5" />
          </svg>
        </button>
      </div>

      <div className="post-content">
        <div className="post-meta">
          <div className="flex">
            {post.community && (
              <>
                <Link to={`/r/${post.community.name}`}>r/{post.community.name}</Link>
                <span className="post-meta-separator">•</span>
              </>
            )}
            <span>{t('postedBy')}</span>
            {post.isDeleted || post.author.displayName === '[deleted]' ? (
              <span className="deleted-text">[deleted]</span>
            ) : (
              <Link to={`/u/${post.author.uid}`} className="author-link">u/{post.author.displayName}</Link>
            )}
            <span className="post-meta-separator">•</span>
            <span>{(() => {
              try {
                let date: Date;
                if (post.createdAt && typeof post.createdAt.toDate === 'function') {
                  date = post.createdAt.toDate();
                } else if (post.createdAt instanceof Date) {
                  date = post.createdAt;
                } else if (post.createdAt) {
                  date = new Date(post.createdAt);
                } else {
                  return 'Không xác định';
                }
                
                // Check if date is valid
                if (isNaN(date.getTime())) {
                  return t('unknownDate');
                }
                
                return formatDistanceToNow(date, { addSuffix: true, locale: language === 'vi' ? vi : enUS });
              } catch (error) {
                return t('unknownDate');
              }
            })()}</span>
          </div>
        </div>

        <h3 className="post-title">
          <Link to={`/post/${post.id}`}>{post.isDeleted ? '[deleted]' : post.title}</Link>
        </h3>

        {post.body && (
          <div className="post-body">
            {post.isDeleted ? (
              <div className="deleted-content">[deleted]</div>
            ) : (
              <PostContent
                content={post.body}
                contentType={post.contentType || 'html'}
              />
            )}
          </div>
        )}

        {/* Display images from imageUrls */}
        {!post.isDeleted && post.imageUrls && post.imageUrls.length > 0 && (
          <div className="post-images">
            {post.imageUrls.map((imageUrl, index) => (
              <div key={index} className="post-attachment">
                <img
                  src={imageUrl}
                  alt={`Post image ${index + 1}`}
                  className="post-image clickable-image"
                  onClick={() => handleImageClick(index)}
                  onError={(e) => {
                    console.error('Failed to load image:', imageUrl);
                    // Replace with fallback image placeholder
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTA2LjYyNyA3MCAxMTIgNzUuMzczIDExMiA4MkMxMTIgODguNjI3IDEwNi42MjcgOTQgMTAwIDk0Qzk3LjIzODYgOTQgOTQuNzM4NiA5Mi44MDA3IDkzIDkwLjk5OTNDOTEuMjYxNCA4OS4xOTg2IDkwIDg2LjcxOTMgOTAgODRDOTAgNzcuMzczIDk1LjM3MyA3MiAxMDIgNzJIMTAwWiIgZmlsbD0iIzk5OUEzOSIvPgo8cGF0aCBkPSJNNzAgMTMwSDE0MFYxNDBMNzAgMTMwWiIgZmlsbD0iIzk5OTkzOSIvPgo8L3N2Zz4K';
                    e.currentTarget.onclick = null; // Remove click handler for broken images
                  }}
                />
                <div className="attachment-actions">
                  <button
                    className="download-btn"
                    onClick={() => handleDownload(imageUrl, `image-${index + 1}.jpg`)}
                    title={t('download')}
                  >
                    <Download className="w-4 h-4" />
                    {t('download')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show [deleted] for attachments if post is deleted */}
        {post.isDeleted && post.attachments && post.attachments.length > 0 && (
          <div className="post-images">
            <div className="deleted-content">[deleted]</div>
          </div>
        )}

        {/* Display attachments */}
        {!post.isDeleted && post.attachments && post.attachments.length > 0 && (
          <div className="post-images">
            {post.attachments.map((attachment, index) =>
              renderAttachment(attachment, (post.imageUrls?.length || 0) + index)
            )}
          </div>
        )}

        <div className="post-actions">
          <Link to={`/post/${post.id}`} className="post-action">
            <MessageCircle />
            <span>{post.commentCount} {t('comments').toLowerCase()}</span>
          </Link>
          <button className="post-action">
            <Share2 />
            <span>{t('share')}</span>
          </button>
          <button className="post-action">
            <Bookmark />
            <span>{t('savePost')}</span>
          </button>
          {user && user.uid === post.author.uid && (
            <>
              <button className="post-action" onClick={handleEditPost}>
                <Edit3 className="w-4 h-4" />
                <span>{t('edit')}</span>
              </button>
              <button className="post-action" onClick={handleDeletePost}>
                <span>{t('delete')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Image Viewer */}
      {imageViewerOpen && allImages.length > 0 && (
        <ImageViewer
          images={allImages}
          currentIndex={selectedImageIndex}
          onClose={() => setImageViewerOpen(false)}
          postId={post.id}
          authorId={post.author.uid}
          subreddit={post.community?.name}
        />
      )}
    </div>
  )
}

export default PostCard 
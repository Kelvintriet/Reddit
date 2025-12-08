import { useState, useEffect } from 'react'
import { useAuthStore } from '../store'
import { getDeletedPosts, restorePost, permanentlyDeletePost, cleanupOldDeletedPosts } from '../collections/posts'
import type { Post } from '../types'
import { formatDistanceToNow } from 'date-fns'
import { vi, enUS } from 'date-fns/locale'
import { useLanguageStore } from '../store/useLanguageStore'
import { translations } from '../constants/translations'

const RecentlyDeleted = () => {
  const { user } = useAuthStore()
  const [deletedPosts, setDeletedPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingPostId, setProcessingPostId] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    postId: string;
    action: 'restore' | 'permanent_delete';
    postTitle: string;
  } | null>(null)
  const { language } = useLanguageStore()
  const t = (key: keyof typeof translations.vi) => translations[language][key]

  useEffect(() => {
    if (user) {
      fetchDeletedPosts()
    }
  }, [user])

  const fetchDeletedPosts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Lấy deleted posts của user hiện tại
      const posts = await getDeletedPosts(user?.uid)
      setDeletedPosts(posts)
    } catch (err) {
      console.error('Error fetching deleted posts:', err)
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestore = async (postId: string) => {
    if (!user) return
    
    try {
      setProcessingPostId(postId)
      await restorePost(postId, user.uid)
      
      // Refresh danh sách
      await fetchDeletedPosts()
      setShowConfirmDialog(null)
    } catch (err) {
      console.error('Error restoring post:', err)
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setProcessingPostId(null)
    }
  }

  const handlePermanentDelete = async (postId: string) => {
    try {
      setProcessingPostId(postId)
      await permanentlyDeletePost(postId)
      
      // Refresh danh sách
      await fetchDeletedPosts()
      setShowConfirmDialog(null)
    } catch (err) {
      console.error('Error permanently deleting post:', err)
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setProcessingPostId(null)
    }
  }

  const handleCleanupOld = async () => {
    try {
      setIsLoading(true)
      const deletedCount = await cleanupOldDeletedPosts()
      alert(t('cleanupSuccess').replace('{count}', deletedCount.toString()))
      await fetchDeletedPosts()
    } catch (err) {
      console.error('Error cleaning up old posts:', err)
      setError(err instanceof Error ? err.message : t('cleanupError'))
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeAgo = (date: any) => {
    let dateObj: Date
    
    // Handle different date formats
    if (date?.toDate) {
      dateObj = date.toDate() // Firestore Timestamp
    } else if (date instanceof Date) {
      dateObj = date
    } else {
      dateObj = new Date(date)
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return t('unknown')
    }
    
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: language === 'vi' ? vi : enUS })
  }

  const getDaysUntilAutoDelete = (deletedAt: any) => {
    const now = new Date()
    let deletedDate: Date
    
    // Handle different date formats
    if (deletedAt?.toDate) {
      deletedDate = deletedAt.toDate() // Firestore Timestamp
    } else if (deletedAt instanceof Date) {
      deletedDate = deletedAt
    } else {
      deletedDate = new Date(deletedAt)
    }
    
    // Check if date is valid
    if (isNaN(deletedDate.getTime())) {
      return 0
    }
    
    const diffMs = deletedDate.getTime() + (15 * 24 * 60 * 60 * 1000) - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  if (!user) {
    return (
      <div className="container">
        <p>{t('loginRequired')}</p>
      </div>
    )
  }

  return (
    <div className="recently-deleted-page">
      <div className="page-header">
        <h1>{t('recentlyDeletedPosts')}</h1>
        <p>{t('recentlyDeletedDesc')}</p>
        
        <div className="header-actions">
          <button 
            onClick={handleCleanupOld}
            className="cleanup-btn"
            disabled={isLoading}
          >
            {t('cleanupOldPosts')}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <svg viewBox="0 0 24 24" className="error-icon">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t('loading')}</p>
        </div>
      ) : deletedPosts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </div>
          <h3>{t('noDeletedPosts')}</h3>
          <p>{t('noDeletedPostsDesc')}</p>
        </div>
      ) : (
        <div className="deleted-posts-list">
          {deletedPosts.map(post => {
            // Use originalData for display in recycle bin, fallback to current post data
            const displayTitle = (post as any).originalData?.title || post.title;
            const displayContent = (post as any).originalData?.content || post.content;
            
            return (
            <div key={post.id} className="deleted-post-card">
              <div className="post-content">
                <h3 className="post-title">{displayTitle}</h3>
                <p className="post-preview">
                  {displayContent && displayContent.length > 200 
                    ? displayContent.substring(0, 200) + '...' 
                    : displayContent || t('noContent')
                  }
                </p>
                
                <div className="post-meta">
                  <span className="deleted-time">
                    {t('deletedTime')} {formatTimeAgo(post.deletedAt)}
                  </span>
                  <span className="auto-delete-warning">
                    {t('autoDeleteWarning').replace('{days}', getDaysUntilAutoDelete(post.deletedAt).toString())}
                  </span>
                  {post.deleteReason && post.deleteReason !== 'No reason provided' && (
                    <span className="delete-reason">
                      {t('deleteReason')}: {post.deleteReason}
                    </span>
                  )}
                </div>

                {post.originalData && (
                  <div className="original-stats">
                    <span>Upvotes: {post.originalData.upvotes}</span>
                    <span>Downvotes: {post.originalData.downvotes}</span>
                    <span>Comments: {post.originalData.commentCount}</span>
                  </div>
                )}
              </div>

              <div className="post-actions">
                <button
                  onClick={() => setShowConfirmDialog({
                    postId: post.id,
                    action: 'restore',
                    postTitle: displayTitle
                  })}
                  className="restore-btn"
                  disabled={processingPostId === post.id}
                >
                  {processingPostId === post.id ? (
                    <div className="loading-spinner-small"></div>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24">
                        <path d="M3 12a9 9 0 009-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                      {t('restore')}
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowConfirmDialog({
                    postId: post.id,
                    action: 'permanent_delete',
                    postTitle: displayTitle
                  })}
                  className="permanent-delete-btn"
                  disabled={processingPostId === post.id}
                >
                  {processingPostId === post.id ? (
                    <div className="loading-spinner-small"></div>
                  ) : (
                    t('deletePermanently')
                  )}
                </button>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="modal-backdrop">
          <div className="confirm-dialog">
            <h3>
              {showConfirmDialog.action === 'restore' 
                ? t('confirmRestoreTitle')
                : t('confirmDeleteTitle')
              }
            </h3>
            <p>
              {showConfirmDialog.action === 'restore'
                ? t('confirmRestoreDesc').replace('{title}', showConfirmDialog.postTitle)
                : t('confirmDeleteDesc').replace('{title}', showConfirmDialog.postTitle)
              }
            </p>
            
            <div className="dialog-actions">
              <button
                onClick={() => setShowConfirmDialog(null)}
                className="cancel-btn"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  if (showConfirmDialog.action === 'restore') {
                    handleRestore(showConfirmDialog.postId)
                  } else {
                    handlePermanentDelete(showConfirmDialog.postId)
                  }
                }}
                className={showConfirmDialog.action === 'restore' ? 'restore-btn' : 'permanent-delete-btn'}
                disabled={processingPostId === showConfirmDialog.postId}
              >
                {processingPostId === showConfirmDialog.postId ? (
                  <div className="loading-spinner-small"></div>
                ) : (
                  showConfirmDialog.action === 'restore' ? t('restore') : t('deletePermanently')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecentlyDeleted 
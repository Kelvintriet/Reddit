import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore, usePostsStore, useSubredditsStore } from '../store'
import { getPost, editPost } from '../collections/posts'
import { validateEditToken, expireTokenAfterEdit } from '../services/editTokenService'
import FileUpload from '../components/post/FileUpload'
import RichTextEditor from '../components/editor/RichTextEditor'
import type { UploadedFile } from '../services/appwrite/storage'
import { SUPPORTED_IMAGE_TYPES, SUPPORTED_VIDEO_TYPES, SUPPORTED_DOCUMENT_TYPES } from '../services/appwrite/storage'
import { getFileCleanupWebSocket } from '../services/websocket/fileCleanup'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { db } from '../lib/firebase'

const CreatePost = () => {
  const { subreddit: subredditParam, postId, token } = useParams<{ subreddit?: string; postId?: string; token?: string }>()
  const navigate = useNavigate()
  const { user, isInitialized } = useAuthStore()
  const { createPost, isLoading } = usePostsStore()
  const { subreddits, fetchSubreddits } = useSubredditsStore()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedSubreddit, setSelectedSubreddit] = useState(subredditParam || '')
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isMarkdown, setIsMarkdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [originalPost, setOriginalPost] = useState<any>(null)
  const [tokenValidated, setTokenValidated] = useState(false)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [_canViewContent, setCanViewContent] = useState(false)
  const [savedContent, setSavedContent] = useState({ title: '', content: '' })
  const wsRef = useRef<ReturnType<typeof getFileCleanupWebSocket> | null>(null)

  // Feedback-specific states
  const [feedbackCategory, setFeedbackCategory] = useState<'bugs' | 'ideas' | 'questions'>('ideas')
  const [anonymousType, setAnonymousType] = useState<'none' | 'hide_author' | 'private'>('none')

  // Check if current subreddit is feedback
  const isFeedbackSubreddit = selectedSubreddit === 'feedback'

  // WebSocket connection for file cleanup tracking (only for new posts, not edits)
  useEffect(() => {
    if (!isEditMode && user) {
      // Connect WebSocket for new post creation
      const ws = getFileCleanupWebSocket(user.uid);
      wsRef.current = ws;

      ws.connect().catch(error => {
        console.warn('Failed to connect WebSocket for file cleanup:', error);
      });

      // Cleanup on unmount
      return () => {
        if (wsRef.current) {
          wsRef.current.disconnect();
          wsRef.current = null;
        }
      };
    }
  }, [isEditMode, user]);

  // Auto-save content when user types (for recovery purposes)
  useEffect(() => {
    if (isEditMode && (title || content)) {
      setSavedContent({ title, content })
    }
  }, [title, content, isEditMode])

  // Check if we're in edit mode
  useEffect(() => {
    if (postId && token) {
      setIsEditMode(true)
      validateTokenAndLoadPost()
    } else if (postId && !token) {
      // If postId exists but no token, redirect to 404
      setError('Liên kết không hợp lệ hoặc đã hết hạn')
      navigate('/404', { replace: true })
    }
  }, [postId, token])

  const validateTokenAndLoadPost = async () => {
    if (!postId || !token || !user) return

    try {
      // Enhanced token validation
      const validationResult = await validateEditToken(postId, token, user.uid)

      if (!validationResult.isValid) {
        setTokenExpired(true)
        setTokenValidated(false)
        setTokenError(validationResult.error || 'Token không hợp lệ')
        setCanViewContent(validationResult.canViewContent || false)

        if (!validationResult.canViewContent) {
          setError('Liên kết không hợp lệ hoặc không có quyền truy cập')
          setTimeout(() => {
            navigate('/', { replace: true })
          }, 3000)
          return
        }
      } else {
        // Token is valid
        setTokenValidated(true)
        setTokenExpired(false)
        setTokenError(null)
        setCanViewContent(true)
      }

      // Load the post if we can view content
      if (validationResult.isValid || validationResult.canViewContent) {
        await loadPostForEdit()
      }
    } catch (error) {
      console.error('Error validating token:', error)
      setError('Có lỗi xảy ra khi xác thực quyền chỉnh sửa')
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 3000)
    }
  }

  const loadPostForEdit = async () => {
    if (!postId || !user) return

    try {
      const post = await getPost(postId)
      if (!post) {
        setError('Bài viết không tồn tại')
        return
      }

      // Check if user is the author
      if (post.authorId !== user.uid) {
        setError('Bạn không có quyền chỉnh sửa bài viết này')
        return
      }

      // Load post data
      setOriginalPost(post)
      setTitle(post.title)
      setContent(post.content)
      setSelectedSubreddit(post.subreddit || '')
      setTags(post.tags || [])

      // Convert attachments to UploadedFile format if needed
      if (post.attachments && post.attachments.length > 0) {
        const convertedFiles: UploadedFile[] = post.attachments.map((att: any) => ({
          id: att.id,
          name: att.name,
          type: att.type,
          size: att.size,
          url: att.url,
          downloadUrl: att.downloadUrl
        }))
        setUploadedFiles(convertedFiles)
      }
    } catch (error) {
      console.error('Error loading post for edit:', error)
      setError('Lỗi khi tải bài viết')
    }
  }

  useEffect(() => {
    // Wait for auth to initialize before checking user
    if (!isInitialized) return

    if (!user) {
      navigate('/login')
      return
    }

    fetchSubreddits()
  }, [user, isInitialized, navigate, fetchSubreddits])

  useEffect(() => {
    if (subredditParam) {
      setSelectedSubreddit(subredditParam)
    }
  }, [subredditParam])

  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(prev => [...prev, ...files])

    // Track files via WebSocket
    if (wsRef.current && !isEditMode) {
      files.forEach(file => {
        wsRef.current?.trackFile(file.id);
      });
    }
  }

  const handleFileRemoved = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))

    // Remove from WebSocket tracking
    if (wsRef.current && !isEditMode) {
      wsRef.current.removeFile(fileId);
    }
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim()) && tags.length < 5) {
        setTags(prev => [...prev, tagInput.trim()])
        setTagInput('')
      }
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError('Bạn cần đăng nhập để tạo bài viết')
      return
    }

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề')
      return
    }

    if (!content.trim() && uploadedFiles.length === 0) {
      setError('Vui lòng nhập nội dung hoặc upload media')
      return
    }

    // If in edit mode, validate token again before saving
    if (isEditMode && postId && token) {
      try {
        const isValidToken = await validateEditToken(postId, token, user.uid)
        if (!isValidToken) {
          setError('❌ Lỗi: URL đã hết hạn. Liên kết chỉnh sửa không còn hợp lệ. Vui lòng quay lại bài viết và nhấn "Sửa" lại để tạo liên kết mới.')
          return
        }
      } catch (error) {
        setError('❌ Lỗi: Không thể xác thực quyền chỉnh sửa')
        return
      }
    }

    try {
      setError(null)

      // Get image URLs from uploaded files
      const imageUrls = uploadedFiles
        .filter(file => file.type.startsWith('image/'))
        .map(file => file.url)

      // Get all attachments
      const attachments = uploadedFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: file.url,
        downloadUrl: file.downloadUrl
      }))

      if (isEditMode && originalPost) {
        // Check if token is still valid before saving
        if (!tokenValidated) {
          setError('Phiên chỉnh sửa đã hết hạn. Vui lòng sao chép nội dung và tạo liên kết chỉnh sửa mới.')
          setSavedContent({ title, content })
          return
        }

        await editPost(originalPost.id, {
          title,
          content,
          contentType: isMarkdown ? 'markdown' : 'html',
          editReason: 'Chỉnh sửa bài viết'
        }, user.uid)

        // Expire the token after successful edit for security
        if (postId && token) {
          await expireTokenAfterEdit(postId, token, user.uid)
        }

        // Navigate to the edited post
        // Check if posting to user profile (starts with u/)
        if (selectedSubreddit && !selectedSubreddit.startsWith('u/')) {
          navigate(`/r/${selectedSubreddit}/post/${originalPost.id}`)
        } else {
          navigate(`/post/${originalPost.id}`)
        }
      } else {
        // Prepare tags for feedback or regular posts
        let postTags = tags;
        let isAnonymous = false;
        let isPrivate = false;

        if (isFeedbackSubreddit) {
          // For feedback, use category as the only tag
          const categoryEmoji = feedbackCategory === 'bugs' ? '🐛' : feedbackCategory === 'ideas' ? '💡' : '❓';
          postTags = [`${categoryEmoji} ${feedbackCategory}`];

          // Handle anonymous options
          isAnonymous = anonymousType === 'hide_author';
          isPrivate = anonymousType === 'private';

          // Save feedback to separate collection
          const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
          const feedbackData = {
            title,
            content,
            contentType: isMarkdown ? 'markdown' : 'html',
            feedbackCategory,
            isAnonymous,
            isPrivate,
            authorId: user.uid,
            authorUsername: isAnonymous ? '[deleted]' : (user.displayName || user.username || 'Người dùng ẩn danh'),
            tags: postTags,
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
            upvotes: 0,
            downvotes: 0,
            commentCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };

          // Save to feedbackPosts collection
          const feedbackRef = await addDoc(collection(db, 'feedbackPosts'), feedbackData);

          // Navigate to feedback post
          navigate(`/r/feedback/post/${feedbackRef.id}`);
          return;
        }

        const postId = await createPost({
          title,
          content,
          contentType: isMarkdown ? 'markdown' : 'html',
          subreddit: selectedSubreddit || undefined,
          type: imageUrls.length > 0 ? 'image' : 'text',
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
          authorId: user.uid,
          authorUsername: user.displayName || user.username || 'Người dùng ẩn danh',
          tags: postTags.length > 0 ? postTags : undefined
        }, user.uid, user.displayName || user.username || 'Người dùng ẩn danh');

        if (postId) {
          // Notify WebSocket that post was submitted (files should be kept)
          if (wsRef.current && !isEditMode) {
            wsRef.current.notifyPostSubmitted();
          }

          // Navigate to the created post
          // Check if posting to user profile (starts with u/)
          if (selectedSubreddit && !selectedSubreddit.startsWith('u/')) {
            navigate(`/r/${selectedSubreddit}/post/${postId}`)
          } else {
            navigate(`/post/${postId}`)
          }
        }
      }
    } catch (error) {
      console.error('Error creating post:', error)
      setError(error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo bài viết')
    }
  }

  // Show loading while auth is initializing
  if (!isInitialized) {
    return (
      <div className="container">
        <p>Đang tải...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container">
        <p>Đang chuyển hướng...</p>
      </div>
    )
  }

  // Show error if token validation failed
  if (error && (error.includes('hết hạn') || error.includes('không hợp lệ') || error.includes('xác thực'))) {
    return (
      <div className="container">
        <div className="error-message" style={{
          padding: '2rem',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          textAlign: 'center',
          margin: '2rem auto',
          maxWidth: '600px'
        }}>
          <h2>❌ Lỗi chỉnh sửa bài viết</h2>
          <p>{error}</p>
          <p>Bạn sẽ được chuyển hướng về trang chủ trong giây lát...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="create-post-page">
      <div className="create-post-header">
        <h1>{isEditMode ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}</h1>

        {/* Token expiry warning */}
        {isEditMode && tokenExpired && (
          <div className="token-warning" style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '12px 16px',
            margin: '16px 0',
            color: '#856404'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              ⚠️
              <strong>Cảnh báo:</strong> Liên kết chỉnh sửa đã hết hạn ({tokenError}).
            </div>
            <p style={{ margin: '8px 0', fontSize: '14px' }}>
              Bạn có thể xem và chỉnh sửa nội dung, nhưng không thể lưu thay đổi.
              Vui lòng sao chép nội dung đã chỉnh sửa, quay lại bài viết gốc và nhấn "Sửa" lại để tạo liên kết mới.
            </p>
            {savedContent.title || savedContent.content ? (
              <div style={{
                background: '#e8f5e8',
                border: '1px solid #c3e6c3',
                borderRadius: '4px',
                padding: '8px',
                marginTop: '8px'
              }}>
                <strong>📋 Nội dung đã lưu:</strong>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  <div><strong>Tiêu đề:</strong> {savedContent.title}</div>
                  <div><strong>Nội dung:</strong> {savedContent.content.substring(0, 100)}...</div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="create-post-container">
        {/* User Info */}
        <div className="post-user-info">
          <div className="user-avatar">
            {(user.avatarUrl || user.photoURL) ? (
              <img src={user.avatarUrl || user.photoURL || undefined} alt={user.displayName || 'User'} />
            ) : (
              <div className="avatar-placeholder">
                {(user.displayName || user.username || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="user-details">
            <span className="username">u/{user.displayName || user.username}</span>
            <div className="community-selector">
              <select
                value={selectedSubreddit}
                onChange={(e) => setSelectedSubreddit(e.target.value)}
                className="community-select"
              >
                <option value="">Không chọn cộng đồng</option>
                <option value="feedback">🐛 r/feedback (Bugs, Ideas, Questions)</option>
                {subreddits.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    r/{sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Post Type Tabs */}
        <div className="post-type-tabs">
          <div className="tab active">
            📝 Post
          </div>
        </div>

        {/* Post Form */}
        <form onSubmit={handleSubmit} className="post-form">
          {/* Title */}
          <div className="form-group">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề*"
              className="title-input"
              maxLength={300}
              required
            />
            <div className="character-count">
              {title.length}/300
            </div>
          </div>

          {/* Content Editor */}
          <div className="form-group">
            <div className="editor-header">
              <h3>Nội dung</h3>
              <button
                type="button"
                className={`editor-toggle ${isMarkdown ? 'active' : ''}`}
                onClick={() => setIsMarkdown(!isMarkdown)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: isMarkdown ? '#007bff' : 'white',
                  color: isMarkdown ? 'white' : '#007bff',
                  cursor: 'pointer'
                }}
              >
                {isMarkdown ? 'Markdown' : 'Rich Text'}
              </button>
            </div>

            {isMarkdown ? (
              <>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung (Markdown)..."
                  className="content-textarea"
                  rows={8}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    resize: 'vertical'
                  }}
                />
                <div className="markdown-preview" style={{ marginTop: '16px' }}>
                  <h4>Preview:</h4>
                  <div className="markdown-content" style={{
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    padding: '16px',
                    backgroundColor: '#f8f9fa',
                    minHeight: '100px'
                  }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <table style={{
                            border: '1px solid #ddd',
                            borderCollapse: 'collapse',
                            width: '100%',
                            marginBottom: '1rem'
                          }}>
                            {children}
                          </table>
                        ),
                        th: ({ children }) => (
                          <th style={{
                            border: '1px solid #ddd',
                            padding: '8px',
                            backgroundColor: '#f5f5f5',
                            fontWeight: 'bold'
                          }}>
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td style={{
                            border: '1px solid #ddd',
                            padding: '8px'
                          }}>
                            {children}
                          </td>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className
                          return isInline ? (
                            <code style={{
                              backgroundColor: '#f4f4f4',
                              padding: '2px 4px',
                              borderRadius: '3px',
                              fontSize: '0.9em'
                            }}>
                              {children}
                            </code>
                          ) : (
                            <pre style={{
                              backgroundColor: '#f4f4f4',
                              padding: '1rem',
                              borderRadius: '5px',
                              overflow: 'auto'
                            }}>
                              <code>{children}</code>
                            </pre>
                          )
                        },
                        blockquote: ({ children }) => (
                          <blockquote style={{
                            borderLeft: '4px solid #ddd',
                            paddingLeft: '1rem',
                            margin: '1rem 0',
                            fontStyle: 'italic',
                            color: '#666'
                          }}>
                            {children}
                          </blockquote>
                        )
                      }}
                    >
                      {content || 'Nhập nội dung để xem preview...'}
                    </ReactMarkdown>
                  </div>
                </div>
              </>
            ) : (
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Nhập nội dung bài viết..."
                className="rich-editor"
              />
            )}
          </div>

          {/* Media Upload */}
          <div className="form-group">
            <div className="media-upload-header">
              <h3>Media</h3>
              <span className="media-info">Hỗ trợ ảnh và video</span>
            </div>
            <FileUpload
              onFilesUploaded={handleFilesUploaded}
              onFileRemoved={handleFileRemoved}
              uploadedFiles={uploadedFiles}
              maxFiles={10}
              acceptedTypes={[...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES, 'application/pdf', ...SUPPORTED_DOCUMENT_TYPES]}
              multiple={true}
              userId={user?.uid}
            />
          </div>

          {/* Tags or Feedback Category */}
          {isFeedbackSubreddit ? (
            <>
              {/* Feedback Category Selection */}
              <div className="form-group">
                <div className="tags-header">
                  <h3>Category*</h3>
                  <span className="tags-info">Choose feedback type</span>
                </div>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value as 'bugs' | 'ideas' | 'questions')}
                  className="community-select"
                  style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                >
                  <option value="bugs">🐛 Bugs - Report issues</option>
                  <option value="ideas">💡 Ideas - Suggest features</option>
                  <option value="questions">❓ Questions - Ask anything</option>
                </select>
              </div>

              {/* Anonymous Type Selection */}
              <div className="form-group">
                <div className="tags-header">
                  <h3>Privacy</h3>
                  <span className="tags-info">Choose visibility</span>
                </div>
                <select
                  value={anonymousType}
                  onChange={(e) => setAnonymousType(e.target.value as 'none' | 'hide_author' | 'private')}
                  className="community-select"
                  style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                >
                  <option value="none">👤 Public - Show my username</option>
                  <option value="hide_author">🎭 Anonymous - Hide my username (public post)</option>
                  <option value="private">🔒 Private - Only visible to developers</option>
                </select>
                {anonymousType === 'private' && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: '#856404'
                  }}>
                    🔒 This feedback will only be visible to developers and moderators.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Regular Tags */
            <div className="form-group">
              <div className="tags-header">
                <h3>Tags</h3>
                <span className="tags-info">Tối đa 5 tags</span>
              </div>
              <div className="tags-input-container">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Nhập tag và nhấn Enter"
                  className="tags-input"
                  maxLength={20}
                />
              </div>
              {tags.length > 0 && (
                <div className="tags-list">
                  {tags.map((tag, index) => (
                    <span key={index} className="tag">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="tag-remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="error-message">
              ❌
              {error}
            </div>
          )}

          {/* Submit Actions */}
          <div className="submit-actions">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="cancel-btn"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim() || (isEditMode && tokenExpired)}
              className={`submit-btn ${isEditMode && tokenExpired ? 'disabled-expired' : ''}`}
              title={isEditMode && tokenExpired ? 'Không thể lưu - liên kết đã hết hạn' : ''}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  {isEditMode ? 'Đang cập nhật...' : 'Đang đăng...'}
                </>
              ) : (
                <>
                  {isEditMode ? 'Cập nhật bài viết' : 'Đăng bài'}
                  {isEditMode && tokenExpired && (
                    <span style={{ marginLeft: '8px', fontSize: '14px' }}>🔒</span>
                  )}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreatePost 
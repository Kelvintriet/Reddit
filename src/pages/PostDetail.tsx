import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore, usePostsStore, useSubredditsStore } from '../store'
import { getCommentTree, createComment, voteComment, deleteComment, updateComment } from '../collections/comments'
import { getFileDownloadUrl } from '../services/appwrite/storage'
import { processKarmaAction } from '../services/karmaService'
import ImageViewer from '../components/post/ImageViewer'
import PostContent from '../components/post/PostContent'
import type { Comment } from '../collections/comments'
import { useLanguageStore } from '../store/useLanguageStore'
import { translations } from '../constants/translations'
import './PostDetail.css'

// Component Comment
interface CommentProps {
  comment: Comment & { replies?: Comment[] };
  depth?: number;
  maxDepth?: number;
  postId: string;
  onReplyAdded: () => void;
}

const CommentComponent: React.FC<CommentProps> = ({ comment, depth = 0, maxDepth = 10, postId, onReplyAdded }) => {
  const [showReplies, setShowReplies] = useState(true);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [votes, setVotes] = useState(comment.upvotes - comment.downvotes);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuthStore();
  const { language } = useLanguageStore();
  const t = (key: keyof typeof translations.vi) => translations[language][key];

  // Kiểm tra vote hiện tại của user
  useEffect(() => {
    if (user && comment.votes && comment.votes[user.uid]) {
      setUserVote(comment.votes[user.uid]);
    }
  }, [user, comment.votes]);

  const formatDate = (date: any) => {
    if (!date) return 'Không xác định';

    let dateObj: Date;

    // Firestore Timestamp
    if (date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return t('unknownDate');
    }

    return dateObj.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUpvote = async () => {
    if (!user || !comment.id || comment.isDeleted) return;

    try {
      const result = await voteComment(comment.id, user.uid, 'up');

      if (result) {
        // Update local state with server response
        setVotes(result.upvotes - result.downvotes);
        setUserVote(result.votes[user.uid] || null);

        // Update karma for comment author
        if (comment.authorId && comment.authorId !== user.uid && !comment.isDeleted) {
          await processKarmaAction({
            type: 'comment_upvoted',
            userId: comment.authorId,
            contentId: comment.id,
            contentType: 'comment',
            points: 1
          })
        }

        // Reload comments to ensure consistency
        onReplyAdded();
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
    }
  };

  const handleDownvote = async () => {
    if (!user || !comment.id || comment.isDeleted) return;

    try {
      const result = await voteComment(comment.id, user.uid, 'down');

      if (result) {
        // Update local state with server response
        setVotes(result.upvotes - result.downvotes);
        setUserVote(result.votes[user.uid] || null);

        // Update karma for comment author
        if (comment.authorId && comment.authorId !== user.uid && !comment.isDeleted) {
          await processKarmaAction({
            type: 'comment_downvoted',
            userId: comment.authorId,
            contentId: comment.id,
            contentType: 'comment',
            points: -1
          })
        }

        // Reload comments to ensure consistency
        onReplyAdded();
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createComment({
        content: replyContent.trim(),
        postId,
        authorId: user.uid,
        authorUsername: user.displayName || user.username || t('anonymousUser'),
        parentId: comment.id
      });

      setReplyContent('');
      setIsReplying(false);
      onReplyAdded(); // Reload comments
    } catch (error) {
      alert(t('errorAddingComment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editContent.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateComment(comment.id!, editContent.trim(), user.uid);
      setIsEditing(false);
      onReplyAdded(); // Reload comments
    } catch (error) {
      alert(t('errorUpdatingComment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !confirm(t('confirmDeleteComment'))) return;

    try {
      await deleteComment(comment.id!, user.uid);
      onReplyAdded(); // Reload comments
    } catch (error) {
      alert(t('errorDeletingComment'));
    }
  };

  const canReply = depth < maxDepth && user;
  const isAuthor = user && comment.authorId === user.uid;

  return (
    <div className="comment" style={{ marginLeft: `${depth * 20}px` }}>
      <div className="comment-container">
        {/* Vote sidebar */}
        <div className="comment-vote-sidebar">
          <button
            onClick={handleUpvote}
            aria-label="Upvote"
            className={`vote-button ${userVote === 'up' ? 'upvoted' : ''} ${comment.isDeleted ? 'disabled' : ''}`}
            disabled={!user || comment.isDeleted}
            title={comment.isDeleted ? 'Cannot vote on deleted comment' : 'Upvote'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4L4 15h16L12 4z" />
            </svg>
          </button>

          <span className={`vote-count ${userVote === 'up' ? 'upvoted' : userVote === 'down' ? 'downvoted' : ''}`}>
            {votes}
          </span>

          <button
            onClick={handleDownvote}
            aria-label="Downvote"
            className={`vote-button ${userVote === 'down' ? 'downvoted' : ''} ${comment.isDeleted ? 'disabled' : ''}`}
            disabled={!user || comment.isDeleted}
            title={comment.isDeleted ? 'Cannot vote on deleted comment' : 'Downvote'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 20l8-11H4l8 11z" />
            </svg>
          </button>
        </div>

        {/* Comment content */}
        <div className="comment-content">
          <div className="comment-header">
            {comment.isDeleted || comment.authorUsername === '[deleted]' ? (
              <span className="comment-author deleted-text">[deleted]</span>
            ) : (
              <Link to={`/u/${comment.authorId}`} className="comment-author">
                u/{comment.authorUsername}
              </Link>
            )}
            <span className="comment-dot">•</span>
            <span className="comment-time">{formatDate(comment.createdAt)}</span>
            {comment.updatedAt && (
              <>
                <span className="comment-dot">•</span>
                <span className="comment-edited">{t('edited')}</span>
              </>
            )}
            {depth > 0 && (
              <>
                <span className="comment-dot">•</span>
                <span className="comment-depth">{t('level')} {depth}</span>
              </>
            )}
          </div>

          <div className="comment-body">
            {comment.isDeleted ? (
              <div className="deleted-content">[deleted]</div>
            ) : isEditing ? (
              <form onSubmit={handleEdit} className="edit-form">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="edit-textarea"
                  rows={3}
                />
                <div className="edit-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="edit-cancel-button"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!editContent.trim() || isSubmitting}
                    className="edit-submit-button"
                  >
                    {isSubmitting ? t('saving') : t('save')}
                  </button>
                </div>
              </form>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: comment.content }} />
            )}
          </div>

          <div className="comment-actions">
            {canReply && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="comment-action-button"
              >
                {t('reply')}
              </button>
            )}

            {isAuthor && !comment.isDeleted && (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="comment-action-button"
                >
                  {t('edit')}
                </button>
                <button
                  onClick={handleDelete}
                  className="comment-action-button delete"
                >
                  {t('delete')}
                </button>
              </>
            )}

            {comment.isDeleted && (
              <span className="comment-action-button" style={{ cursor: 'default', opacity: 0.6 }}>
                {t('deleted')}
              </span>
            )}

            <button className="comment-action-button">
              {t('share')}
            </button>
            <button className="comment-action-button">
              {t('report')}
            </button>
          </div>

          {isReplying && (
            <form onSubmit={handleReply} className="reply-form">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="reply-textarea"
                placeholder={`${t('reply')} u/${comment.authorUsername}...`}
                rows={3}
              />
              <div className="reply-actions">
                <button
                  type="button"
                  onClick={() => setIsReplying(false)}
                  className="reply-cancel-button"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={!replyContent.trim() || isSubmitting}
                  className="reply-submit-button"
                >
                  {isSubmitting ? t('sending') : t('reply')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="replies-container">
          {depth < maxDepth ? (
            <>
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="toggle-replies-button"
              >
                {showReplies ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="toggle-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {t('hideReplies').replace('{count}', comment.replies.length.toString())}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="toggle-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {t('showReplies').replace('{count}', comment.replies.length.toString())}
                  </>
                )}
              </button>

              {showReplies && (
                <div className="nested-comments">
                  {comment.replies.map((reply) => (
                    <CommentComponent
                      key={reply.id}
                      comment={reply}
                      depth={depth + 1}
                      maxDepth={maxDepth}
                      postId={postId}
                      onReplyAdded={onReplyAdded}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="max-depth-message">
              <p>{t('maxDepthReached').replace('{depth}', maxDepth.toString())} <Link to="#top">{t('viewAtTop')}</Link></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { language } = useLanguageStore()
  const t = (key: keyof typeof translations.vi) => translations[language][key];
  const { currentPost: post, setCurrentPost, fetchPostById, voteOnPost } = usePostsStore()
  const { fetchSubredditByName } = useSubredditsStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [commentContent, setCommentContent] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null)
  const [votes, setVotes] = useState(0)
  const [viewCount, setViewCount] = useState(423)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'top'>('top')
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Handle image click to open viewer
  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index)
    setShowImageViewer(true)
  }

  // Close image viewer and update URL
  const handleCloseImageViewer = () => {
    setShowImageViewer(false)
    const basePath = post?.subreddit
      ? `/r/${post.subreddit}/post/${postId}`
      : `/u/${post?.authorId}/post/${postId}`
    window.history.replaceState(null, '', basePath)
  }

  // Check URL hash for image viewer on load
  useEffect(() => {
    const hash = location.hash
    if (hash.startsWith('#image') && post?.imageUrls?.length) {
      const imageNumber = parseInt(hash.replace('#image', ''))
      if (imageNumber > 0 && imageNumber <= post.imageUrls.length) {
        setCurrentImageIndex(imageNumber - 1)
        setShowImageViewer(true)
      }
    }
  }, [location.hash, post?.imageUrls])

  const loadComments = async () => {
    if (!postId) return;

    setIsLoadingComments(true);
    try {
      const commentTree = await getCommentTree(postId, sortBy);
      setComments(commentTree);
    } catch (error) {
      // Removed console.error
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleUpvote = async () => {
    if (!user || !postId || post?.isDeleted) return;

    try {
      await voteOnPost(postId, 'up', user.uid);

      // Update local state optimistically  
      if (userVote === 'up') {
        // Remove upvote
        setVotes(votes - 1);
        setUserVote(null);
      } else {
        // Add upvote (remove downvote if exists)
        setVotes(userVote === 'down' ? votes + 2 : votes + 1);
        setUserVote('up');
      }
    } catch (error) {
      // Removed console.error
    }
  };

  const handleDownvote = async () => {
    if (!user || !postId || post?.isDeleted) return;

    try {
      await voteOnPost(postId, 'down', user.uid);

      // Update local state optimistically
      if (userVote === 'down') {
        // Remove downvote
        setVotes(votes + 1);
        setUserVote(null);
      } else {
        // Add downvote (remove upvote if exists)
        setVotes(userVote === 'up' ? votes - 2 : votes - 1);
        setUserVote('down');
      }
    } catch (error) {
      // Removed console.error
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId, sortBy]);

  useEffect(() => {
    const fetchPostData = async () => {
      setIsLoading(true);

      try {
        if (!postId) {
          setIsLoading(false);
          return;
        }

        // Tìm bài viết trong store hoặc fetch từ API
        if (post && post.id === postId) {
          setVotes((post.upvotes || 0) - (post.downvotes || 0));
          setViewCount(post.viewCount || 0);

          // Set user vote from database
          if (user && post.votes && post.votes[user.uid]) {
            setUserVote(post.votes[user.uid]);
          }
          setIsLoading(false);
        } else {
          try {
            const fetchedPost = await fetchPostById(postId, user?.uid);

            if (fetchedPost) {
              // Check if post is soft deleted and user is not the author
              if (fetchedPost.isDeleted && (!user || user.uid !== fetchedPost.authorId)) {
                // Post is deleted and user is not the author - show taken down message
                setIsLoading(false);
                return;
              }

              setVotes((fetchedPost.upvotes || 0) - (fetchedPost.downvotes || 0));
              setViewCount(fetchedPost.viewCount || 0);

              // Set user vote from database
              if (user && fetchedPost.votes && fetchedPost.votes[user.uid]) {
                setUserVote(fetchedPost.votes[user.uid]);
              }

              if (fetchedPost.subreddit) {
                await fetchSubredditByName(fetchedPost.subreddit);
              }
            }
          } catch (error) {
            // Post not found or error fetching
          }
          setIsLoading(false);
        }
      } catch (error) {
        setIsLoading(false);
      }
    };

    fetchPostData();
  }, [postId, navigate, fetchPostById, post, setCurrentPost, fetchSubredditByName, user]);

  const formatDate = (date: any) => {
    if (!date) return t('unknownDate');

    let dateObj: Date;

    // Firestore Timestamp
    if (date.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return t('unknownDate');
    }

    return dateObj.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !user || isSubmittingComment) return;

    if (!user) {
      navigate('/login');
      return;
    }

    setIsSubmittingComment(true);
    try {
      await createComment({
        content: commentContent.trim(),
        postId: postId!,
        authorId: user.uid,
        authorUsername: user.displayName || user.username || t('anonymousUser')
      });

      setCommentContent('');
      await loadComments(); // Reload comments
    } catch (error) {
      alert(t('errorAddingComment'));
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="post-detail-container">
        <div className="post-detail-skeleton">
          <div className="skeleton-loading-message">{t('loadingPost')}</div>
          <div className="skeleton-title"></div>
          <div className="skeleton-meta"></div>
          <div className="skeleton-content">
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
            <div className="skeleton-line"></div>
          </div>
          <div className="skeleton-image"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detail-container">
        <div className="post-not-found">
          <h2>{t('postNotFound')}</h2>
          <p>{t('postNotFoundDesc')}</p>
          <div className="post-not-found-actions">
            <Link to="/" className="back-home-button">{t('backToHome')}</Link>
            <Link to="/submit" className="create-post-button">{t('createPost')}</Link>
          </div>
        </div>
      </div>
    );
  }

  // Check if post is soft deleted and user is not the author
  if (post.isDeleted && (!user || user.uid !== post.authorId)) {
    return (
      <div className="post-detail-container">
        <div className="post-taken-down">
          <div className="taken-down-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h2>{t('postDeleted')}</h2>
          <p>{t('postDeletedDesc')}</p>
          <div className="post-not-found-actions">
            <Link to="/" className="back-home-button">{t('backToHome')}</Link>
            <Link to="/submit" className="create-post-button">{t('createPost')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="post-detail-container" id="top">
      {/* Post Card */}
      <div className="post-detail-card">
        <div className="post-detail-layout">
          {/* Vote sidebar */}
          <div className="post-vote-sidebar">
            <button
              onClick={handleUpvote}
              aria-label="Upvote"
              disabled={!user || post?.isDeleted}
              className={`vote-button ${userVote === 'up' ? 'upvoted' : ''} ${post?.isDeleted ? 'disabled' : ''}`}
              title={post?.isDeleted ? 'Cannot vote on deleted post' : 'Upvote'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4L4 15h16L12 4z" />
              </svg>
            </button>

            <span className={`vote-count ${userVote === 'up' ? 'upvoted' : userVote === 'down' ? 'downvoted' : ''}`}>
              {votes}
            </span>

            <button
              onClick={handleDownvote}
              aria-label="Downvote"
              disabled={!user || post?.isDeleted}
              className={`vote-button ${userVote === 'down' ? 'downvoted' : ''} ${post?.isDeleted ? 'disabled' : ''}`}
              title={post?.isDeleted ? 'Cannot vote on deleted post' : 'Downvote'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 20l8-11H4l8 11z" />
              </svg>
            </button>
          </div>

          {/* Main content */}
          <div className="post-content">
            {/* Post metadata */}
            <div className="post-metadata">
              {post.subreddit && (
                <>
                  <Link to={`/r/${post.subreddit}`} className="subreddit-link">
                    r/{post.subreddit}
                  </Link>
                  <span className="post-dot">•</span>
                </>
              )}
              <span className="post-author-prefix">{t('postedBy')}</span>
              {post.isDeleted || post.authorUsername === '[deleted]' ? (
                <span className="deleted-text">[deleted]</span>
              ) : (
                <Link to={`/u/${post.authorId}`} className="post-author-link">
                  u/{post.authorUsername}
                </Link>
              )}
              <span className="post-dot">•</span>
              <span className="post-time">{formatDate(post.createdAt)}</span>
              <span className="post-dot">•</span>
              <span className="post-views">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="view-icon">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
                {viewCount} {t('views')}
              </span>
            </div>

            <h1 className="post-title">
              {post.title}
            </h1>

            {/* Post content */}
            <div className="post-body">
              <PostContent
                content={post.content}
                contentType={post.contentType || 'html'}
              />

              {post.imageUrls && post.imageUrls.length > 0 && (
                <div className="post-images">
                  {post.imageUrls.map((imageUrl, index) => {
                    // Lấy file ID từ URL để kiểm tra loại file
                    const fileIdMatch = imageUrl.match(/files\/([^\/]+)\/view/);
                    const fileId = fileIdMatch ? fileIdMatch[1] : null;

                    return (
                      <div key={index} className="post-attachment">
                        <img
                          src={imageUrl}
                          alt={`${post.title} - ${t('image')} ${index + 1}`}
                          className="post-image clickable-image"
                          loading="lazy"
                          onClick={() => handleImageClick(index)}
                          onError={(e) => {
                            console.error('Failed to load image:', imageUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {fileId && (
                          <div className="attachment-actions">
                            <button
                              className="download-btn"
                              onClick={() => {
                                const downloadUrl = getFileDownloadUrl(fileId);
                                window.open(downloadUrl, '_blank');
                              }}
                              title={t('download')}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7,10 12,15 17,10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                              {t('download')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="post-actions">
              <div className="post-action-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="action-icon">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .4-.1.6-.2L16 18h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14h-4.8l-5.2 3v-3H4V4h16v12z" />
                </svg>
                <span className="action-text">{comments.length} {t('comments')}</span>
              </div>

              <button className="post-action-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="action-icon">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92zM18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                </svg>
                <span className="action-text">{t('share')}</span>
              </button>

              <button className="post-action-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="action-icon">
                  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z" />
                </svg>
                <span className="action-text">{t('save')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Form */}
      <div className="comment-form-card">
        <h3 className="comment-form-title">{t('writeComment')}</h3>
        {user ? (
          <form onSubmit={handleCommentSubmit} className="comment-form">
            <textarea
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              className="comment-textarea"
              placeholder={t('shareThoughts')}
              rows={4}
            />
            <div className="comment-form-actions">
              <button
                type="submit"
                disabled={!commentContent.trim() || isSubmittingComment}
                className="comment-submit-button"
              >
                {isSubmittingComment ? t('posting') : t('postComment')}
              </button>
            </div>
          </form>
        ) : (
          <div className="login-prompt">
            <p>{t('loginToComment')}</p>
            <button
              onClick={() => navigate(`${location.pathname}#login`)}
              className="login-link"
            >
              {t('loginNow')}
            </button>
          </div>
        )}
      </div>

      {/* Comments */}
      <div className="comments-section">
        <div className="comments-header">
          <h3 className="comments-title">{comments.length} {t('comments')}</h3>
          <div className="comments-sort">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'top')}
              className="sort-select"
            >
              <option value="top">{t('sortTopComments')}</option>
              <option value="newest">{t('sortNewestComments')}</option>
              <option value="oldest">{t('sortOldestComments')}</option>
            </select>
          </div>
        </div>

        {isLoadingComments ? (
          <div className="comments-loading">{t('loadingComments')}</div>
        ) : comments.length > 0 ? (
          <div className="comments-list">
            {comments.map((comment) => (
              <CommentComponent
                key={comment.id}
                comment={comment}
                depth={0}
                maxDepth={10}
                postId={postId!}
                onReplyAdded={loadComments}
              />
            ))}
          </div>
        ) : (
          <div className="no-comments">
            <p>{t('noCommentsYet')}</p>
          </div>
        )}
      </div>

      {/* Image Viewer */}
      {showImageViewer && post?.imageUrls && (
        <ImageViewer
          images={post.imageUrls}
          currentIndex={currentImageIndex}
          onClose={handleCloseImageViewer}
          postId={postId!}
          authorId={post.authorId}
          subreddit={post.subreddit}
        />
      )}
    </div>
  )
}

export default PostDetail 
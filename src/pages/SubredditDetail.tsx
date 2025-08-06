import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useSubredditsStore, usePostsStore } from '../store';
import { generateSettingsToken } from '../services/settingsTokenService';
import PostCard from '../components/post/PostCard';
import PostSkeleton from '../components/post/PostSkeleton';
import './SubredditDetail.css';

const SubredditDetail: React.FC = () => {
  const { subreddit: subredditName } = useParams<{ subreddit: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentSubreddit, fetchSubredditByName, joinSubreddit, leaveSubreddit, isLoading: subredditLoading } = useSubredditsStore();
  const { posts, fetchPosts, isLoading: postsLoading, error: postsError, setSortBy } = usePostsStore();
  const [activeSort, setActiveSort] = useState<'best' | 'hot' | 'new' | 'top' | 'rising'>('best');
  const [isJoined, setIsJoined] = useState(false);

  // Generate secure token for settings access
  const handleSettingsClick = async () => {
    if (!user || !currentSubreddit) return;

    try {
      const token = await generateSettingsToken(currentSubreddit.name, user.uid);
      navigate(`/r/${currentSubreddit.name}/edit?rules=${token}`);
    } catch (error) {
      console.error('Error generating settings token:', error);
      alert('Có lỗi xảy ra khi tạo liên kết cài đặt');
    }
  };

  useEffect(() => {
    if (subredditName) {
      fetchSubredditByName(subredditName);
      
      const sortMapping: Record<string, 'hot' | 'new' | 'top'> = {
        'best': 'hot',
        'hot': 'hot',
        'new': 'new',
        'top': 'top',
        'rising': 'hot'
      };
      
      setSortBy(sortMapping[activeSort]);
      fetchPosts(subredditName);
    }
  }, [subredditName, fetchSubredditByName, fetchPosts, activeSort, setSortBy]);

  useEffect(() => {
    if (currentSubreddit && user) {
      setIsJoined(currentSubreddit.members?.includes(user.uid) || false);
    }
  }, [currentSubreddit, user]);

  const handleSortChange = (newSort: 'best' | 'hot' | 'new' | 'top' | 'rising') => {
    setActiveSort(newSort);
  };

  const handleJoinToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!subredditName) return;

    try {
      if (isJoined) {
        await leaveSubreddit(subredditName);
        setIsJoined(false);
      } else {
        await joinSubreddit(subredditName);
        setIsJoined(true);
      }
      // Refresh subreddit data
      await fetchSubredditByName(subredditName);
    } catch (error) {
      console.error('Error joining/leaving subreddit:', error);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Không xác định';
    
    let dateObj: Date;
    
    // Firestore Timestamp
    if (date?.seconds) {
      dateObj = new Date(date.seconds * 1000);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      // Try to parse as string or number
      dateObj = new Date(date);
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Không xác định';
    }
    
    return dateObj.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPostsCount = () => {
    return posts.filter(post => post.subreddit === subredditName).length;
  };

  if (subredditLoading) {
    return (
      <div className="subreddit-detail-container">
        <div className="subreddit-header-skeleton">
          <div className="subreddit-banner-skeleton"></div>
          <div className="subreddit-info-skeleton">
            <div className="subreddit-icon-skeleton"></div>
            <div className="subreddit-text-skeleton">
              <div className="subreddit-name-skeleton"></div>
              <div className="subreddit-meta-skeleton"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentSubreddit) {
    return (
      <div className="subreddit-detail-container">
        <div className="subreddit-not-found">
          <h1>Không tìm thấy cộng đồng</h1>
          <p>Cộng đồng r/{subredditName} không tồn tại hoặc đã bị xóa.</p>
          <Link to="/subexplore" className="explore-communities-btn">
            Khám phá các cộng đồng khác
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="subreddit-detail-container">
      {/* Subreddit Header */}
      <div className="subreddit-header">
        {/* Banner */}
        <div className="subreddit-banner">
          {currentSubreddit.bannerImageUrl ? (
            <img src={currentSubreddit.bannerImageUrl} alt={`r/${currentSubreddit.name} banner`} />
          ) : (
            <div className="subreddit-banner-placeholder"></div>
          )}
        </div>

        {/* Subreddit Info */}
        <div className="subreddit-info">
          <div className="subreddit-main-info">
            <div className="subreddit-icon">
              {currentSubreddit.iconImageUrl ? (
                <img src={currentSubreddit.iconImageUrl} alt={`r/${currentSubreddit.name}`} />
              ) : (
                <div className="subreddit-icon-placeholder">
                  r/
                </div>
              )}
            </div>
            
            <div className="subreddit-text-info">
              <h1 className="subreddit-name">r/{currentSubreddit.name}</h1>
              <p className="subreddit-description">{currentSubreddit.description}</p>
            </div>

            <div className="subreddit-actions">
              {user && currentSubreddit.createdBy === user.uid ? (
                <div className="owner-section">
                  <button className="owner-badge">
                    Chủ sở hữu
                  </button>
                  <button
                    onClick={handleSettingsClick}
                    className="settings-button"
                    title="Cài đặt cộng đồng"
                  >
                    ⚙️
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleJoinToggle}
                  className={`join-button ${isJoined ? 'joined' : ''}`}
                  disabled={!user}
                >
                  {isJoined ? 'Đã tham gia' : 'Tham gia'}
                </button>
              )}
              
              {user && (
                <Link 
                  to={`/r/${currentSubreddit.name}/submit`}
                  className="create-post-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Tạo bài viết
                </Link>
              )}
            </div>
          </div>

          {/* Subreddit Stats */}
          <div className="subreddit-stats">
            <div className="stat-item">
              <div className="stat-number">{currentSubreddit.memberCount?.toLocaleString() || 0}</div>
              <div className="stat-label">Thành viên</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{getPostsCount()}</div>
              <div className="stat-label">Bài viết</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{formatDate(currentSubreddit.createdAt)}</div>
              <div className="stat-label">Được tạo</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="subreddit-content">
        <div className="posts-section">
          {/* Sort Controls */}
          <div className="sort-controls">
            {(['best', 'hot', 'new', 'top', 'rising'] as const).map((sort) => (
              <button
                key={sort}
                onClick={() => handleSortChange(sort)}
                className={`sort-button ${activeSort === sort ? 'active' : ''}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  {sort === 'best' && <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />}
                  {sort === 'hot' && <path d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03z" />}
                  {sort === 'new' && <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />}
                  {sort === 'top' && <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />}
                  {sort === 'rising' && <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />}
                </svg>
                {sort === 'best' && 'Hay nhất'}
                {sort === 'hot' && 'Nổi bật'}
                {sort === 'new' && 'Mới nhất'}
                {sort === 'top' && 'Hàng đầu'}
                {sort === 'rising' && 'Đang lên'}
              </button>
            ))}
          </div>

          {/* Posts */}
          {postsError ? (
            <div className="error-message">
              <p>{postsError}</p>
              <button onClick={() => fetchPosts(subredditName)} className="retry-button">
                Thử lại
              </button>
            </div>
          ) : postsLoading ? (
            <div>
              {Array.from({ length: 5 }).map((_, index) => (
                <PostSkeleton key={index} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-posts">
              <div className="empty-icon">📝</div>
              <h3>Chưa có bài viết nào</h3>
              <p>Hãy là người đầu tiên đăng bài trong cộng đồng này!</p>
              {user && (
                <Link to={`/r/${currentSubreddit.name}/submit`} className="create-first-post-btn">
                  Tạo bài viết đầu tiên
                </Link>
              )}
            </div>
          ) : (
            <div className="posts-list">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={{
                    id: post.id,
                    title: post.title,
                    body: post.content,
                    contentType: post.contentType || 'html',
                    author: {
                      uid: post.authorId,
                      displayName: post.authorUsername,
                      photoURL: undefined
                    },
                    community: post.subreddit ? {
                      name: post.subreddit,
                      displayName: post.subreddit
                    } : undefined,
                    imageUrls: post.imageUrls,
                    attachments: post.attachments,
                    createdAt: post.createdAt,
                    upvotes: post.upvotes || 0,
                    downvotes: post.downvotes || 0,
                    commentCount: post.commentCount || 0,
                    type: post.imageUrls && post.imageUrls.length > 0 ? 'image' : 'text'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="subreddit-sidebar">
          <div className="sidebar-card">
            <h3>Thông tin về r/{currentSubreddit.name}</h3>
            <div className="sidebar-info">
              <p>{currentSubreddit.description}</p>
              
              <div className="sidebar-stats">
                <div className="sidebar-stat">
                  <strong>{currentSubreddit.memberCount?.toLocaleString() || 0}</strong>
                  <span>Thành viên</span>
                </div>
                <div className="sidebar-stat">
                  <strong>{getPostsCount()}</strong>
                  <span>Bài viết</span>
                </div>
              </div>

              <div className="sidebar-meta">
                <div className="meta-item">
                  <span className="meta-label">Được tạo:</span>
                  <span className="meta-value">{formatDate(currentSubreddit.createdAt)}</span>
                </div>
              </div>

              {/* Rules */}
              {currentSubreddit.rules && currentSubreddit.rules.length > 0 && (
                <div className="sidebar-rules">
                  <h4>Quy tắc cộng đồng</h4>
                  <ol>
                    {currentSubreddit.rules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Moderators */}
              {currentSubreddit.moderatorIds && currentSubreddit.moderatorIds.length > 0 && (
                <div className="sidebar-moderators">
                  <h4>Người điều hành</h4>
                  <ul>
                    {currentSubreddit.moderatorIds.map((modId, index) => {
                      const modName = currentSubreddit.moderatorNames?.[index] || `user_${modId.substring(0, 8)}`
                      return (
                        <li key={index}>
                          <Link to={`/u/${modId}`}>u/{modName}</Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubredditDetail; 
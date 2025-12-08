import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
// Temporary karma functions until karmaService is fixed
const formatKarma = (karma: number): string => {
  if (karma >= 1000000) return `${(karma / 1000000).toFixed(1)}M`;
  if (karma >= 1000) return `${(karma / 1000).toFixed(1)}K`;
  return karma.toString();
};
import { useAuthStore, usePostsStore } from '../store'
import { getUserProfile, searchUserByIdentifier } from '../collections/users'
import { getCountryFlag, getCurrentTimeForLocation, getLocationWithAutoFetch } from '../services/location'
import PostCard from '../components/post/PostCard'
import PostSkeleton from '../components/post/PostSkeleton'

const Profile = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { posts, fetchUserPosts, isLoading, error, voteOnPost } = usePostsStore()
  const [activeTab, setActiveTab] = useState('posts')
  const [profileUser, setProfileUser] = useState<any>(null)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<any>(null)
  const [_avatarCacheBuster, setAvatarCacheBuster] = useState(Date.now())

  const fetchUserProfile = async () => {
    if (!userId) return;

    setIsLoadingUser(true);
    try {
      // Try to search by username/identifier first, fallback to direct UID lookup
      let userProfile = await searchUserByIdentifier(userId);

      // If not found by username, try direct UID lookup
      if (!userProfile) {
        userProfile = await getUserProfile(userId);
      }

      if (userProfile) {
        // Convert Firestore Timestamp to JS Date
        const processedProfile = {
          ...userProfile,
          username: userProfile.username || userProfile.displayName || `user_${(userProfile.id || userId).substring(0, 8)}`,
          createdAt: userProfile.createdAt && typeof userProfile.createdAt === 'object' && 'toDate' in userProfile.createdAt
            ? (userProfile.createdAt as any).toDate()
            : userProfile.createdAt instanceof Date
              ? userProfile.createdAt
              : new Date(userProfile.createdAt || Date.now()),
        };
        setProfileUser(processedProfile);
        setAvatarCacheBuster(Date.now()); // Update cache buster when profile changes

        // Load location if user allows it
        const shouldShowLocation = (processedProfile as any).showLocation !== false; // Default to true

        if (shouldShowLocation) {
          const location = await getLocationWithAutoFetch();
          setCurrentLocation(location);
        }
      } else {
        // Nếu không tìm thấy user profile, tạo dữ liệu mẫu
        setProfileUser({
          id: userId,
          username: `user_${userId.substring(0, 8)}`,
          displayName: `User ${userId.substring(0, 8)}`,
          bio: '',
          karma: 0,
          joinedSubreddits: [],
          savedPosts: [],
          createdAt: new Date(),
          isAdmin: false,
          hideProfile: false,
          hidePosts: false,
          hideComments: false,
          showLocation: true
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Create fallback profile
      setProfileUser({
        id: userId,
        username: `user_${userId.substring(0, 8)}`,
        displayName: `User ${userId.substring(0, 8)}`,
        bio: '',
        karma: 0,
        joinedSubreddits: [],
        savedPosts: [],
        createdAt: new Date(),
        isAdmin: false,
        hideProfile: false,
        hidePosts: false,
        hideComments: false,
        showLocation: true
      });
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Add refresh function
  const refreshProfile = async () => {
    if (userId) {
      await fetchUserProfile()
    }
  }

  const handleVote = async (postId: string, voteType: 'up' | 'down') => {
    if (!user) {
      console.log('User must be logged in to vote');
      return;
    }

    try {
      await voteOnPost(postId, voteType, user.uid);
    } catch (error) {
      console.error('Error voting on post:', error);
    }
  };

  const getUserVote = (postId: string): 'up' | 'down' | null => {
    if (!user) return null;
    const post = posts.find(p => p.id === postId);
    if (!post || !post.votes) return null;
    return post.votes[user.uid] || null;
  };

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  // Listen for window focus to refresh profile data
  useEffect(() => {
    const handleFocus = () => {
      if (userId) {
        refreshProfile();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [userId]);

  useEffect(() => {
    if (profileUser?.id) {
      // Lấy bài viết của người dùng using the actual user ID from profile
      fetchUserPosts(profileUser.id);
    }
  }, [profileUser?.id]);

  const isOwnProfile = user && profileUser && user.uid === profileUser.id;

  // Check privacy settings
  const isProfileHidden = profileUser?.hideProfile && !isOwnProfile;
  const arePostsHidden = profileUser?.hidePosts && !isOwnProfile;
  const areCommentsHidden = profileUser?.hideComments && !isOwnProfile;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    });
  };

  // If profile is completely hidden, show message
  if (isProfileHidden) {
    return (
      <div className="container profile-container">
        <div className="profile-hidden-message">
          <div className="hidden-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
            </svg>
          </div>
          <h2>Hồ sơ này đã được ẩn</h2>
          <p>Người dùng này đã chọn ẩn hồ sơ của họ khỏi công chúng.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container profile-container">
      {/* Profile Header */}
      <div className="profile-header">
        {isLoadingUser ? (
          <div className="profile-header-skeleton">
            <div className="avatar-skeleton"></div>
            <div className="info-skeleton">
              <div className="username-skeleton"></div>
              <div className="meta-skeleton"></div>
            </div>
          </div>
        ) : profileUser ? (
          <div className="profile-header-content">
            <div className="profile-avatar">
              {(profileUser?.avatarUrl || profileUser?.photoURL) ? (
                <img
                  src={profileUser.avatarUrl || profileUser.photoURL}
                  alt={profileUser?.username || 'User'}
                  onError={(e) => {
                    console.error('Failed to load avatar:', profileUser.avatarUrl || profileUser.photoURL);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.setAttribute('style', 'display: flex');
                  }}
                />
              ) : null}
              <span style={{ display: (profileUser?.avatarUrl || profileUser?.photoURL) ? 'none' : 'flex' }}>
                {(profileUser?.displayName || profileUser?.username || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="profile-info">
              <h1 className="profile-username">
                u/{isOwnProfile ? (user?.username || user?.displayName) : (profileUser?.displayName || profileUser?.username)}
                {(isOwnProfile ? user?.atName : profileUser?.atName) && (
                  <span className="profile-at-name">@{isOwnProfile ? user.atName : profileUser.atName}</span>
                )}
                <span className="profile-karma-display">
                  {formatKarma((isOwnProfile ? user?.karma : profileUser?.karma) || 0)} karmas
                </span>
              </h1>
              <p className="profile-meta">
                {(isOwnProfile ? user?.customUID : profileUser?.customUID) ? (
                  <>
                    <span className="profile-uid">ID: {isOwnProfile ? user.customUID : profileUser.customUID}</span>
                    <span className="profile-separator"> • </span>
                  </>
                ) : (
                  <>
                    <span className="profile-karma">{(isOwnProfile ? user?.karma : profileUser?.karma) || 0} karma</span>
                    <span className="profile-separator"> • </span>
                  </>
                )}
                <span className="profile-joined">Thành viên từ {formatDate(profileUser?.createdAt || new Date())}</span>
                {currentLocation && (isOwnProfile ? user?.showLocation !== false : (profileUser as any)?.showLocation !== false) && (
                  <>
                    <span className="profile-separator"> • </span>
                    <span className="profile-location">
                      {getCountryFlag(currentLocation.country_code)} {currentLocation.country}
                      <span style={{
                        marginLeft: '0.25rem',
                        fontSize: '0.8rem',
                        opacity: 0.8
                      }}>
                        ({currentLocation.country_code}-{currentLocation.continent_code})
                      </span>
                      {currentLocation.timezone_gmtOffset && (
                        <span style={{
                          marginLeft: '0.5rem',
                          fontSize: '0.8rem',
                          opacity: 0.8
                        }}>
                          🕐 {getCurrentTimeForLocation(currentLocation)}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </p>
              
              {!isOwnProfile && (
                <div className="profile-actions" style={{ marginTop: '16px' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      navigate('/inbox', { 
                        state: { 
                          startChatWith: {
                            id: profileUser.id,
                            username: profileUser.username,
                            displayName: profileUser.displayName,
                            avatarUrl: profileUser.avatarUrl || profileUser.photoURL
                          } 
                        } 
                      });
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                    </svg>
                    Chat
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Bài viết
        </button>
        <button
          className={`profile-tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Bình luận
        </button>
        {isOwnProfile && (
          <button
            className={`profile-tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            Đã lưu
          </button>
        )}
      </div>

      {/* Content */}
      <div className="profile-content">
        {activeTab === 'posts' && (
          <>
            {arePostsHidden ? (
              <div className="content-hidden-message">
                <div className="hidden-icon-small">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                  </svg>
                </div>
                <h3>Bài viết đã được ẩn</h3>
                <p>Người dùng này đã chọn ẩn bài viết của họ khỏi hồ sơ công khai.</p>
              </div>
            ) : isLoading ? (
              <div className="posts-list">
                {Array.from({ length: 3 }).map((_, index) => (
                  <PostSkeleton key={index} />
                ))}
              </div>
            ) : error ? (
              <div className="error-message">
                {error}
              </div>
            ) : posts.length === 0 ? (
              <div className="empty-state">
                <h3>Chưa có bài viết nào</h3>
                <p>
                  {isOwnProfile
                    ? 'Bạn chưa đăng bài viết nào.'
                    : 'Người dùng này chưa đăng bài viết nào.'}
                </p>
                {isOwnProfile && (
                  <div className="empty-state-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate('/submit')}
                    >
                      Tạo bài viết
                    </button>
                  </div>
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
                    onVote={handleVote}
                    userVote={getUserVote(post.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'comments' && (
          <>
            {areCommentsHidden ? (
              <div className="content-hidden-message">
                <div className="hidden-icon-small">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
                  </svg>
                </div>
                <h3>Bình luận đã được ẩn</h3>
                <p>Người dùng này đã chọn ẩn bình luận của họ khỏi hồ sơ công khai.</p>
              </div>
            ) : (
              <div className="empty-state">
                <h3>Chưa có bình luận nào</h3>
                <p>
                  {isOwnProfile
                    ? 'Bạn chưa bình luận bài viết nào.'
                    : 'Người dùng này chưa bình luận bài viết nào.'}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'saved' && isOwnProfile && (
          <div className="empty-state">
            <h3>Chưa có bài viết đã lưu</h3>
            <p>
              Bạn chưa lưu bài viết nào.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile 
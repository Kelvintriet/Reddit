import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuthStore, usePostsStore } from '../store';
import PostCard from '../components/post/PostCard';
import PostSkeleton from '../components/post/PostSkeleton';
import BotMonitor from '../components/bot/BotMonitor';

const Home = () => {
  const { subreddit } = useParams<{ subreddit?: string }>();
  const { user } = useAuthStore();
  const { posts, fetchPosts, isLoading, error, setSortBy, voteOnPost } = usePostsStore();
  const [activeSort, setActiveSort] = useState<'best' | 'hot' | 'new' | 'top' | 'rising'>('best');
  
  useEffect(() => {
    const sortMapping: Record<string, 'hot' | 'new' | 'top'> = {
      'best': 'hot',
      'hot': 'hot',
      'new': 'new',
      'top': 'top',
      'rising': 'hot'
    };
    
    setSortBy(sortMapping[activeSort]);
    fetchPosts(subreddit);
  }, [activeSort, subreddit]);
  
  const handleSortChange = (newSort: 'best' | 'hot' | 'new' | 'top' | 'rising') => {
    setActiveSort(newSort);
  };

  const handleVote = async (postId: string, voteType: 'up' | 'down') => {
    if (!user) {
      // TODO: Show login modal
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

  return (
    <>
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

      {/* Posts Container */}
      <div className="posts-container">
        {isLoading ? (
          /* Loading Skeletons */
          <>
            {[...Array(5)].map((_, index) => (
              <PostSkeleton key={index} />
            ))}
          </>
        ) : error ? (
          /* Error State */
          <div className="error-message">
            <p>Đã xảy ra lỗi khi tải bài viết: {error}</p>
            <button onClick={() => fetchPosts(subreddit)}>Thử lại</button>
          </div>
        ) : (
          <>
            {posts.length === 0 ? (
              /* Empty State */
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
                <h3>Chưa có bài viết nào</h3>
                <p>Hãy là người đầu tiên tạo bài viết cho cộng đồng này!</p>
                <div className="empty-state-actions">
                  <Link to="/submit" className="reddit-create-btn">
                    Tạo bài viết
                  </Link>
                  <Link to="/subexplore" className="btn-outlined">
                    Khám phá cộng đồng
                  </Link>
                </div>
              </div>
            ) : (
              /* Posts List */
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
                        photoURL: null
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
      </div>

      {/* Bot Monitor - Show bot activity */}
      {user && <BotMonitor />}
    </>
  );
};

export default Home; 
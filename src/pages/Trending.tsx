import React, { useState, useEffect } from 'react';
import { useAuthStore, usePostsStore } from '../store';
import PostCard from '../components/post/PostCard';
import PostSkeleton from '../components/post/PostSkeleton';
import './SpecialSubreddits.css';

const Trending: React.FC = () => {
  const { user } = useAuthStore();
  const { posts, fetchSpecialSubreddit, isLoading, error, voteOnPost } = usePostsStore();
  const [activeSort] = useState<'best' | 'hot' | 'new' | 'top' | 'rising'>('best');

  useEffect(() => {
    fetchSpecialSubreddit('trending');
  }, [activeSort]);

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

  return (
    <div className="trending-container">
      {/* Header */}
      <div className="trending-header">
        <div className="trending-info">
          <div className="trending-icon">
            <svg width="40" height="40" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="trending-text">
            <h1>r/trending</h1>
            <p>Những bài viết đang thịnh hành trên Reddit</p>
          </div>
        </div>
        <div className="trending-stats">
          <div className="stat-item">
            <div className="stat-number">{posts.length}</div>
            <div className="stat-label">Bài viết thịnh hành</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">Hàng ngày</div>
            <div className="stat-label">Cập nhật</div>
          </div>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => fetchSpecialSubreddit('trending')} className="retry-button">
            Thử lại
          </button>
        </div>
      ) : isLoading ? (
        <div>
          {Array.from({ length: 5 }).map((_, index) => (
            <PostSkeleton key={index} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-posts">
          <div className="empty-icon">📈</div>
          <h3>Chưa có bài viết thịnh hành</h3>
          <p>Những bài viết có tỷ lệ upvote cao nhất sẽ xuất hiện ở đây!</p>
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

      {/* Info Sidebar */}
      <div className="trending-info-box">
        <h3>Về r/trending</h3>
        <p>
          r/trending hiển thị những bài viết có tỷ lệ upvote/downvote tốt nhất và đang thu hút sự chú ý.
          Chỉ có tối đa 150 bài viết được chọn hàng tháng, cập nhật hàng ngày.
        </p>
        <div className="info-stats">
          <div className="info-stat">
            <strong>150</strong>
            <span>Bài viết tối đa</span>
          </div>
          <div className="info-stat">
            <strong>Hàng ngày</strong>
            <span>Tần suất cập nhật</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trending; 
import React, { useState, useEffect } from 'react';
import { useAuthStore, usePostsStore } from '../store';
import PostCard from '../components/post/PostCard';
import PostSkeleton from '../components/post/PostSkeleton';
import { useLanguageStore } from '../store/useLanguageStore';
import { translations } from '../constants/translations';
import './SpecialSubreddits.css';

const Popular: React.FC = () => {
  const { user } = useAuthStore();
  const { posts, fetchSpecialSubreddit, isLoading, error, voteOnPost } = usePostsStore();
  const [activeSort] = useState<'best' | 'hot' | 'new' | 'top' | 'rising'>('best');
  const { language } = useLanguageStore();
  const t = (key: keyof typeof translations.vi) => translations[language][key];

  useEffect(() => {
    fetchSpecialSubreddit('popular');
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
    <div className="popular-container">
      {/* Header */}
      <div className="popular-header">
        <div className="popular-info">
          <div className="popular-icon">
            <svg width="40" height="40" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div className="popular-text">
            <h1>r/popular</h1>
            <p>{t('popularDesc')}</p>
          </div>
        </div>
        <div className="popular-stats">
          <div className="stat-item">
            <div className="stat-number">{posts.length}</div>
            <div className="stat-label">{t('popularPosts')}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{t('monthly')}</div>
            <div className="stat-label">{t('updates')}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => fetchSpecialSubreddit('popular')} className="retry-button">
            {t('retry')}
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
          <div className="empty-icon">⭐</div>
          <h3>{t('noPopularPosts')}</h3>
          <p>{t('noPopularPostsDesc')}</p>
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
      <div className="popular-info-box">
        <h3>{t('aboutPopular')}</h3>
        <p>
          {t('aboutPopularDesc')}
        </p>
        <div className="info-stats">
          <div className="info-stat">
            <strong>100</strong>
            <span>{t('maxPosts')}</span>
          </div>
          <div className="info-stat">
            <strong>{t('monthly')}</strong>
            <span>{t('updateFreq')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popular; 
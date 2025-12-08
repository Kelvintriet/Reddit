import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useLanguageStore } from '../store/useLanguageStore';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './Feedback.css';

type FeedbackCategory = 'bugs' | 'ideas' | 'questions';
type FeedbackStatus = 'waiting' | 'working' | 'rejected' | 'done';

interface FeedbackPost {
    id: string;
    title: string;
    content: string;
    feedbackCategory: FeedbackCategory;
    isAnonymous?: boolean;
    isPrivate?: boolean;
    authorId: string;
    authorUsername?: string;
    createdAt: any;
    reactions?: { [emoji: string]: { count: number; users: string[] } };
    status?: FeedbackStatus;
}

const STATUS_COLORS: Record<FeedbackStatus, string> = {
    waiting: '#ffa500',
    working: '#0079d3',
    rejected: '#ea0027',
    done: '#46d160'
};

const Feedback: React.FC = () => {
    const { user } = useAuthStore();
    const { t } = useLanguageStore();
    const [activeTab, setActiveTab] = useState<FeedbackCategory>('ideas');
    const [posts, setPosts] = useState<FeedbackPost[]>([]);
    const [loading, setLoading] = useState(true);

    // Load posts when tab changes
    useEffect(() => {
        const loadPosts = async () => {
            try {
                setLoading(true);

                // Query posts from the feedbackPosts collection
                const postsRef = collection(db, 'feedbackPosts');
                const q = query(
                    postsRef,
                    where('feedbackCategory', '==', activeTab),
                    orderBy('createdAt', 'desc')
                );

                const snapshot = await getDocs(q);
                const fetchedPosts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as FeedbackPost));

                // Filter out private posts for non-authors
                const visiblePosts = fetchedPosts.filter(post => {
                    if (post.isPrivate && post.authorId !== user?.uid) {
                        return false;
                    }
                    return true;
                });

                setPosts(visiblePosts);
            } catch (error) {
                console.error('Error loading feedback posts:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPosts();
    }, [activeTab, user]);

    const getCategoryIcon = (category: FeedbackCategory) => {
        switch (category) {
            case 'bugs': return '🐛';
            case 'ideas': return '💡';
            case 'questions': return '❓';
        }
    };

    const getCategoryLabel = (category: FeedbackCategory) => {
        switch (category) {
            case 'bugs': return t('bugs');
            case 'ideas': return t('ideas');
            case 'questions': return t('questions');
        }
    };

    const getStatusLabel = (status: FeedbackStatus) => {
        switch (status) {
            case 'waiting': return t('statusWaiting');
            case 'working': return t('statusWorking');
            case 'rejected': return t('statusRejected');
            case 'done': return t('statusDone');
            default: return status;
        }
    };

    const getTopReactions = (reactions?: { [emoji: string]: { count: number; users: string[] } }) => {
        if (!reactions) return [];
        return Object.entries(reactions)
            .sort(([, a], [, b]) => b.count - a.count)
            .slice(0, 2)
            .map(([emoji, data]) => ({ emoji, count: data.count }));
    };

    return (
        <div className="feedback-page">
            <div className="feedback-container">
                <div className="feedback-header">
                    <h1>{t('feedbackTitle')}</h1>
                    <p>{t('feedbackDesc')}</p>
                    <Link to="/submit?subreddit=feedback" className="create-feedback-button">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        {t('createFeedback')}
                    </Link>
                </div>

                <div className="feedback-tabs">
                    {(['bugs', 'ideas', 'questions'] as FeedbackCategory[]).map(category => (
                        <button
                            key={category}
                            className={`feedback-tab ${activeTab === category ? 'active' : ''}`}
                            onClick={() => setActiveTab(category)}
                        >
                            <span className="tab-icon">{getCategoryIcon(category)}</span>
                            <span className="tab-label">{getCategoryLabel(category)}</span>
                        </button>
                    ))}
                </div>

                <div className="feedback-content">
                    {loading ? (
                        <div className="feedback-loading">{t('loading')}</div>
                    ) : posts.length === 0 ? (
                        <div className="feedback-empty">
                            <span className="empty-icon">{getCategoryIcon(activeTab)}</span>
                            <h3>{t('noFeedbackYet').replace('{type}', getCategoryLabel(activeTab).toLowerCase())}</h3>
                            <p>{t('beFirstFeedback')}</p>
                        </div>
                    ) : (
                        <div className="feedback-posts">
                            {posts.map(post => {
                                const topReactions = getTopReactions(post.reactions);
                                const status = post.status || 'waiting';

                                return (
                                    <Link
                                        key={post.id}
                                        to={`/r/feedback/post/${post.id}`}
                                        className="feedback-post"
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                    >
                                        <div className="post-left">
                                            <h3 className="post-title">
                                                {post.title.length > 60 ? post.title.substring(0, 60) + '...' : post.title}
                                            </h3>
                                            <div className="post-meta">
                                                {post.isAnonymous ? (
                                                    <span className="post-author anonymous">[deleted]</span>
                                                ) : (
                                                    <span className="post-author">
                                                        u/{post.authorUsername || 'Unknown'}
                                                    </span>
                                                )}
                                                <span className="post-date">
                                                    {post.createdAt?.toDate?.()?.toLocaleDateString() || t('justNow')}
                                                </span>
                                            </div>
                                            <div className="post-content-preview">
                                                {post.content?.replace(/<[^>]*>/g, '').substring(0, 80)}
                                                {post.content?.replace(/<[^>]*>/g, '').length > 80 && '...'}
                                            </div>
                                        </div>

                                        <div className="post-right">
                                            <div className="post-status" style={{ backgroundColor: STATUS_COLORS[status] }}>
                                                {getStatusLabel(status)}
                                            </div>
                                            {topReactions.length > 0 && (
                                                <div className="post-reactions-preview">
                                                    {topReactions.map(({ emoji, count }) => (
                                                        <div key={emoji} className="reaction-preview">
                                                            <span className="reaction-emoji">{emoji}</span>
                                                            <span className="reaction-count">{count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Feedback;

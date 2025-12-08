import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './FeedbackPostDetail.css';

const EMOJI_OPTIONS = ['👍', '👎', '❤️', '🎉', '😠', '❌', '✅', '🚀'];

interface FeedbackPost {
    id: string;
    title: string;
    content: string;
    contentType?: 'markdown' | 'html';
    feedbackCategory: 'bugs' | 'ideas' | 'questions';
    isAnonymous?: boolean;
    isPrivate?: boolean;
    authorId: string;
    authorUsername?: string;
    createdAt: any;
    reactions?: { [emoji: string]: { count: number; users: string[] } };
    tags?: string[];
    imageUrls?: string[];
    attachments?: any[];
}

const FeedbackPostDetail: React.FC = () => {
    const { postId } = useParams<{ postId: string }>();
    const { user } = useAuthStore();
    const [post, setPost] = useState<FeedbackPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPost = async () => {
            if (!postId) return;

            try {
                setLoading(true);
                const postRef = doc(db, 'feedbackPosts', postId);
                const postSnap = await getDoc(postRef);

                if (!postSnap.exists()) {
                    setError('Post not found');
                    return;
                }

                const postData = { id: postSnap.id, ...postSnap.data() } as FeedbackPost;

                // Check if private post and user has access
                if (postData.isPrivate && postData.authorId !== user?.uid) {
                    setError('This feedback is private');
                    return;
                }

                setPost(postData);
            } catch (err) {
                console.error('Error loading post:', err);
                setError('Failed to load post');
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [postId, user]);

    const handleReaction = async (emoji: string) => {
        if (!user || !post || !postId) {
            alert('Please log in to react');
            return;
        }

        try {
            const postRef = doc(db, 'feedbackPosts', postId);
            const reactions = post.reactions || {};

            // Check if user already reacted with a different emoji
            const userCurrentReaction = Object.keys(reactions).find(e =>
                reactions[e]?.users?.includes(user.uid)
            );

            // If user already reacted with this emoji, remove it
            if (userCurrentReaction === emoji) {
                const reaction = reactions[emoji];
                reaction.users = reaction.users.filter(id => id !== user.uid);
                reaction.count = Math.max(0, reaction.count - 1);
                if (reaction.count === 0) {
                    delete reactions[emoji];
                } else {
                    reactions[emoji] = reaction;
                }
            } else {
                // Remove previous reaction if exists
                if (userCurrentReaction) {
                    const oldReaction = reactions[userCurrentReaction];
                    oldReaction.users = oldReaction.users.filter(id => id !== user.uid);
                    oldReaction.count = Math.max(0, oldReaction.count - 1);
                    if (oldReaction.count === 0) {
                        delete reactions[userCurrentReaction];
                    } else {
                        reactions[userCurrentReaction] = oldReaction;
                    }
                }

                // Add new reaction
                const reaction = reactions[emoji] || { count: 0, users: [] };
                reaction.users.push(user.uid);
                reaction.count += 1;
                reactions[emoji] = reaction;
            }

            await updateDoc(postRef, { reactions });
            setPost({ ...post, reactions });
        } catch (err) {
            console.error('Error updating reaction:', err);
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'bugs': return '🐛';
            case 'ideas': return '💡';
            case 'questions': return '❓';
            default: return '📝';
        }
    };

    if (loading) {
        return (
            <div className="feedback-post-detail">
                <div className="loading">Loading...</div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="feedback-post-detail">
                <div className="error-container">
                    <h2>❌ {error || 'Post not found'}</h2>
                    <Link to="/r/feedback" className="back-link">← Back to Feedback</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="feedback-post-detail">
            <div className="post-container">
                <Link to="/r/feedback" className="back-link">← Back to Feedback</Link>

                <div className="post-header">
                    <div className="post-category">
                        {getCategoryIcon(post.feedbackCategory)} {post.feedbackCategory}
                    </div>
                    {post.isPrivate && (
                        <span className="private-badge">🔒 Private</span>
                    )}
                </div>

                <h1 className="post-title">{post.title}</h1>

                <div className="post-meta">
                    {post.isAnonymous ? (
                        <span className="post-author anonymous">[deleted]</span>
                    ) : (
                        <Link to={`/u/${post.authorId}`} className="post-author">
                            u/{post.authorUsername || 'Unknown'}
                        </Link>
                    )}
                    <span className="post-date">
                        {post.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                    </span>
                </div>

                {/* Images */}
                {post.imageUrls && post.imageUrls.length > 0 && (
                    <div className="post-images">
                        {post.imageUrls.map((url, index) => (
                            <img key={index} src={url} alt={`Image ${index + 1}`} className="post-image" />
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="post-content">
                    {post.contentType === 'markdown' ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {post.content}
                        </ReactMarkdown>
                    ) : post.contentType === 'html' ? (
                        <div dangerouslySetInnerHTML={{ __html: post.content }} />
                    ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{post.content}</div>
                    )}
                </div>

                {post.tags && post.tags.length > 0 && (
                    <div className="post-tags">
                        {post.tags.map((tag, index) => (
                            <span key={index} className="tag">{tag}</span>
                        ))}
                    </div>
                )}

                <div className="post-reactions">
                    <h3>Reactions</h3>
                    <div className="reactions-list">
                        {EMOJI_OPTIONS.map(emoji => {
                            const reaction = post.reactions?.[emoji];
                            const hasReacted = reaction?.users?.includes(user?.uid || '');
                            return (
                                <button
                                    key={emoji}
                                    className={`reaction-button ${hasReacted ? 'reacted' : ''}`}
                                    onClick={() => handleReaction(emoji)}
                                    title={`${reaction?.count || 0} reactions`}
                                >
                                    <span className="reaction-emoji">{emoji}</span>
                                    {reaction && reaction.count > 0 && (
                                        <span className="reaction-count">{reaction.count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackPostDetail;

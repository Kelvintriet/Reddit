import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Trash2, Reply as ReplyIcon, ChevronRight, Send } from 'lucide-react';
import { useAuthStore } from '../store';
import { getMessage, toggleStar, moveToTrash, getThreadMessages, sendReply } from '../collections/messages';
import { getUserProfile } from '../collections/users';
import type { Message } from '../collections/messages';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import './Inbox.css';

interface MessageNode extends Message {
    children: MessageNode[];
}

const MessageThread = () => {
    const { user } = useAuthStore();
    const { messageId } = useParams<{ messageId: string }>();
    const navigate = useNavigate();

    const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
    const [breadcrumb, setBreadcrumb] = useState<Message[]>([]);
    const [replies, setReplies] = useState<MessageNode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyBody, setReplyBody] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);

    useEffect(() => {
        loadMessageThread();
    }, [messageId]);

    const loadMessageThread = async () => {
        if (!messageId || !user) return;

        setIsLoading(true);
        try {
            const message = await getMessage(messageId);
            if (!message) {
                navigate('/inbox');
                return;
            }

            setCurrentMessage(message);

            // Build breadcrumb by traversing up the thread
            const breadcrumbPath: Message[] = [];
            let currentMsg = message;

            // Go up to find all parents
            while (currentMsg.replyToId) {
                const parentMsg = await getMessage(currentMsg.replyToId);
                if (parentMsg) {
                    breadcrumbPath.unshift(parentMsg);
                    currentMsg = parentMsg;
                } else {
                    break;
                }
            }

            // Add the original message if we haven't reached it
            if (!currentMsg.replyToId) {
                breadcrumbPath.unshift(currentMsg);
            }

            // Add current message to breadcrumb
            if (breadcrumbPath[breadcrumbPath.length - 1]?.id !== message.id) {
                breadcrumbPath.push(message);
            }

            setBreadcrumb(breadcrumbPath);

            // Load all thread messages and build tree
            const threadId = message.threadId || message.id;
            const allThreadMessages = await getThreadMessages(threadId);

            // Build nested structure - get direct replies to current message
            const directReplies = allThreadMessages.filter(m => m.replyToId === messageId);
            const repliesTree = buildMessageTree(directReplies, allThreadMessages);

            setReplies(repliesTree);
        } catch (error) {
            console.error('Error loading message thread:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const buildMessageTree = (messages: Message[], allMessages: Message[]): MessageNode[] => {
        return messages.map(msg => {
            const children = allMessages.filter(m => m.replyToId === msg.id);
            return {
                ...msg,
                children: buildMessageTree(children, allMessages)
            };
        });
    };

    const handleToggleStar = async () => {
        if (!currentMessage) return;

        try {
            await toggleStar(currentMessage.id, !currentMessage.isStarred);
            setCurrentMessage({ ...currentMessage, isStarred: !currentMessage.isStarred });
        } catch (error) {
            console.error('Error toggling star:', error);
        }
    };

    const handleDelete = async () => {
        if (!currentMessage) return;

        try {
            await moveToTrash(currentMessage.id);
            navigate('/inbox');
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const handleSendReply = async () => {
        if (!user || !currentMessage || !replyBody.trim()) return;

        setIsSendingReply(true);
        try {
            const userProfile = await getUserProfile(user.uid);

            await sendReply(
                currentMessage.id,
                user.uid,
                userProfile?.username || user.displayName || 'Anonymous',
                userProfile?.displayName || user.displayName || 'Anonymous',
                userProfile?.avatarUrl || user.photoURL || undefined,
                currentMessage.fromUserId,
                currentMessage.fromUsername,
                currentMessage.fromDisplayName,
                replyBody.trim()
            );

            setReplyBody('');
            setShowReplyForm(false);

            // Reload thread to show new reply
            await loadMessageThread();
        } catch (error) {
            console.error('Error sending reply:', error);
        } finally {
            setIsSendingReply(false);
        }
    };

    const renderMessageNode = (node: MessageNode, depth: number = 0) => {
        return (
            <div
                key={node.id}
                style={{
                    marginLeft: depth > 0 ? '32px' : '0',
                    marginBottom: '12px',
                    borderLeft: depth > 0 ? '2px solid #E5E5E5' : 'none',
                    paddingLeft: depth > 0 ? '16px' : '0'
                }}
            >
                <div
                    style={{
                        padding: '16px',
                        backgroundColor: '#F8F9FA',
                        borderRadius: '8px',
                        border: '1px solid #E5E5E5',
                        cursor: 'pointer',
                        transition: 'all 150ms'
                    }}
                    onClick={() => navigate(`/inbox/thread/${node.id}`)}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFF5F0';
                        e.currentTarget.style.borderColor = '#FF4500';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8F9FA';
                        e.currentTarget.style.borderColor = '#E5E5E5';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Avatar */}
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#FF4500',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            flexShrink: 0,
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}>
                            {node.fromAvatarUrl ? (
                                <img
                                    src={node.fromAvatarUrl}
                                    alt={node.fromDisplayName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                node.fromDisplayName.charAt(0).toUpperCase()
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#000000' }}>
                                    {node.fromDisplayName}
                                </span>
                                <span style={{ fontSize: '12px', color: '#999999' }}>
                                    @{node.fromUsername}
                                </span>
                                <span style={{ fontSize: '12px', color: '#999999' }}>
                                    •
                                </span>
                                <span style={{ fontSize: '12px', color: '#999999' }}>
                                    {formatDistanceToNow(node.createdAt, { addSuffix: true, locale: vi })}
                                </span>
                                {node.isStarred && (
                                    <>
                                        <span style={{ fontSize: '12px', color: '#999999' }}>
                                            •
                                        </span>
                                        <Star size={12} fill="#FFC107" color="#FFC107" />
                                    </>
                                )}
                            </div>

                            <div
                                style={{
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    marginBottom: '12px',
                                    color: '#000000'
                                }}
                            >
                                {node.body.length > 200 ? `${node.body.substring(0, 200)}...` : node.body}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                                {node.children.length > 0 && (
                                    <div style={{ fontSize: '12px', color: '#FF4500', fontWeight: 500 }}>
                                        {node.children.length} {node.children.length === 1 ? 'reply' : 'replies'}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                await toggleStar(node.id, !node.isStarred);
                                                await loadMessageThread();
                                            } catch (error) {
                                                console.error('Error toggling star:', error);
                                            }
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '12px',
                                            color: node.isStarred ? '#FFC107' : '#999999',
                                            transition: 'all 150ms'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        <Star size={14} fill={node.isStarred ? '#FFC107' : 'none'} />
                                    </button>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (confirm('Delete this reply?')) {
                                                try {
                                                    await moveToTrash(node.id);
                                                    await loadMessageThread();
                                                } catch (error) {
                                                    console.error('Error deleting reply:', error);
                                                }
                                            }
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '12px',
                                            color: '#999999',
                                            transition: 'all 150ms'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#FFF5F5';
                                            e.currentTarget.style.color = '#DC3545';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = '#999999';
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Render children */}
                {node.children.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        {node.children.map((child, index) => (
                            <div key={`${child.id}-${depth}-${index}`}>
                                {renderMessageNode(child, depth + 1)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="inbox-page">
                <div style={{
                    width: '100%',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFFFFF',
                    gap: '16px'
                }}>
                    <div className="inbox-spinner"></div>
                    <p style={{
                        fontSize: '14px',
                        color: '#666666',
                        margin: 0,
                        fontWeight: 500
                    }}>
                        Loading thread...
                    </p>
                </div>
            </div>
        );
    }

    if (!currentMessage) {
        return (
            <div className="inbox-page">
                <div style={{
                    width: '100%',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#FFFFFF',
                    gap: '16px'
                }}>
                    <p style={{
                        fontSize: '16px',
                        color: '#666666',
                        margin: 0
                    }}>
                        Message not found
                    </p>
                    <button
                        onClick={() => navigate('/inbox')}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#FF4500',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background 150ms'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#E63E00';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FF4500';
                        }}
                    >
                        Go to Inbox
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="inbox-page">
            <div className="inbox-message-detail" style={{ maxWidth: '100%', background: '#FFFFFF' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 24px',
                    borderBottom: '1px solid #E5E5E5',
                    background: '#FFFFFF'
                }}>
                    <button
                        onClick={() => navigate('/inbox')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            background: '#F8F9FA',
                            border: '1px solid #E5E5E5',
                            borderRadius: '6px',
                            color: '#666666',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 150ms'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FF4500';
                            e.currentTarget.style.borderColor = '#FF4500';
                            e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F8F9FA';
                            e.currentTarget.style.borderColor = '#E5E5E5';
                            e.currentTarget.style.color = '#666666';
                        }}
                    >
                        <ArrowLeft size={18} />
                        <span>Back</span>
                    </button>
                    <h2 style={{
                        flex: 1,
                        fontSize: '18px',
                        fontWeight: 600,
                        margin: 0,
                        color: '#000000'
                    }}>
                        {currentMessage.subject}
                    </h2>
                    <button
                        onClick={handleToggleStar}
                        title={currentMessage.isStarred ? 'Unstar' : 'Star'}
                        style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#F8F9FA',
                            border: '1px solid #E5E5E5',
                            borderRadius: '6px',
                            color: currentMessage.isStarred ? '#FFC107' : '#666666',
                            cursor: 'pointer',
                            transition: 'all 150ms'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FFF9E6';
                            e.currentTarget.style.borderColor = '#FFC107';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F8F9FA';
                            e.currentTarget.style.borderColor = '#E5E5E5';
                        }}
                    >
                        <Star
                            size={18}
                            fill={currentMessage.isStarred ? '#FFC107' : 'none'}
                            color={currentMessage.isStarred ? '#FFC107' : '#666666'}
                        />
                    </button>
                    <button
                        onClick={handleDelete}
                        title="Delete"
                        style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#F8F9FA',
                            border: '1px solid #E5E5E5',
                            borderRadius: '6px',
                            color: '#666666',
                            cursor: 'pointer',
                            transition: 'all 150ms'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#FFF5F5';
                            e.currentTarget.style.borderColor = '#DC3545';
                            e.currentTarget.style.color = '#DC3545';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F8F9FA';
                            e.currentTarget.style.borderColor = '#E5E5E5';
                            e.currentTarget.style.color = '#666666';
                        }}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    background: '#FFFFFF'
                }}>
                    {/* Breadcrumb Navigation */}
                    {breadcrumb.length > 1 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '16px',
                            backgroundColor: '#F8F9FA',
                            borderRadius: '8px',
                            marginBottom: '24px',
                            flexWrap: 'wrap',
                            fontSize: '13px',
                            overflowX: 'auto',
                            border: '1px solid #E5E5E5'
                        }}>
                            {breadcrumb.map((msg, index) => (
                                <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                        onClick={() => navigate(`/inbox/thread/${msg.id}`)}
                                        style={{
                                            background: msg.id === messageId ? '#FF4500' : 'transparent',
                                            color: msg.id === messageId ? '#FFFFFF' : '#FF4500',
                                            border: msg.id === messageId ? 'none' : '1px solid #FF4500',
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 150ms'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (msg.id !== messageId) {
                                                e.currentTarget.style.backgroundColor = '#FFF5F0';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (msg.id !== messageId) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        {msg.body.length > 30 ? `${msg.body.substring(0, 30)}...` : msg.body}
                                    </button>
                                    {index < breadcrumb.length - 1 && (
                                        <ChevronRight size={14} color="#999999" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Current Message */}
                    <div style={{
                        padding: '24px',
                        backgroundColor: '#F8F9FA',
                        borderRadius: '8px',
                        border: '1px solid #E5E5E5',
                        marginBottom: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '50%',
                                backgroundColor: '#FF4500',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                flexShrink: 0,
                                overflow: 'hidden'
                            }}>
                                {currentMessage.fromAvatarUrl ? (
                                    <img
                                        src={currentMessage.fromAvatarUrl}
                                        alt={currentMessage.fromDisplayName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    currentMessage.fromDisplayName.charAt(0).toUpperCase()
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: '#000000' }}>
                                    {currentMessage.fromDisplayName}
                                </div>
                                <div style={{ fontSize: '13px', color: '#666666', marginBottom: '8px' }}>
                                    @{currentMessage.fromUsername}
                                </div>
                                <div style={{ fontSize: '12px', color: '#999999' }}>
                                    {formatDistanceToNow(currentMessage.createdAt, { addSuffix: true, locale: vi })}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            fontSize: '15px',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: '#000000'
                        }}>
                            {currentMessage.body}
                        </div>
                    </div>

                    {/* Reply Button */}
                    <div style={{ marginBottom: '24px' }}>
                        {!showReplyForm ? (
                            <button
                                onClick={() => setShowReplyForm(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    backgroundColor: '#FF4500',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'background 150ms'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#E63E00';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#FF4500';
                                }}
                            >
                                <ReplyIcon size={18} />
                                Reply
                            </button>
                        ) : (
                            <div style={{
                                padding: '20px',
                                backgroundColor: '#F8F9FA',
                                borderRadius: '8px',
                                border: '1px solid #E5E5E5'
                            }}>
                                <textarea
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    placeholder="Write your reply..."
                                    rows={6}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid #E5E5E5',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        marginBottom: '12px',
                                        resize: 'vertical',
                                        backgroundColor: '#FFFFFF',
                                        color: '#000000',
                                        outline: 'none',
                                        transition: 'border 150ms'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#FF4500';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = '#E5E5E5';
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleSendReply}
                                        disabled={isSendingReply || !replyBody.trim()}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 20px',
                                            backgroundColor: '#FF4500',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '20px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: isSendingReply || !replyBody.trim() ? 'not-allowed' : 'pointer',
                                            opacity: isSendingReply || !replyBody.trim() ? 0.5 : 1,
                                            transition: 'background 150ms'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSendingReply && replyBody.trim()) {
                                                e.currentTarget.style.backgroundColor = '#E63E00';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#FF4500';
                                        }}
                                    >
                                        <Send size={16} />
                                        {isSendingReply ? 'Sending...' : 'Send Reply'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowReplyForm(false);
                                            setReplyBody('');
                                        }}
                                        disabled={isSendingReply}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: 'transparent',
                                            color: '#666666',
                                            border: '1px solid #E5E5E5',
                                            borderRadius: '20px',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            cursor: isSendingReply ? 'not-allowed' : 'pointer',
                                            transition: 'all 150ms'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSendingReply) {
                                                e.currentTarget.style.backgroundColor = '#F5F5F5';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Replies Section */}
                    {replies.length > 0 && (
                        <div>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                marginBottom: '16px',
                                color: '#666666',
                                paddingBottom: '12px',
                                borderBottom: '1px solid #E5E5E5'
                            }}>
                                {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
                            </div>
                            {replies.map((reply, index) => (
                                <div key={`reply-${reply.id}-${index}`}>
                                    {renderMessageNode(reply, 0)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageThread;

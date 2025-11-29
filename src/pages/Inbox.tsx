import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useMessagesStore } from '../store/useMessagesStore';
import { createReplyToken } from '../collections/messages';
import { Mail, Star, Archive, Send, Trash2, Search, ArrowLeft, MoreVertical, Reply, Forward, MailOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import './Inbox.css';

const Inbox = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const {
        messages,
        selectedMessage,
        unreadCount,
        isLoading,
        currentView,
        fetchInboxMessages,
        fetchSentMessages,
        fetchStarredMessages,
        fetchTrashedMessages,
        selectMessage,
        markMessageAsUnread,
        toggleMessageStar,
        moveMessageToTrash,
        archiveMessageAction,
        setCurrentView,
        subscribeToMessages,
        unsubscribeFromMessages,
        clearSelection
    } = useMessagesStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [expandedReplies, setExpandedReplies] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        if (user) {
            subscribeToMessages(user.uid);
        }

        return () => {
            unsubscribeFromMessages();
        };
    }, [user, subscribeToMessages, unsubscribeFromMessages]);

    const handleViewChange = async (view: 'inbox' | 'sent' | 'starred' | 'trash') => {
        if (!user) return;

        setCurrentView(view);

        switch (view) {
            case 'inbox':
                await fetchInboxMessages(user.uid);
                break;
            case 'sent':
                await fetchSentMessages(user.uid);
                break;
            case 'starred':
                await fetchStarredMessages(user.uid);
                break;
            case 'trash':
                await fetchTrashedMessages(user.uid);
                break;
        }
    };

    const handleMessageClick = (messageId: string) => {
        selectMessage(messageId);
    };

    const handleBack = () => {
        clearSelection();
    };

    const handleStar = () => {
        if (selectedMessage) {
            toggleMessageStar(selectedMessage.id, selectedMessage.isStarred);
        }
    };

    const handleMarkUnread = () => {
        if (selectedMessage) {
            markMessageAsUnread(selectedMessage.id);
        }
    };

    const handleArchive = () => {
        if (selectedMessage) {
            archiveMessageAction(selectedMessage.id);
        }
    };

    const handleDelete = () => {
        if (selectedMessage) {
            moveMessageToTrash(selectedMessage.id);
        }
    };

    const handleReply = async () => {
        if (selectedMessage && user) {
            try {
                // Generate reply token
                const token = await createReplyToken(selectedMessage.id, user.uid);
                // Navigate to secure reply page
                navigate(`/reply/${token}/${selectedMessage.fromUsername || 'user'}`);
            } catch (error) {
                console.error('Error creating reply token:', error);
            }
        }
    };

    const filteredMessages = messages.filter(msg =>
        msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (currentView === 'inbox' ? msg.fromDisplayName : msg.toDisplayName).toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getUnreadInboxCount = () => {
        return currentView === 'inbox' ? unreadCount : 0;
    };

    const getStarredCount = () => {
        return messages.filter(m => m.isStarred).length;
    };

    if (!user) {
        return (
            <div className="inbox-container">
                <div className="inbox-empty">
                    <Mail size={48} />
                    <h2>Vui lòng đăng nhập để xem tin nhắn</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="inbox-container">
            {/* Sidebar */}
            <div className="inbox-sidebar">
                <div className="inbox-sidebar-header">
                    <Mail size={24} />
                    <h2>Hộp thư</h2>
                </div>

                <button className="inbox-compose-btn" onClick={() => navigate('/compose')}>
                    Soạn tin nhắn
                </button>

                <nav className="inbox-nav">
                    <button
                        className={`inbox-nav-item ${currentView === 'inbox' ? 'active' : ''}`}
                        onClick={() => handleViewChange('inbox')}
                    >
                        <Mail size={20} />
                        <span>Hộp thư đến</span>
                        {getUnreadInboxCount() > 0 && (
                            <span className="inbox-badge">{getUnreadInboxCount()}</span>
                        )}
                    </button>

                    <button
                        className={`inbox-nav-item ${currentView === 'starred' ? 'active' : ''}`}
                        onClick={() => handleViewChange('starred')}
                    >
                        <Star size={20} />
                        <span>Đã gắn sao</span>
                        {currentView !== 'starred' && getStarredCount() > 0 && (
                            <span className="inbox-badge">{getStarredCount()}</span>
                        )}
                    </button>

                    <button
                        className={`inbox-nav-item ${currentView === 'sent' ? 'active' : ''}`}
                        onClick={() => handleViewChange('sent')}
                    >
                        <Send size={20} />
                        <span>Đã gửi</span>
                    </button>

                    <button
                        className={`inbox-nav-item ${currentView === 'trash' ? 'active' : ''}`}
                        onClick={() => handleViewChange('trash')}
                    >
                        <Trash2 size={20} />
                        <span>Thùng rác</span>
                    </button>
                </nav>
            </div>

            {/* Message List */}
            <div className="inbox-message-list">
                <div className="inbox-list-header">
                    <h3>
                        {currentView === 'inbox' && 'Hộp thư đến'}
                        {currentView === 'sent' && 'Đã gửi'}
                        {currentView === 'starred' && 'Đã gắn sao'}
                        {currentView === 'trash' && 'Thùng rác'}
                        {filteredMessages.length > 0 && ` (${filteredMessages.length})`}
                    </h3>

                    <div className="inbox-search">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="inbox-list-items">
                    {isLoading && (
                        <div className="inbox-loading">
                            <div className="inbox-spinner"></div>
                            <p>Đang tải tin nhắn...</p>
                        </div>
                    )}

                    {!isLoading && filteredMessages.length === 0 && (
                        <div className="inbox-empty-list">
                            <Mail size={48} />
                            <p>Không có tin nhắn</p>
                        </div>
                    )}

                    {!isLoading && filteredMessages.map((message, index) => (
                        <div
                            key={`${currentView}-${message.id}-${index}`}
                            className={`inbox-message-item ${!message.isRead && currentView === 'inbox' ? 'unread' : ''} ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                            onClick={() => handleMessageClick(message.id)}
                        >
                            <div className="inbox-message-item-left">
                                {!message.isRead && currentView === 'inbox' && (
                                    <div className="inbox-unread-dot"></div>
                                )}
                                <button
                                    className={`inbox-star-btn ${message.isStarred ? 'starred' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleMessageStar(message.id, message.isStarred);
                                    }}
                                >
                                    <Star size={16} fill={message.isStarred ? '#FFC107' : 'none'} />
                                </button>
                            </div>

                            <div className="inbox-message-item-content">
                                <div className="inbox-message-item-header">
                                    <span className="inbox-message-sender">
                                        {currentView === 'inbox' || currentView === 'starred'
                                            ? message.fromDisplayName
                                            : `Đến: ${message.toDisplayName}`}
                                    </span>
                                    <span className="inbox-message-time">
                                        {formatDistanceToNow(message.createdAt, { addSuffix: true, locale: vi })}
                                    </span>
                                </div>

                                <div className="inbox-message-subject">
                                    {message.subject || '(Không có tiêu đề)'}
                                </div>

                                <div className="inbox-message-preview">
                                    {message.body.substring(0, 100)}...
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Message Detail */}
            <div className="inbox-message-detail">
                {selectedMessage ? (
                    <>
                        <div className="inbox-detail-actions">
                            <button className="inbox-icon-btn" onClick={handleBack}>
                                <ArrowLeft size={20} />
                            </button>
                            <button className="inbox-icon-btn" onClick={handleArchive}>
                                <Archive size={20} />
                            </button>
                            <button className="inbox-icon-btn" onClick={handleDelete}>
                                <Trash2 size={20} />
                            </button>
                            <button className="inbox-icon-btn" onClick={handleMarkUnread}>
                                <MailOpen size={20} />
                            </button>
                            <button className="inbox-icon-btn" onClick={handleStar}>
                                <Star size={20} fill={selectedMessage.isStarred ? '#FFC107' : 'none'} />
                            </button>
                            <button
                                className="inbox-icon-btn inbox-thread-btn"
                                onClick={() => navigate(`/inbox/thread/${selectedMessage.id}`)}
                                title="Open as thread"
                            >
                                <Reply size={20} />
                                <span>Open Thread</span>
                            </button>
                            <button className="inbox-icon-btn">
                                <MoreVertical size={20} />
                            </button>
                        </div>

                        <div className="inbox-detail-content">
                            <div className="inbox-detail-header">
                                <div className="inbox-detail-sender">
                                    <div className="inbox-sender-avatar">
                                        {selectedMessage.fromAvatarUrl ? (
                                            <img src={selectedMessage.fromAvatarUrl} alt={selectedMessage.fromDisplayName} />
                                        ) : (
                                            <div className="inbox-sender-avatar-placeholder">
                                                {selectedMessage.fromDisplayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="inbox-sender-info">
                                        <div className="inbox-sender-name">{selectedMessage.fromDisplayName}</div>
                                        <div className="inbox-sender-email">@{selectedMessage.fromUsername}</div>
                                    </div>
                                </div>

                                <div className="inbox-detail-meta">
                                    <span className="inbox-detail-time">
                                        {formatDistanceToNow(selectedMessage.createdAt, { addSuffix: true, locale: vi })}
                                    </span>
                                </div>
                            </div>

                            <div className="inbox-detail-subject">
                                {selectedMessage.subject || '(Không có tiêu đề)'}
                            </div>

                            <div className="inbox-detail-body">
                                {selectedMessage.body}
                            </div>

                            {/* Thread Replies - Gmail Style */}
                            {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                                <div className="inbox-thread-replies" style={{ marginTop: '24px', borderTop: '1px solid var(--color-neutral-border-weak)', paddingTop: '16px' }}>
                                    <div style={{
                                        fontSize: '13px',
                                        color: 'var(--color-neutral-content-weak)',
                                        marginBottom: '12px',
                                        fontWeight: 500
                                    }}>
                                        {selectedMessage.replies.length} {selectedMessage.replies.length === 1 ? 'phản hồi' : 'phản hồi'}
                                    </div>

                                    {selectedMessage.replies.map((reply) => (
                                        <div
                                            key={reply.id}
                                            style={{
                                                marginBottom: '12px',
                                                padding: '12px',
                                                backgroundColor: 'var(--color-neutral-background-weak)',
                                                borderRadius: '8px',
                                                border: '1px solid var(--color-neutral-border-weak)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onClick={() => navigate(`/inbox/thread/${reply.id}`)}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--color-neutral-background)';
                                                e.currentTarget.style.borderColor = 'var(--color-neutral-border)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--color-neutral-background-weak)';
                                                e.currentTarget.style.borderColor = 'var(--color-neutral-border-weak)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--color-neutral-border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                    flexShrink: 0
                                                }}>
                                                    {reply.fromAvatarUrl ? (
                                                        <img
                                                            src={reply.fromAvatarUrl}
                                                            alt={reply.fromDisplayName}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                                            {reply.fromDisplayName.charAt(0).toUpperCase()}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '14px' }}>
                                                            {reply.fromDisplayName}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
                                                            @{reply.fromUsername}
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
                                                            •
                                                        </span>
                                                        <span style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
                                                            {formatDistanceToNow(reply.createdAt, { addSuffix: true, locale: vi })}
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '14px',
                                                            lineHeight: '1.5',
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word'
                                                        }}
                                                        onClick={(e) => {
                                                            // Prevent navigation when clicking "Xem thêm"
                                                            if (e.target instanceof HTMLButtonElement) {
                                                                e.stopPropagation();
                                                            }
                                                        }}
                                                    >
                                                        {expandedReplies[reply.id] ? reply.body : (
                                                            reply.body.length > 200 ? (
                                                                <>
                                                                    {reply.body.substring(0, 200)}...
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setExpandedReplies(prev => ({ ...prev, [reply.id]: true }));
                                                                        }}
                                                                        style={{
                                                                            marginLeft: '4px',
                                                                            color: 'var(--color-primary)',
                                                                            background: 'none',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            fontSize: '13px',
                                                                            fontWeight: 500
                                                                        }}
                                                                    >
                                                                        Xem thêm
                                                                    </button>
                                                                </>
                                                            ) : reply.body
                                                        )}
                                                    </div>
                                                    <div style={{
                                                        marginTop: '8px',
                                                        fontSize: '12px',
                                                        color: 'var(--color-primary)',
                                                        fontWeight: 500
                                                    }}>
                                                        Click to view thread →
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="inbox-detail-reply-actions">
                                <button
                                    className="inbox-reply-btn"
                                    onClick={handleReply}
                                >
                                    <Reply size={18} />
                                    Trả lời
                                </button>
                                <button
                                    className="inbox-reply-btn"
                                    onClick={() => navigate(`/compose?subject=Fwd: ${encodeURIComponent(selectedMessage.subject)}`)}
                                >
                                    <Forward size={18} />
                                    Chuyển tiếp
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="inbox-detail-empty">
                        <Mail size={64} />
                        <h3>Chọn tin nhắn để đọc</h3>
                        <p>Chọn một tin nhắn từ danh sách để xem nội dung</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inbox;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    messages,
    sentMessages,
    conversations,
    unreadCount,
    isLoading,
    error,
    fetchInboxMessages,
    fetchSentMessages,
    fetchConversations,
    markAsRead,
    deleteMessage,
    subscribeToMessages,
    unsubscribeFromMessages,
    clearError
  } = useMessagesStore();

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'conversations' | 'system'>('inbox');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    content: ''
  });
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Initial data fetch
    fetchInboxMessages();
    fetchSentMessages();
    fetchConversations();

    // Subscribe to real-time updates
    subscribeToMessages();

    // Check for compose hash
    if (location.hash === '#compose') {
      setShowCompose(true);
    }

    // Cleanup subscription on unmount
    return () => {
      unsubscribeFromMessages();
    };
  }, [user, navigate, location.hash]);

  const handleTabChange = (tab: 'inbox' | 'sent' | 'conversations' | 'system') => {
    setActiveTab(tab);
    setSelectedMessages([]);
    clearError();
  };

  const handleComposeOpen = () => {
    setShowCompose(true);
    window.history.pushState(null, '', '/inbox#compose');
  };

  const handleComposeClose = () => {
    setShowCompose(false);
    setComposeData({ to: '', subject: '', content: '' });
    setShowAttachmentMenu(false);
    window.history.pushState(null, '', '/inbox');
  };

  const handleComposeSend = async () => {
    if (!composeData.to.trim() || !composeData.subject.trim() || !composeData.content.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsSending(true);
    try {
      // In a real app, you'd send the message here
      console.log('Sending message:', composeData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      handleComposeClose();
      alert('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageClick = async (messageId: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(messageId);
    }
    navigate(`/message/${messageId}`);
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    const currentMessages = activeTab === 'inbox' ? messages : sentMessages;
    if (selectedMessages.length === currentMessages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(currentMessages.map(msg => msg.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMessages.length === 0) return;
    
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedMessages.length} tin nhắn?`)) {
      try {
        await Promise.all(selectedMessages.map(id => deleteMessage(id)));
        setSelectedMessages([]);
        
        // Refresh current tab
        if (activeTab === 'inbox') {
          fetchInboxMessages();
        } else if (activeTab === 'sent') {
          fetchSentMessages();
        }
      } catch (error) {
        console.error('Error deleting messages:', error);
      }
    }
  };

  const formatMessageTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: vi });
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  // System messages (app updates, bot messages)
  const systemMessages = [
    {
      id: 'sys-1',
      type: 'update',
      title: 'New App Version Available',
      content: 'Version 2.1.0 is now available with improved messaging features and bug fixes.',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      isRead: false
    },
    {
      id: 'sys-2',
      type: 'bot',
      title: 'Bot Message from r/technology',
      content: 'Your post has been automatically approved by our moderation bot.',
      createdAt: new Date(Date.now() - 172800000), // 2 days ago
      isRead: true
    }
  ];

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  const getFilteredMessages = () => {
    const currentMessages = activeTab === 'inbox' ? messages :
                           activeTab === 'sent' ? sentMessages :
                           activeTab === 'system' ? systemMessages : [];

    if (activeFilter === 'unread') {
      return currentMessages.filter(msg => !msg.isRead);
    }
    return currentMessages;
  };

  if (!user) {
    return (
      <div className="inbox-container">
        <div className="auth-required">
          <h2>Đăng nhập để xem tin nhắn</h2>
          <Link to="/login" className="login-button">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-container">
      {/* Left Sidebar */}
      <div className="inbox-sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <button onClick={handleComposeOpen} className="new-message-btn">
            <span className="new-message-icon">✏️</span>
            New Message
          </button>
        </div>

        {/* Navigation */}
        <div className="inbox-nav">
          <div className="nav-section">
            <button
              className={`nav-item ${activeTab === 'inbox' ? 'active' : ''}`}
              onClick={() => handleTabChange('inbox')}
            >
              <span className="nav-icon">📥</span>
              Inbox
              {unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}
            </button>
            <button
              className={`nav-item ${activeTab === 'sent' ? 'active' : ''}`}
              onClick={() => handleTabChange('sent')}
            >
              <span className="nav-icon">📤</span>
              Sent
            </button>
            <button
              className={`nav-item ${activeTab === 'conversations' ? 'active' : ''}`}
              onClick={() => handleTabChange('conversations')}
            >
              <span className="nav-icon">💬</span>
              Conversations
            </button>
            <button
              className={`nav-item ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => handleTabChange('system')}
            >
              <span className="nav-icon">🔔</span>
              System Messages
              {systemMessages.filter(msg => !msg.isRead).length > 0 && (
                <span className="nav-count">{systemMessages.filter(msg => !msg.isRead).length}</span>
              )}
            </button>
          </div>

          {/* Recent Chats */}
          <div className="recent-chats">
            <div className="recent-chats-title">
              Recent Chats
              <button onClick={handleComposeOpen} className="start-chat-btn">+</button>
            </div>
            {conversations.slice(0, 5).map(conversation => {
              const otherUserId = conversation.participants.find(id => id !== user.uid);
              const otherUsername = conversation.participantUsernames.find(username =>
                username !== (user.username || user.displayName)
              );
              const unreadForUser = conversation.unreadCount[user.uid] || 0;

              return (
                <div
                  key={conversation.id}
                  className="chat-item"
                  onClick={() => navigate(`/conversation/${otherUserId}`)}
                >
                  <div className={`chat-avatar ${Math.random() > 0.5 ? 'online' : ''}`}>
                    {otherUsername?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">{otherUsername}</div>
                    <div className="chat-status">
                      {formatMessageTime(conversation.lastMessageAt)}
                    </div>
                  </div>
                  {unreadForUser > 0 && (
                    <div className="chat-notification">{unreadForUser}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="inbox-content">
        {/* Top Header */}
        <div className="inbox-header">
          <div className="header-search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search from Message"
            />
            <span className="search-dropdown">▼</span>
          </div>
          <div className="header-actions">
            <button className="theme-toggle">☀️</button>
            <button className="refresh-btn">🔄</button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <div className="filter-list">
            <button
              className={`filter-item ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              <span className="filter-dot"></span>
              All Messages
              <span className="filter-count">
                {activeTab === 'inbox' ? messages.length :
                 activeTab === 'sent' ? sentMessages.length :
                 activeTab === 'system' ? systemMessages.length :
                 conversations.length}
              </span>
            </button>
            <button
              className={`filter-item ${activeFilter === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveFilter('unread')}
            >
              <span className="filter-dot"></span>
              Unread
              <span className="filter-count">
                {activeTab === 'system' ? systemMessages.filter(msg => !msg.isRead).length : unreadCount}
              </span>
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="messages-list">
          {error && (
            <div className="error-message">
              <span>{error}</span>
              <button onClick={clearError}>✕</button>
            </div>
          )}

          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading messages...</p>
            </div>
          ) : activeTab === 'conversations' ? (
            <div className="conversations-list">
              {conversations.length === 0 ? (
                <div className="empty-state">
                  <h3>No conversations</h3>
                  <p>Start a new conversation to see it here</p>
                </div>
              ) : (
                conversations.map(conversation => {
                  const otherUserId = conversation.participants.find(id => id !== user.uid);
                  const otherUsername = conversation.participantUsernames.find(username =>
                    username !== (user.username || user.displayName)
                  );
                  const unreadForUser = conversation.unreadCount[user.uid] || 0;

                  return (
                    <div
                      key={conversation.id}
                      className={`message-item ${unreadForUser > 0 ? 'unread' : ''}`}
                      onClick={() => navigate(`/conversation/${otherUserId}`)}
                    >
                      <div className="message-avatar online">
                        {otherUsername?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="message-content">
                        <div className="message-header">
                          <div className="message-sender">{otherUsername}</div>
                          <div className="message-time">
                            {formatMessageTime(conversation.lastMessageAt)}
                          </div>
                        </div>
                        <div className="message-preview">{truncateContent(conversation.lastMessage)}</div>
                      </div>
                      {unreadForUser > 0 && (
                        <div className="chat-notification">{unreadForUser}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : activeTab === 'system' ? (
            <div className="system-messages-list">
              {getFilteredMessages().length === 0 ? (
                <div className="empty-state">
                  <h3>No system messages</h3>
                  <p>System updates and bot messages will appear here</p>
                </div>
              ) : (
                getFilteredMessages().map((message: any) => (
                  <div
                    key={message.id}
                    className={`message-item system-message ${!message.isRead ? 'unread' : ''}`}
                  >
                    <div className="message-avatar system">
                      {message.type === 'update' ? '🔄' : '🤖'}
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <div className="message-sender">{message.title}</div>
                        {!message.isRead && (
                          <span className="message-badge new">NEW</span>
                        )}
                      </div>
                      <div className="message-preview">{truncateContent(message.content)}</div>
                    </div>
                    <div className="message-meta">
                      <div className="message-time">
                        {formatMessageTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="date-separator">Today</div>
              {getFilteredMessages().length === 0 ? (
                <div className="empty-state">
                  <h3>No messages</h3>
                  <p>Your {activeTab} is empty</p>
                </div>
              ) : (
                getFilteredMessages().map((message: any, index: number) => {
                  const allMessages = getFilteredMessages();
                  const showDateSeparator = index > 0 &&
                    new Date(message.createdAt).toDateString() !==
                    new Date(allMessages[index - 1].createdAt).toDateString();

                  return (
                    <React.Fragment key={message.id}>
                      {showDateSeparator && (
                        <div className="date-separator">Yesterday</div>
                      )}
                      <div
                        className={`message-item ${!message.isRead && activeTab === 'inbox' ? 'unread' : ''}`}
                        onClick={() => handleMessageClick(message.id, message.isRead)}
                      >
                        <div className="message-avatar online">
                          {(activeTab === 'inbox' ? message.senderUsername : message.receiverUsername)?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="message-content">
                          <div className="message-header">
                            <div className="message-sender">
                              {activeTab === 'inbox' ? message.senderUsername : message.receiverUsername}
                            </div>
                            <div className="message-subject">{message.subject}</div>
                            {!message.isRead && activeTab === 'inbox' && (
                              <span className="message-badge new">NEW</span>
                            )}
                          </div>
                          <div className="message-preview">
                            {activeTab === 'sent' ? 'You: ' : ''}{truncateContent(message.content)}
                          </div>
                        </div>
                        <div className="message-meta">
                          <div className="message-time">
                            {formatMessageTime(message.createdAt)}
                          </div>
                          <div className="message-actions">
                            <button className="message-action-btn" title="Archive">📁</button>
                            <button className="message-action-btn" title="Delete">🗑️</button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* Compose Popup Overlay */}
      {showCompose && (
        <div className="compose-overlay">
          <div className="compose-popup">
            <div className="compose-header">
              <div className="compose-title">
                <span className="compose-icon">✉️</span>
                New Message
              </div>
              <div className="compose-actions">
                <button className="compose-minimize">−</button>
                <button className="compose-expand">⛶</button>
                <button onClick={handleComposeClose} className="compose-close">✕</button>
              </div>
            </div>

            <div className="compose-form">
              <div className="compose-field">
                <label>To</label>
                <input
                  type="text"
                  value={composeData.to}
                  onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                  placeholder="Enter username"
                />
                <button className="cc-bcc-btn">Cc Bcc</button>
              </div>

              <div className="compose-field">
                <label>Subject</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                  placeholder="Subject"
                />
              </div>

              <div className="compose-body">
                <textarea
                  value={composeData.content}
                  onChange={(e) => setComposeData({...composeData, content: e.target.value})}
                  placeholder="Compose your message..."
                  rows={12}
                />
              </div>

              <div className="compose-toolbar">
                <button
                  onClick={handleComposeSend}
                  disabled={isSending}
                  className="send-btn"
                >
                  {isSending ? 'Sending...' : 'Send'}
                </button>

                <div className="compose-tools">
                  <button
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className="tool-btn attachment-btn"
                  >
                    📎
                  </button>
                  <button className="tool-btn">🔗</button>
                  <button className="tool-btn">😊</button>
                  <button className="tool-btn">⚠️</button>
                  <button className="tool-btn">🖼️</button>
                  <button className="tool-btn">🔒</button>
                  <button className="tool-btn">✏️</button>
                  <button className="tool-btn">⋮</button>
                </div>

                <button className="delete-draft-btn">🗑️</button>
              </div>

              {/* Attachment Menu */}
              {showAttachmentMenu && (
                <div className="attachment-menu">
                  <div className="attachment-option">
                    <span className="attachment-icon">📁</span>
                    My Drive
                  </div>
                  <div className="attachment-option">
                    <span className="attachment-icon">📤</span>
                    Upload
                  </div>
                  <div className="attachment-option">
                    <span className="attachment-icon">📷</span>
                    Insert photo
                  </div>
                  <div className="attachment-option">
                    <span className="attachment-icon">📹</span>
                    Insert video
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;

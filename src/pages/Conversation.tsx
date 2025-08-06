import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { getUserProfile } from '../collections/users';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const Conversation: React.FC = () => {
  const { userId: otherUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentConversation, 
    fetchConversation, 
    sendMessage, 
    markAsRead,
    isLoading 
  } = useMessagesStore();

  const [otherUser, setOtherUser] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!otherUserId) {
      navigate('/inbox');
      return;
    }

    fetchOtherUser();
    fetchConversation(otherUserId);
  }, [user, otherUserId, navigate]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    scrollToBottom();
  }, [currentConversation]);

  useEffect(() => {
    // Mark unread messages as read
    const unreadMessages = currentConversation.filter(
      msg => !msg.isRead && msg.receiverId === user?.uid
    );

    unreadMessages.forEach(msg => {
      markAsRead(msg.id);
    });
  }, [currentConversation, user, markAsRead]);

  const fetchOtherUser = async () => {
    if (!otherUserId) return;

    try {
      const userProfile = await getUserProfile(otherUserId);
      setOtherUser(userProfile);
    } catch (error) {
      console.error('Error fetching other user:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !otherUser || isSending) return;

    setIsSending(true);
    try {
      await sendMessage({
        receiverId: otherUserId!,
        receiverUsername: otherUser.username || otherUser.displayName,
        subject: 'Tin nhắn trò chuyện',
        content: newMessage.trim()
      });

      setNewMessage('');
      // Refresh conversation
      await fetchConversation(otherUserId!);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Có lỗi xảy ra khi gửi tin nhắn');
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const groupMessagesByDate = (messages: any[]) => {
    const groups: { [key: string]: any[] } = {};
    
    messages.forEach(message => {
      const dateKey = message.createdAt.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    
    return groups;
  };

  if (!user) {
    return (
      <div className="conversation-container">
        <div className="auth-required">
          <h2>Đăng nhập để xem cuộc trò chuyện</h2>
          <Link to="/login" className="login-button">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  if (isLoading && !otherUser) {
    return (
      <div className="conversation-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Đang tải cuộc trò chuyện...</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(currentConversation);

  return (
    <div className="reddit-conversation">
      {/* Header */}
      <div className="conversation-header">
        <button
          onClick={() => navigate('/inbox')}
          className="back-btn"
        >
          ←
        </button>

        <div className="contact-info">
          <div className="contact-avatar">
            {otherUser ? (otherUser.username || otherUser.displayName)?.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="contact-details">
            <div className="contact-name">
              {otherUser ? (otherUser.username || otherUser.displayName) : 'Loading...'}
            </div>
            <div className="contact-status">Online</div>
          </div>
        </div>

        <div className="header-actions">
          <button className="header-action-btn">📞</button>
          <button className="header-action-btn">📹</button>
          <button className="header-action-btn">⋮</button>
        </div>
      </div>

      {/* Date Header */}
      <div className="date-header">
        <span className="date-badge">Thu, Apr 2024</span>
      </div>

      {/* Messages */}
      <div className="conversation-messages">
        {Object.keys(messageGroups).length === 0 ? (
          <div className="empty-conversation">
            <div className="empty-icon">💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([dateKey, messages]) => (
            <div key={dateKey} className="message-group">
              {messages.map((message, index) => {
                const isOwnMessage = message.senderId === user.uid;
                const showTime = index === messages.length - 1 ||
                  (index < messages.length - 1 &&
                   new Date(messages[index + 1].createdAt).getTime() - new Date(message.createdAt).getTime() > 300000);

                return (
                  <div
                    key={message.id}
                    className={`conversation-message ${isOwnMessage ? 'sent' : 'received'}`}
                  >
                    {!isOwnMessage && (
                      <div className="message-avatar">
                        {otherUser?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}

                    <div className="message-content">
                      {!isOwnMessage && (
                        <div className="sender-name">
                          {otherUser?.username || 'User'}
                        </div>
                      )}

                      <div className="message-text">
                        {message.content}
                      </div>

                      {showTime && (
                        <div className="message-time">
                          {formatMessageTime(message.createdAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="conversation-input-container">
        <div className="input-wrapper">
          <button className="attachment-btn">📎</button>
          <form onSubmit={handleSendMessage} className="message-form">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message here..."
              className="message-input"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="send-btn"
            >
              {isSending ? '⏳' : 'Send ➤'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Conversation;

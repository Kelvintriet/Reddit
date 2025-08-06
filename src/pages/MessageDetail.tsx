import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Local interface definition to avoid import issues
interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  receiverId: string;
  receiverUsername: string;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  type: 'message' | 'system' | 'notification';
  parentMessageId?: string;
  isDeleted: boolean;
  deletedBy?: string[];
}

const MessageDetail: React.FC = () => {
  const { messageId } = useParams<{ messageId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { markAsRead, deleteMessage } = useMessagesStore();

  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showForwardForm, setShowForwardForm] = useState(false);
  const [forwardRecipients, setForwardRecipients] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!messageId) {
      navigate('/inbox');
      return;
    }

    fetchMessage();
  }, [messageId, user, navigate]);

  const fetchMessage = async () => {
    if (!messageId) return;

    try {
      setIsLoading(true);
      const messageRef = doc(db, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);

      if (!messageSnap.exists()) {
        setError('Tin nhắn không tồn tại');
        return;
      }

      const messageData = messageSnap.data();
      const messageObj: Message = {
        id: messageSnap.id,
        ...messageData,
        createdAt: messageData.createdAt?.toDate() || new Date(),
        updatedAt: messageData.updatedAt?.toDate() || new Date()
      } as Message;

      // Check if user has permission to view this message
      if (messageObj.senderId !== user?.uid && messageObj.receiverId !== user?.uid) {
        setError('Bạn không có quyền xem tin nhắn này');
        return;
      }

      setMessage(messageObj);

      // Mark as read if user is the receiver and message is unread
      if (messageObj.receiverId === user?.uid && !messageObj.isRead) {
        await markAsRead(messageId);
        setMessage(prev => prev ? { ...prev, isRead: true } : null);
      }
    } catch (error) {
      console.error('Error fetching message:', error);
      setError('Có lỗi xảy ra khi tải tin nhắn');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async () => {
    if (!message || !replyContent.trim()) return;

    setIsReplying(true);
    try {
      const { sendMessage } = useMessagesStore.getState();
      
      await sendMessage({
        receiverId: message.senderId,
        receiverUsername: message.senderUsername,
        subject: `Re: ${message.subject}`,
        content: replyContent.trim()
      });

      setReplyContent('');
      setShowReplyForm(false);
      alert('Phản hồi đã được gửi!');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Có lỗi xảy ra khi gửi phản hồi');
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async () => {
    if (!message) return;

    if (confirm('Bạn có chắc chắn muốn xóa tin nhắn này?')) {
      try {
        await deleteMessage(message.id);
        navigate('/inbox');
      } catch (error) {
        console.error('Error deleting message:', error);
        alert('Có lỗi xảy ra khi xóa tin nhắn');
      }
    }
  };

  const formatMessageTime = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true, locale: vi });
  };

  const handleForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message || !forwardRecipients.trim()) return;

    setIsForwarding(true);
    try {
      const { sendMessage } = useMessagesStore.getState();
      const recipients = forwardRecipients.split(',').map(r => r.trim()).filter(r => r);

      for (const recipient of recipients) {
        await sendMessage({
          receiverId: recipient, // In real app, you'd resolve username to userId
          receiverUsername: recipient,
          subject: `Fwd: ${message.subject}`,
          content: `---------- Forwarded message ----------\nFrom: ${message.senderUsername}\nSubject: ${message.subject}\n\n${message.content}`
        });
      }

      setForwardRecipients('');
      setShowForwardForm(false);
      alert('Message forwarded successfully!');
    } catch (error) {
      console.error('Error forwarding message:', error);
      alert('Error forwarding message');
    } finally {
      setIsForwarding(false);
    }
  };

  const handleEmojiReaction = (emoji: string) => {
    // In a real app, you'd save this reaction to the database
    console.log(`Reacted with ${emoji} to message ${message?.id}`);
    setShowEmojiPicker(false);
    // You could show a toast notification here
  };

  if (!user) {
    return (
      <div className="message-detail-container">
        <div className="auth-required">
          <h2>Đăng nhập để xem tin nhắn</h2>
          <Link to="/login" className="login-button">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="message-detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Đang tải tin nhắn...</p>
        </div>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="message-detail-container">
        <div className="error-state">
          <h2>❌ {error || 'Tin nhắn không tồn tại'}</h2>
          <Link to="/inbox" className="back-button">← Quay lại hộp thư</Link>
        </div>
      </div>
    );
  }

  const isReceiver = message.receiverId === user.uid;
  const otherUser = isReceiver ? message.senderUsername : message.receiverUsername;

  return (
    <div className="gmail-message-detail">
      {/* Top Toolbar */}
      <div className="gmail-toolbar">
        <div className="toolbar-left">
          <button onClick={() => navigate('/inbox')} className="toolbar-btn back-btn">
            <span className="icon">←</span>
          </button>
          <button className="toolbar-btn archive-btn">
            <span className="icon">📁</span>
          </button>
          <button className="toolbar-btn spam-btn">
            <span className="icon">⚠️</span>
          </button>
          <button onClick={handleDelete} className="toolbar-btn delete-btn">
            <span className="icon">🗑️</span>
          </button>
          <button className="toolbar-btn mark-unread-btn">
            <span className="icon">✉️</span>
          </button>
          <button className="toolbar-btn move-btn">
            <span className="icon">📂</span>
          </button>
          <button className="toolbar-btn more-btn">
            <span className="icon">⋮</span>
          </button>
        </div>

        <div className="toolbar-right">
          <span className="message-count">1 trong tổng số 960</span>
          <button className="toolbar-btn nav-btn">
            <span className="icon">‹</span>
          </button>
          <button className="toolbar-btn nav-btn">
            <span className="icon">›</span>
          </button>
          <button className="toolbar-btn profile-btn">
            <span className="icon">👤</span>
          </button>
        </div>
      </div>

      {/* Message Header */}
      <div className="gmail-message-header">
        <div className="message-subject-line">
          <h1 className="message-subject">{message.subject}</h1>
          <div className="subject-actions">
            <button className="subject-action-btn print-btn">
              <span className="icon">🖨️</span>
            </button>
            <button className="subject-action-btn new-window-btn">
              <span className="icon">🔗</span>
            </button>
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="gmail-message-content">
        <div className="message-sender-info">
          <div className="sender-avatar">
            {message.senderAvatarUrl ? (
              <img src={message.senderAvatarUrl} alt={message.senderUsername} />
            ) : (
              <div className="avatar-circle">
                {message.senderUsername.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="sender-details">
            <div className="sender-name-line">
              <span className="sender-name">{message.senderUsername}</span>
              <span className="sender-email">&lt;{message.senderUsername}@reddit.com&gt;</span>
            </div>
            <div className="message-recipients">
              <span className="to-label">đến tôi</span>
              <button className="show-details-btn">▼</button>
            </div>
          </div>

          <div className="message-timestamp">
            <span className="timestamp">{formatMessageTime(message.createdAt)}</span>
            <div className="message-actions-dropdown">
              <button className="action-btn star-btn">
                <span className="icon">⭐</span>
              </button>
              <button onClick={() => setShowReplyForm(!showReplyForm)} className="action-btn reply-btn">
                <span className="icon">↩️</span>
              </button>
              <button className="action-btn more-actions-btn">
                <span className="icon">⋮</span>
              </button>
            </div>
          </div>
        </div>

        <div className="message-body-content">
          <div className="message-text">
            {message.content.split('\n').map((line, index) => (
              <p key={index}>{line || <br />}</p>
            ))}
          </div>
        </div>

        {/* Reply Actions */}
        <div className="gmail-reply-actions">
          {isReceiver && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="reply-action-btn reply-btn"
            >
              <span className="icon">↩️</span>
              Trả lời
            </button>
          )}
          <button
            onClick={() => setShowForwardForm(!showForwardForm)}
            className="reply-action-btn forward-btn"
          >
            <span className="icon">→</span>
            Chuyển tiếp
          </button>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="reply-action-btn emoji-btn"
          >
            <span className="icon">😊</span>
          </button>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="emoji-picker">
              {['👍', '❤️', '😂', '😮', '😢', '😡'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiReaction(emoji)}
                  className="emoji-option"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reply Form */}
      {showReplyForm && isReceiver && (
        <div className="gmail-reply-form">
          <div className="reply-form-header">
            <div className="reply-to-info">
              <span className="reply-label">Trả lời cho</span>
              <span className="reply-recipient">{message.senderUsername}</span>
            </div>
            <button
              onClick={() => setShowReplyForm(false)}
              className="close-reply-btn"
            >
              ✕
            </button>
          </div>

          <div className="reply-form-content">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Nhập phản hồi của bạn..."
              className="reply-textarea"
              rows={8}
              maxLength={5000}
            />

            <div className="reply-form-actions">
              <button
                onClick={handleReply}
                disabled={!replyContent.trim() || isReplying}
                className="send-reply-btn"
              >
                {isReplying ? 'Đang gửi...' : 'Gửi'}
              </button>
              <div className="reply-formatting-options">
                <button className="format-btn">A</button>
                <button className="format-btn">📎</button>
                <button className="format-btn">🔗</button>
                <button className="format-btn">😊</button>
                <button className="format-btn">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward Form */}
      {showForwardForm && (
        <div className="gmail-forward-form">
          <div className="forward-form-header">
            <div className="forward-to-info">
              <span className="forward-label">Forward to</span>
            </div>
            <button
              onClick={() => setShowForwardForm(false)}
              className="close-forward-btn"
            >
              ✕
            </button>
          </div>

          <div className="forward-form-content">
            <input
              type="text"
              value={forwardRecipients}
              onChange={(e) => setForwardRecipients(e.target.value)}
              placeholder="Enter usernames separated by commas (e.g., user1, user2, user3)"
              className="forward-input"
            />

            <div className="forward-preview">
              <strong>Subject:</strong> Fwd: {message?.subject}<br/>
              <strong>Original message:</strong> {message?.content?.substring(0, 100)}...
            </div>

            <div className="forward-form-actions">
              <button
                onClick={handleForward}
                disabled={!forwardRecipients.trim() || isForwarding}
                className="send-forward-btn"
              >
                {isForwarding ? 'Forwarding...' : 'Forward Message'}
              </button>
              <button
                onClick={() => setShowForwardForm(false)}
                className="cancel-forward-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageDetail;

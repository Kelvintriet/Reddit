import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useMessagesStore } from '../store/useMessagesStore';
import { searchUserByIdentifier } from '../collections/users';

const ComposeMessage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { sendMessage, isLoading, error, clearError } = useMessagesStore();

  const [formData, setFormData] = useState({
    to: searchParams.get('to') || '',
    subject: searchParams.get('subject') || '',
    content: ''
  });
  const [recipientUser, setRecipientUser] = useState<any>(null);
  const [isValidatingRecipient, setIsValidatingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Auto-validate recipient if provided in URL
    if (formData.to) {
      validateRecipient(formData.to);
    }
  }, [user, navigate]);

  const validateRecipient = async (username: string) => {
    if (!username.trim()) {
      setRecipientUser(null);
      setRecipientError(null);
      return;
    }

    setIsValidatingRecipient(true);
    setRecipientError(null);

    try {
      const userProfile = await searchUserByIdentifier(username);
      if (userProfile) {
        console.log('Found user profile:', userProfile); // Debug log
        setRecipientUser(userProfile);
        setRecipientError(null);
      } else {
        setRecipientUser(null);
        setRecipientError('Không tìm thấy người dùng này. Thử tìm bằng: ID (549-110-NAM), username (u/taikhoangphu2), hoặc @name (@kelvinhuynh)');
      }
    } catch (error) {
      setRecipientUser(null);
      setRecipientError('Lỗi khi tìm kiếm người dùng');
    } finally {
      setIsValidatingRecipient(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'to') {
      // Debounce recipient validation
      const timeoutId = setTimeout(() => {
        validateRecipient(value);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientUser) {
      setRecipientError('Vui lòng chọn người nhận hợp lệ');
      return;
    }

    if (!formData.subject.trim()) {
      alert('Vui lòng nhập tiêu đề');
      return;
    }

    if (!formData.content.trim()) {
      alert('Vui lòng nhập nội dung tin nhắn');
      return;
    }

    // Check if trying to send to self
    const recipientId = recipientUser.id || recipientUser.uid;
    console.log('Recipient user:', recipientUser); // Debug log
    console.log('Recipient ID:', recipientId); // Debug log

    if (user && recipientId === user.uid) {
      alert('Không thể gửi tin nhắn cho chính mình');
      return;
    }

    if (!recipientId) {
      alert('Không thể xác định ID người nhận');
      return;
    }

    try {
      const messageData = {
        receiverId: recipientId,
        receiverUsername: recipientUser.username || recipientUser.displayName,
        subject: formData.subject.trim(),
        content: formData.content.trim()
      };
      console.log('Sending message with data:', messageData); // Debug log

      await sendMessage(messageData);

      alert('Tin nhắn đã được gửi thành công!');
      navigate('/inbox');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại.');
    }
  };

  const handleCancel = () => {
    if (formData.content.trim() || formData.subject.trim()) {
      if (confirm('Bạn có chắc chắn muốn hủy? Nội dung sẽ bị mất.')) {
        navigate('/inbox');
      }
    } else {
      navigate('/inbox');
    }
  };

  if (!user) {
    return (
      <div className="compose-container">
        <div className="auth-required">
          <h2>Đăng nhập để gửi tin nhắn</h2>
          <button onClick={() => navigate('/login')} className="login-button">
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="compose-container">
      <div className="compose-header">
        <h1>Soạn tin nhắn mới</h1>
        <div className="compose-actions">
          <button onClick={handleCancel} className="cancel-button">
            Hủy
          </button>
          <button 
            onClick={handleSubmit} 
            className="send-button"
            disabled={isLoading || !recipientUser}
          >
            {isLoading ? 'Đang gửi...' : 'Gửi tin nhắn'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button onClick={clearError}>✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="compose-form">
        <div className="form-group">
          <label htmlFor="to">Gửi đến:</label>
          <div className="recipient-input-container">
            <input
              type="text"
              id="to"
              value={formData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              placeholder="Nhập tên người dùng..."
              className={`recipient-input ${recipientError ? 'error' : ''} ${recipientUser ? 'valid' : ''}`}
              required
            />
            {isValidatingRecipient && (
              <div className="validation-spinner">⏳</div>
            )}
            {recipientUser && (
              <div className="validation-success">✅</div>
            )}
          </div>
          
          {recipientError && (
            <div className="field-error">{recipientError}</div>
          )}
          
          {recipientUser && (
            <div className="recipient-preview">
              <div className="recipient-avatar">
                {recipientUser.avatarUrl || recipientUser.photoURL ? (
                  <img 
                    src={recipientUser.avatarUrl || recipientUser.photoURL} 
                    alt={recipientUser.username || recipientUser.displayName}
                  />
                ) : (
                  <div className="avatar-placeholder">
                    {(recipientUser.username || recipientUser.displayName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="recipient-info">
                <span className="recipient-name">
                  {recipientUser.username || recipientUser.displayName}
                </span>
                {recipientUser.bio && (
                  <span className="recipient-bio">{recipientUser.bio}</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="subject">Tiêu đề:</label>
          <input
            type="text"
            id="subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Nhập tiêu đề tin nhắn..."
            maxLength={200}
            required
          />
          <div className="char-count">{formData.subject.length}/200</div>
        </div>

        <div className="form-group">
          <label htmlFor="content">Nội dung:</label>
          <textarea
            id="content"
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            placeholder="Nhập nội dung tin nhắn..."
            rows={12}
            maxLength={5000}
            required
          />
          <div className="char-count">{formData.content.length}/5000</div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={handleCancel} className="cancel-button">
            Hủy
          </button>
          <button 
            type="submit" 
            className="send-button"
            disabled={isLoading || !recipientUser || !formData.subject.trim() || !formData.content.trim()}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Đang gửi...
              </>
            ) : (
              '📤 Gửi tin nhắn'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ComposeMessage;

import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useAuthStore } from '../../store';
import { useMessagesStore } from '../../store/useMessagesStore';
import { searchUserByIdentifier } from '../../collections/users';
import './ComposeMessage.css';

interface ComposeMessageProps {
    onClose: () => void;
    recipientUsername?: string;
    replyToSubject?: string;
}

const ComposeMessage = ({ onClose, recipientUsername, replyToSubject }: ComposeMessageProps) => {
    const { user } = useAuthStore();
    const { sendNewMessage, isLoading } = useMessagesStore();

    const [toUsername, setToUsername] = useState(recipientUsername || '');
    const [subject, setSubject] = useState(replyToSubject ? `Re: ${replyToSubject}` : '');
    const [body, setBody] = useState('');
    const [error, setError] = useState('');
    const [searching, setSearching] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setError('Vui lòng đăng nhập để gửi tin nhắn');
            return;
        }

        if (!toUsername.trim()) {
            setError('Vui lòng nhập tên người nhận');
            return;
        }

        if (!subject.trim()) {
            setError('Vui lòng nhập tiêu đề');
            return;
        }

        if (!body.trim()) {
            setError('Vui lòng nhập nội dung tin nhắn');
            return;
        }

        setError('');
        setSearching(true);

        try {
            // Search for recipient by username
            const recipient = await searchUserByIdentifier(toUsername.trim());

            if (!recipient) {
                setError('Không tìm thấy người dùng với tên này');
                setSearching(false);
                return;
            }

            // Send message
            await sendNewMessage(
                user.uid,
                user.username || user.displayName || 'Anonymous',
                user.displayName || user.username || 'Anonymous',
                user.avatarUrl || user.photoURL || undefined,
                recipient.id,
                recipient.username || recipient.displayName || 'Anonymous',
                recipient.displayName || recipient.username || 'Anonymous',
                subject.trim(),
                body.trim()
            );

            // Close modal on success
            onClose();
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Đã xảy ra lỗi khi gửi tin nhắn. Vui lòng thử lại.');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="compose-overlay" onClick={onClose}>
            <div className="compose-modal" onClick={(e) => e.stopPropagation()}>
                <div className="compose-header">
                    <h2>Soạn tin nhắn</h2>
                    <button className="compose-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="compose-form">
                    <div className="compose-field">
                        <label htmlFor="to">Đến</label>
                        <input
                            id="to"
                            type="text"
                            placeholder="Nhập tên người dùng..."
                            value={toUsername}
                            onChange={(e) => setToUsername(e.target.value)}
                            disabled={isLoading || searching}
                            autoFocus={!recipientUsername}
                        />
                    </div>

                    <div className="compose-field">
                        <label htmlFor="subject">Tiêu đề</label>
                        <input
                            id="subject"
                            type="text"
                            placeholder="Nhập tiêu đề..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={isLoading || searching}
                        />
                    </div>

                    <div className="compose-field">
                        <label htmlFor="body">Nội dung</label>
                        <textarea
                            id="body"
                            placeholder="Nhập nội dung tin nhắn..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            disabled={isLoading || searching}
                            rows={10}
                        />
                    </div>

                    {error && <div className="compose-error">{error}</div>}

                    <div className="compose-actions">
                        <button type="button" className="compose-cancel-btn" onClick={onClose} disabled={isLoading || searching}>
                            Hủy
                        </button>
                        <button type="submit" className="compose-send-btn" disabled={isLoading || searching}>
                            {isLoading || searching ? (
                                <>
                                    <div className="compose-spinner"></div>
                                    Đang gửi...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Gửi tin nhắn
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ComposeMessage;

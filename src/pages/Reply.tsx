import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, Lock, Mail, Calendar } from 'lucide-react';
import { useAuthStore } from '../store';
import { validateReplyToken, sendReply, getMessage } from '../collections/messages';
import { getUserProfile } from '../collections/users';
import type { Message } from '../collections/messages';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import './Compose.css';

const Reply = () => {
    const { user } = useAuthStore();
    const { token } = useParams<{ token: string; username: string }>();
    const navigate = useNavigate();

    const [body, setBody] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [isValid, setIsValid] = useState(false);
    const [originalMessage, setOriginalMessage] = useState<Message | null>(null);

    useEffect(() => {
        const validateToken = async () => {
            if (!user || !token) {
                setError('Please log in to reply to messages');
                setIsValidating(false);
                return;
            }

            setIsValidating(true);

            try {
                const validation = await validateReplyToken(token, user.uid);

                if (!validation.valid || !validation.messageId) {
                    setError('This reply link is invalid or has expired');
                    setIsValid(false);
                    setIsValidating(false);
                    return;
                }

                // Get the original message
                const message = await getMessage(validation.messageId);
                if (!message) {
                    setError('Original message not found');
                    setIsValid(false);
                    setIsValidating(false);
                    return;
                }

                setOriginalMessage(message);
                setIsValid(true);
            } catch (err) {
                console.error('Error validating token:', err);
                setError('Failed to validate reply link');
                setIsValid(false);
            } finally {
                setIsValidating(false);
            }
        };

        validateToken();
    }, [user, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !originalMessage || !token) {
            setError('Invalid reply state');
            return;
        }

        if (!body.trim()) {
            setError('Please enter a message');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Get user profile for additional data
            const userProfile = await getUserProfile(user.uid);

            await sendReply(
                originalMessage.id,
                user.uid,
                userProfile?.username || user.displayName || 'Anonymous',
                userProfile?.displayName || user.displayName || 'Anonymous',
                userProfile?.avatarUrl || user.photoURL || undefined,
                originalMessage.fromUserId,
                originalMessage.fromUsername,
                originalMessage.fromDisplayName,
                body.trim(),
                token
            );

            // Navigate back to inbox on success
            navigate('/inbox');
        } catch (err) {
            console.error('Error sending reply:', err);
            setError('Failed to send reply. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="compose-page">
                <div className="compose-container">
                    <div className="compose-error-page">
                        <AlertCircle size={48} />
                        <h2>Please log in to reply</h2>
                        <button onClick={() => navigate('/login')} className="compose-btn-primary">
                            Go to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (isValidating) {
        return (
            <div className="compose-page">
                <div className="compose-container">
                    <div className="compose-error-page">
                        <div className="compose-spinner"></div>
                        <h2>Validating reply link...</h2>
                    </div>
                </div>
            </div>
        );
    }

    if (!isValid || !originalMessage) {
        return (
            <div className="compose-page">
                <div className="compose-container">
                    <div className="compose-error-page">
                        <Lock size={48} />
                        <h2>Invalid Reply Link</h2>
                        <p>{error || 'This reply link is invalid, has expired, or has already been used.'}</p>
                        <button onClick={() => navigate('/inbox')} className="compose-btn-primary">
                            Go to Inbox
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="compose-page">
            <div className="compose-container">
                <div className="compose-header">
                    <button className="compose-back-btn" onClick={() => navigate('/inbox')}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Reply to Message</h1>
                </div>

                <form onSubmit={handleSubmit} className="compose-form-page">
                    {/* Original Message - Gmail Style */}
                    <div className="compose-form-field">
                        <label style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--color-neutral-content-weak)',
                            marginBottom: '8px',
                            display: 'block'
                        }}>
                            REPLYING TO
                        </label>
                        <div style={{
                            padding: '0',
                            backgroundColor: 'var(--color-neutral-background)',
                            borderRadius: '8px',
                            border: '1px solid var(--color-neutral-border)',
                            marginBottom: '20px',
                            overflow: 'hidden'
                        }}>
                            {/* Message Header */}
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'var(--color-neutral-background-weak)',
                                borderBottom: '1px solid var(--color-neutral-border-weak)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--color-primary)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        flexShrink: 0,
                                        overflow: 'hidden'
                                    }}>
                                        {originalMessage.fromAvatarUrl ? (
                                            <img
                                                src={originalMessage.fromAvatarUrl}
                                                alt={originalMessage.fromDisplayName}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            originalMessage.fromDisplayName.charAt(0).toUpperCase()
                                        )}
                                    </div>

                                    {/* Message Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '15px',
                                            fontWeight: 600,
                                            color: 'var(--color-neutral-content-strong)',
                                            marginBottom: '2px'
                                        }}>
                                            {originalMessage.fromDisplayName}
                                        </div>
                                        <div style={{
                                            fontSize: '13px',
                                            color: 'var(--color-neutral-content-weak)',
                                            marginBottom: '8px'
                                        }}>
                                            @{originalMessage.fromUsername}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--color-neutral-content-weak)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <Calendar size={12} />
                                            {format(originalMessage.createdAt, 'PPpp', { locale: vi })}
                                        </div>
                                    </div>
                                </div>

                                {/* Subject */}
                                <div style={{
                                    marginTop: '12px',
                                    padding: '8px 12px',
                                    backgroundColor: 'var(--color-neutral-background)',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <Mail size={14} style={{ color: 'var(--color-neutral-content-weak)' }} />
                                    <span style={{ color: 'var(--color-neutral-content)' }}>
                                        {originalMessage.subject}
                                    </span>
                                </div>
                            </div>

                            {/* Message Body */}
                            <div style={{
                                padding: '16px',
                                backgroundColor: 'white',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                fontSize: '14px',
                                lineHeight: '1.6',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                color: 'var(--color-neutral-content)'
                            }}>
                                {originalMessage.body}
                            </div>
                        </div>
                    </div>

                    <div className="compose-form-field">
                        <label htmlFor="body" style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            marginBottom: '8px',
                            display: 'block'
                        }}>
                            Your Reply
                        </label>
                        <div style={{
                            fontSize: '12px',
                            color: 'var(--color-neutral-content-weak)',
                            marginBottom: '8px',
                            padding: '10px 12px',
                            backgroundColor: 'var(--color-info-background)',
                            border: '1px solid var(--color-info-border)',
                            borderRadius: '6px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <Mail size={14} style={{ color: 'var(--color-info)' }} />
                                <span style={{ fontWeight: 500, color: 'var(--color-info)' }}>
                                    Thread Reply
                                </span>
                            </div>
                            <div style={{ paddingLeft: '20px', fontSize: '11px', lineHeight: '1.4' }}>
                                Your reply will be grouped with the original message. Subject: "{originalMessage.subject}"
                            </div>
                        </div>
                        <textarea
                            id="body"
                            placeholder="Type your reply..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            disabled={isLoading}
                            rows={12}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-neutral-border)',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {error && (
                        <div className="compose-error" style={{ marginTop: '12px' }}>
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="compose-form-actions">
                        <button
                            type="button"
                            onClick={() => navigate('/inbox')}
                            disabled={isLoading}
                            className="compose-btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !body.trim()}
                            className="compose-btn-primary"
                        >
                            {isLoading ? (
                                <>
                                    <div className="compose-spinner-small"></div>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Send Reply
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Reply;

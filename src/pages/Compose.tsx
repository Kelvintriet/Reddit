import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, AlertCircle, Check } from 'lucide-react';
import { useAuthStore } from '../store';
import { useMessagesStore } from '../store/useMessagesStore';
import { searchUserByIdentifier, searchUsersByPartialName, getUserProfile } from '../collections/users';
import './Compose.css';

const Compose = () => {
    const { user } = useAuthStore();
    const { sendNewMessage, isLoading } = useMessagesStore();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Get recipient from URL params or query
    const recipientFromQuery = searchParams.get('to') || '';
    const subjectFromQuery = searchParams.get('subject') || '';

    const [toInput, setToInput] = useState(recipientFromQuery);
    const [subject, setSubject] = useState(subjectFromQuery);
    const [body, setBody] = useState('');
    const [error, setError] = useState('');
    const [validatingUser, setValidatingUser] = useState(false);
    const [validatedUser, setValidatedUser] = useState<any>(null);
    const [formatHint, setFormatHint] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Fetch user suggestions for partial matches
    const fetchSuggestions = async (input: string) => {
        if (input.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const results = await searchUsersByPartialName(input, 5);
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
        } catch (err) {
            console.error('Error fetching suggestions:', err);
        }
    };

    // Select a suggestion
    const selectSuggestion = (user: any) => {
        setToInput(user.customUID); // Fill with ID format
        setValidatedUser(user);
        setShowSuggestions(false);
        setSuggestions([]);
        setFormatHint(`✓ Selected: ${user.displayName} (@${user.atName || user.username})`);
        setError('');
    };

    // Detect format and validate user
    const validateUsername = async (input: string) => {
        if (!input.trim()) {
            setValidatedUser(null);
            setFormatHint('');
            setError('');
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setValidatingUser(true);
        setError('');

        try {
            let searchTerm = input.trim();
            let detectedFormat = '';

            // Detect format
            if (searchTerm.startsWith('u/')) {
                detectedFormat = 'Username (u/)';
                searchTerm = searchTerm.substring(2); // Remove u/
                // Clear suggestions for exact format searches
                setSuggestions([]);
                setShowSuggestions(false);
            } else if (searchTerm.startsWith('@')) {
                detectedFormat = 'At Name (@)';
                searchTerm = searchTerm.substring(1); // Remove @
                setSuggestions([]);
                setShowSuggestions(false);
            } else if (/^\d{3}-\d{3}-[A-Z0-9]{3}$/i.test(searchTerm)) {
                detectedFormat = 'ID Code (XXX-XXX-XXX)';
                setSuggestions([]);
                setShowSuggestions(false);
            } else {
                // Show partial search results
                await fetchSuggestions(searchTerm);
                setFormatHint('💡 Tip: Select from suggestions or use u/username, @atname, or XXX-XXX-XXX format');
            }

            if (detectedFormat) {
                setFormatHint(`✓ Detected: ${detectedFormat}`);
            }

            // Search for exact user
            const foundUser = await searchUserByIdentifier(searchTerm);

            if (foundUser) {
                setValidatedUser(foundUser);
                setError('');
                setSuggestions([]);
                setShowSuggestions(false);
            } else if (!showSuggestions || suggestions.length === 0) {
                setValidatedUser(null);
                setError(`❌ User not found! Try: u/${searchTerm}, @${searchTerm}, or use ID code format (XXX-XXX-XXX)`);
            }
        } catch (err) {
            console.error('Error validating user:', err);
            setValidatedUser(null);
            setError('Error validating username');
        } finally {
            setValidatingUser(false);
        }
    };

    // Debounced validation
    useEffect(() => {
        const timer = setTimeout(() => {
            if (toInput) {
                validateUsername(toInput);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [toInput]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setError('Please log in to send messages');
            return;
        }

        if (!toInput.trim()) {
            setError('Please enter recipient username');
            return;
        }

        if (!validatedUser) {
            setError('Please enter a valid username in format: u/username, @atname, or XXX-XXX-XXX');
            return;
        }

        // Check message permissions
        const recipientProfile = await getUserProfile(validatedUser.id);
        if (recipientProfile) {
            const { allowMessagesFrom, allowedMessageUsers } = recipientProfile;

            if (allowMessagesFrom === 'nobody') {
                setError('This user has disabled receiving messages.');
                return;
            }

            if (allowMessagesFrom === 'specific') {
                if (!allowedMessageUsers || !allowedMessageUsers.includes(user.uid)) {
                    setError('This user has disabled receiving messages.');
                    return;
                }
            }
        }

        if (!subject.trim()) {
            setError('Please enter a subject');
            return;
        }

        if (!body.trim()) {
            setError('Please enter a message');
            return;
        }

        setError('');

        try {
            await sendNewMessage(
                user.uid,
                user.username || user.displayName || 'Anonymous',
                user.displayName || user.username || 'Anonymous',
                user.avatarUrl || user.photoURL || undefined,
                validatedUser.id,
                validatedUser.username || validatedUser.displayName || 'Anonymous',
                validatedUser.displayName || validatedUser.username || 'Anonymous',
                subject.trim(),
                body.trim()
            );

            // Navigate back to inbox on success
            navigate('/inbox');
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Failed to send message. Please try again.');
        }
    };

    if (!user) {
        return (
            <div className="compose-page">
                <div className="compose-container">
                    <div className="compose-error-page">
                        <AlertCircle size={48} />
                        <h2>Please log in to send messages</h2>
                        <button onClick={() => navigate('/login')} className="compose-btn-primary">
                            Go to Login
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
                    <h1>Compose Message</h1>
                </div>

                <form onSubmit={handleSubmit} className="compose-form-page">
                    <div className="compose-form-field">
                        <label htmlFor="to">To</label>
                        <div className="compose-input-wrapper" style={{ position: 'relative' }}>
                            <input
                                id="to"
                                type="text"
                                placeholder="u/username, @atname, or XXX-XXX-XXX"
                                value={toInput}
                                onChange={(e) => setToInput(e.target.value)}
                                disabled={isLoading}
                                className={validatedUser ? 'valid' : ''}
                            />
                            {validatingUser && (
                                <div className="compose-input-status validating">
                                    <div className="compose-spinner-small"></div>
                                </div>
                            )}
                            {!validatingUser && validatedUser && (
                                <div className="compose-input-status valid">
                                    <Check size={20} />
                                </div>
                            )}
                        </div>

                        {/* Suggestions dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="compose-suggestions-dropdown" style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid var(--color-neutral-border)',
                                borderRadius: '8px',
                                marginTop: '4px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}>
                                {suggestions.map((suggestion) => (
                                    <div
                                        key={suggestion.id}
                                        onClick={() => selectSuggestion(suggestion)}
                                        style={{
                                            padding: '12px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid var(--color-neutral-border-weak)',
                                            display: 'flex',
                                            gap: '12px',
                                            alignItems: 'center'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-background-weak)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--color-neutral-border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            flexShrink: 0
                                        }}>
                                            {suggestion.avatarUrl ? (
                                                <img src={suggestion.avatarUrl} alt={suggestion.displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                                                    {(suggestion.displayName || 'U').charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                                                {suggestion.displayName}
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--color-neutral-content-weak)' }}>
                                                @{suggestion.atName || suggestion.username} • {suggestion.customUID}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {formatHint && !error && (
                            <div className="compose-hint">{formatHint}</div>
                        )}
                        {validatedUser && (
                            <div className="compose-user-preview">
                                <div className="compose-user-avatar">
                                    {validatedUser.avatarUrl || validatedUser.photoURL ? (
                                        <img src={validatedUser.avatarUrl || validatedUser.photoURL} alt={validatedUser.displayName} />
                                    ) : (
                                        <div className="compose-user-avatar-placeholder">
                                            {(validatedUser.displayName || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="compose-user-info">
                                    <div className="compose-user-name">{validatedUser.displayName}</div>
                                    <div className="compose-user-details">
                                        {validatedUser.username && `u/${validatedUser.username}`}
                                        {validatedUser.atName && ` • @${validatedUser.atName}`}
                                        {validatedUser.customUID && ` • ${validatedUser.customUID}`}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="compose-form-field">
                        <label htmlFor="subject">Subject</label>
                        <input
                            id="subject"
                            type="text"
                            placeholder="Enter subject..."
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="compose-form-field">
                        <label htmlFor="body">Message</label>
                        <textarea
                            id="body"
                            placeholder="Write your message..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            disabled={isLoading}
                            rows={15}
                        />
                    </div>

                    {error && (
                        <div className="compose-error-message">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    <div className="compose-form-actions">
                        <button
                            type="button"
                            className="compose-btn-secondary"
                            onClick={() => navigate('/inbox')}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="compose-btn-primary"
                            disabled={isLoading || !validatedUser}
                        >
                            {isLoading ? (
                                <>
                                    <div className="compose-spinner-small"></div>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Send Message
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Compose;

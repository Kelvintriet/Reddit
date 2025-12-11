import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useLanguageStore } from '../store/useLanguageStore';
import { createChangelog, getChangelogs, type ChangelogChange } from '../collections/changelogs';
import {
    isAuthorizedChangelogUser,
    verifyChangelogPassword,
    hasValidPasswordSession,
    savePasswordSession
} from '../utils/changelogAuth';
import './ChangelogCreate.css';

const ChangelogCreate: React.FC = () => {
    const { user, isInitialized } = useAuthStore();
    const { t } = useLanguageStore();
    const navigate = useNavigate();
    const [isPasswordVerified, setIsPasswordVerified] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Form state
    const [version, setVersion] = useState('');
    const [previousVersion, setPreviousVersion] = useState<string>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [changes, setChanges] = useState<ChangelogChange[]>([
        { type: 'feature', description: '' }
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    // Check authorization and password session
    useEffect(() => {
        const checkAuthAndSession = async () => {
            console.log('🔍 Checking auth and session...', { isInitialized, user: user?.uid });

            // Wait for auth to initialize
            if (!isInitialized) {
                console.log('⏳ Auth still initializing...');
                return;
            }

            // If not logged in, redirect to home
            if (!user) {
                console.log('❌ No user, redirecting to /home');
                navigate('/home');
                return;
            }

            console.log('✅ User logged in:', {
                uid: user.uid,
                username: user.username,
                customUID: user.customUID,
                atName: user.atName
            });

            // Check if user is authorized
            setCheckingAuth(true);
            try {
                const authorized = await isAuthorizedChangelogUser(user);
                console.log('🔐 Authorization result:', authorized);
                setIsAuthorized(authorized);

                if (!authorized) {
                    console.log('❌ User not authorized, redirecting to /changelog');
                    setAuthError(t('notAuthorized'));
                    // Don't redirect immediately, show error for 3 seconds
                    setTimeout(() => {
                        navigate('/changelog');
                    }, 3000);
                    return;
                }

                // Check if user has valid password session
                if (hasValidPasswordSession(user.uid)) {
                    console.log('✅ Valid password session found');
                    setIsPasswordVerified(true);
                } else {
                    console.log('🔑 No valid password session, need to verify');
                }
            } catch (error) {
                console.error('❌ Error checking authorization:', error);
                setAuthError(t('authCheckFailed'));
            } finally {
                setCheckingAuth(false);
            }
        };

        checkAuthAndSession();
    }, [user, isInitialized, navigate, t]);

    // Fetch latest changelog to get previous version
    useEffect(() => {
        const fetchLatestVersion = async () => {
            try {
                const changelogs = await getChangelogs();
                if (changelogs && changelogs.length > 0) {
                    // Changelogs are sorted by date descending, so first one is latest
                    setPreviousVersion(changelogs[0].version);
                }
            } catch (error) {
                console.error('Error fetching latest changelog:', error);
                // Don't show error to user, just skip setting previous version
            }
        };

        if (isPasswordVerified) {
            fetchLatestVersion();
        }
    }, [isPasswordVerified]);

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');

        const result = await verifyChangelogPassword(password);

        if (result.verified) {
            setIsPasswordVerified(true);
            if (user && result.expiresIn) {
                savePasswordSession(user.uid, result.expiresIn);
            }
        } else {
            setPasswordError(result.error || t('incorrectPassword'));
        }
    };

    const handleAddChange = () => {
        setChanges([...changes, { type: 'feature', description: '' }]);
    };

    const handleRemoveChange = (index: number) => {
        if (changes.length > 1) {
            setChanges(changes.filter((_, i) => i !== index));
        }
    };

    const handleChangeUpdate = (index: number, field: keyof ChangelogChange, value: string) => {
        const updatedChanges = [...changes];
        updatedChanges[index] = { ...updatedChanges[index], [field]: value };
        setChanges(updatedChanges);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        // Validation
        if (!version.trim()) {
            setError(t('versionRequired'));
            return;
        }

        if (!date) {
            setError(t('dateRequired'));
            return;
        }

        const validChanges = changes.filter(c => c.description.trim());
        if (validChanges.length === 0) {
            setError(t('changeRequired'));
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            await createChangelog({
                version: version.trim(),
                date,
                changes: validChanges,
                createdBy: user.uid,
                createdByUsername: user.username || user.displayName || 'Unknown'
            });

            // Navigate back to changelog page
            navigate('/changelog');
        } catch (err) {
            console.error('Error creating changelog:', err);
            setError(t('createChangelogFailed'));
            setSubmitting(false);
        }
    };

    // Show loading while checking auth
    if (!isInitialized || checkingAuth) {
        return (
            <div className="changelog-create-page">
                <div className="changelog-create-container">
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-neutral-content-weak)' }}>
                        {authError ? (
                            <div style={{ color: 'var(--color-reddit-orange)', marginBottom: '20px' }}>
                                {authError}
                            </div>
                        ) : (
                            t('loading')
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // If not authorized, don't show anything (will redirect)
    if (!isAuthorized) {
        return null;
    }

    // Password verification screen
    if (!isPasswordVerified) {
        return (
            <div className="changelog-create-page">
                <div className="changelog-create-container">
                    <div className="password-verification-card">
                        <h2>{t('passwordRequired')}</h2>
                        <p>{t('enterPasswordDesc')}</p>
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="form-group">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('enterPassword')}
                                    className="password-input"
                                    autoFocus
                                />
                            </div>
                            {passwordError && (
                                <div className="error-message">{passwordError}</div>
                            )}
                            <div className="button-group">
                                <button type="submit" className="submit-button">
                                    {t('verify')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/changelog')}
                                    className="cancel-button"
                                >
                                    {t('cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // Changelog creation form
    return (
        <div className="changelog-create-page">
            <div className="changelog-create-container">
                <div className="changelog-create-header">
                    <h1>{t('createChangelog')}</h1>
                    <p>{t('addNewVersion')}</p>
                </div>

                <form onSubmit={handleSubmit} className="changelog-create-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="version">{t('version')} *</label>
                            <input
                                type="text"
                                id="version"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                placeholder={previousVersion ? `Previous: ${previousVersion}` : "e.g., 1.2.0"}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="date">{t('date')} *</label>
                            <input
                                type="date"
                                id="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="changes-section">
                        <div className="changes-header">
                            <h3>{t('changes')}</h3>
                            <button
                                type="button"
                                onClick={handleAddChange}
                                className="add-change-button"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                                </svg>
                                {t('addChange')}
                            </button>
                        </div>

                        {changes.map((change, index) => (
                            <div key={index} className="change-item">
                                <div className="change-item-header">
                                    <select
                                        value={change.type}
                                        onChange={(e) => handleChangeUpdate(index, 'type', e.target.value)}
                                        className="change-type-select"
                                    >
                                        <option value="feature">{t('newFeature')}</option>
                                        <option value="improvement">{t('improvement')}</option>
                                        <option value="bugfix">{t('bugFix')}</option>
                                        <option value="breaking">{t('breakingChange')}</option>
                                    </select>
                                    {changes.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveChange(index)}
                                            className="remove-change-button"
                                            title="Remove change"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <textarea
                                    value={change.description}
                                    onChange={(e) => handleChangeUpdate(index, 'description', e.target.value)}
                                    placeholder={t('describeChange')}
                                    rows={3}
                                    className="change-description-input"
                                />
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    <div className="form-actions">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="submit-button"
                        >
                            {submitting ? t('creating') : t('createChangelogBtn')}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/changelog')}
                            className="cancel-button"
                            disabled={submitting}
                        >
                            {t('cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangelogCreate;

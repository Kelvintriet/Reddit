import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { getChangelogs, type Changelog as ChangelogType } from '../collections/changelogs';
import { isAuthorizedChangelogUser } from '../utils/changelogAuth';
import '../pages/Changelog.css';

const Changelog: React.FC = () => {
    const [changelogs, setChangelogs] = useState<ChangelogType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const { user } = useAuthStore();

    // Check authorization
    useEffect(() => {
        const checkAuth = async () => {
            if (user) {
                const authorized = await isAuthorizedChangelogUser(user);
                setIsAuthorized(authorized);
            } else {
                setIsAuthorized(false);
            }
        };

        checkAuth();
    }, [user]);

    useEffect(() => {
        const fetchChangelogs = async () => {
            try {
                setLoading(true);
                const data = await getChangelogs();
                setChangelogs(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching changelogs:', err);
                setError('Failed to load changelogs. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchChangelogs();
    }, []);

    const getChangeTypeIcon = (type: string) => {
        switch (type) {
            case 'feature':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                );
            case 'improvement':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 14l5-5 5 5z" />
                    </svg>
                );
            case 'bugfix':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z" />
                    </svg>
                );
            case 'breaking':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const getChangeTypeLabel = (type: string) => {
        switch (type) {
            case 'feature':
                return 'New Feature';
            case 'improvement':
                return 'Improvement';
            case 'bugfix':
                return 'Bug Fix';
            case 'breaking':
                return 'Breaking Change';
            default:
                return type;
        }
    };

    if (loading) {
        return (
            <div className="changelog-page">
                <div className="changelog-container">
                    <div className="changelog-header">
                        <h1 className="changelog-title">Changelog</h1>
                    </div>
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-neutral-content-weak)' }}>
                        Loading changelogs...
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="changelog-page">
                <div className="changelog-container">
                    <div className="changelog-header">
                        <h1 className="changelog-title">Changelog</h1>
                    </div>
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-reddit-orange)' }}>
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="changelog-page">
            <div className="changelog-container">
                <div className="changelog-header">
                    <h1 className="changelog-title">Changelog</h1>
                    <p className="changelog-subtitle">
                        Track all updates, new features, and improvements to the platform
                    </p>
                    {isAuthorized && (
                        <Link to="/changelog/create" className="changelog-create-button">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                            Create New Changelog
                        </Link>
                    )}
                </div>

                {changelogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-neutral-content-weak)' }}>
                        No changelogs available yet.
                    </div>
                ) : (
                    <div className="changelog-timeline">
                        {changelogs.map((entry, index) => (
                            <div key={entry.id || index} className="changelog-entry">
                                <div className="changelog-entry-header">
                                    <div className="changelog-version-badge">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
                                        </svg>
                                        v{entry.version}
                                    </div>
                                    <div className="changelog-date">{entry.date}</div>
                                </div>

                                <div className="changelog-changes">
                                    {entry.changes.map((change, changeIndex) => (
                                        <div key={changeIndex} className={`changelog-change changelog-change-${change.type}`}>
                                            <div className="changelog-change-icon">
                                                {getChangeTypeIcon(change.type)}
                                            </div>
                                            <div className="changelog-change-content">
                                                <span className="changelog-change-type">
                                                    {getChangeTypeLabel(change.type)}
                                                </span>
                                                <p className="changelog-change-description">
                                                    {change.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {index < changelogs.length - 1 && (
                                    <div className="changelog-divider" />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="changelog-footer">
                    <p>
                        Have feedback or suggestions? Let us know in{' '}
                        <a href="/r/feedback" className="changelog-link">r/feedback</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Changelog;

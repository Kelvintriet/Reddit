import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import './Notifications.css';

interface Notification {
    id: string;
    type: 'message' | 'comment' | 'upvote' | 'mention' | 'follow' | 'system';
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
    link?: string;
    icon?: string;
}

const Notifications: React.FC = () => {
    const { user } = useAuthStore();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            fetchUnreadCount();
        }
    }, [user, filter]);

    useEffect(() => {
        // Listen for real-time notifications
        const handleNotification = (event: CustomEvent) => {
            const newNotification = event.detail;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
        };

        window.addEventListener('notification' as any, handleNotification);
        return () => window.removeEventListener('notification' as any, handleNotification);
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const token = await user?.getIdToken();
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications?unreadOnly=${filter === 'unread'}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications.map((n: any) => ({
                    ...n,
                    createdAt: new Date(n.createdAt)
                })));
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const token = await user?.getIdToken();
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/unread-count`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const token = await user?.getIdToken();
            await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/${notificationId}/read`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const token = await user?.getIdToken();
            await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/read-all`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            const token = await user?.getIdToken();
            await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/${notificationId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'message': return '💬';
            case 'comment': return '💭';
            case 'upvote': return '⬆️';
            case 'mention': return '@';
            case 'follow': return '👤';
            case 'system': return '🔔';
            default: return '📢';
        }
    };

    const formatTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    if (!user) {
        return (
            <div className="notifications-page">
                <div className="notifications-empty">
                    <h2>Please log in to view notifications</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="notifications-page">
            <div className="notifications-header">
                <h1>Notifications</h1>
                {unreadCount > 0 && (
                    <span className="unread-badge">{unreadCount} unread</span>
                )}
            </div>

            <div className="notifications-controls">
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        Unread ({unreadCount})
                    </button>
                </div>

                {unreadCount > 0 && (
                    <button className="mark-all-read-btn" onClick={markAllAsRead}>
                        Mark all as read
                    </button>
                )}
            </div>

            {loading ? (
                <div className="notifications-loading">
                    <div className="spinner"></div>
                    <p>Loading notifications...</p>
                </div>
            ) : notifications.length === 0 ? (
                <div className="notifications-empty">
                    <div className="empty-icon">🔔</div>
                    <h2>No notifications</h2>
                    <p>You're all caught up!</p>
                </div>
            ) : (
                <div className="notifications-list">
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-item ${!notification.read ? 'unread' : ''}`}
                            onClick={() => {
                                if (!notification.read) markAsRead(notification.id);
                                if (notification.link) window.location.href = notification.link;
                            }}
                        >
                            <div className="notification-icon">
                                {getNotificationIcon(notification.type)}
                            </div>

                            <div className="notification-content">
                                <div className="notification-title">{notification.title}</div>
                                <div className="notification-message">{notification.message}</div>
                                <div className="notification-time">{formatTimeAgo(notification.createdAt)}</div>
                            </div>

                            <div className="notification-actions">
                                {!notification.read && (
                                    <button
                                        className="mark-read-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markAsRead(notification.id);
                                        }}
                                        title="Mark as read"
                                    >
                                        ✓
                                    </button>
                                )}
                                <button
                                    className="delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                    }}
                                    title="Delete"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Notifications;

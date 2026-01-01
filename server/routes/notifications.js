import axios from 'axios';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

// Helper to convert Firestore timestamp to ISO string
const convertTimestamp = (timestamp) => {
    if (!timestamp) return new Date().toISOString();
    if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toISOString();
    }
    return timestamp;
};

// Helper to parse Firestore document
const parseFirestoreDoc = (doc) => {
    const data = {};
    const fields = doc.fields || {};

    for (const [key, value] of Object.entries(fields)) {
        if (value.stringValue !== undefined) data[key] = value.stringValue;
        else if (value.booleanValue !== undefined) data[key] = value.booleanValue;
        else if (value.integerValue !== undefined) data[key] = parseInt(value.integerValue);
        else if (value.timestampValue !== undefined) data[key] = new Date(value.timestampValue);
    }

    return data;
};

// Get user notifications
export async function getUserNotifications(ctx) {
    try {
        const userId = ctx.state.user.uid;
        const { limit = 50, unreadOnly = false } = ctx.query;

        let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/notifications`;

        // Build query
        const structuredQuery = {
            from: [{ collectionId: 'notifications' }],
            where: {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        {
                            fieldFilter: {
                                field: { fieldPath: 'userId' },
                                op: 'EQUAL',
                                value: { stringValue: userId }
                            }
                        }
                    ]
                }
            },
            orderBy: [
                {
                    field: { fieldPath: 'createdAt' },
                    direction: 'DESCENDING'
                }
            ],
            limit: parseInt(limit)
        };

        // Add unread filter if requested
        if (unreadOnly === 'true') {
            structuredQuery.where.compositeFilter.filters.push({
                fieldFilter: {
                    field: { fieldPath: 'read' },
                    op: 'EQUAL',
                    value: { booleanValue: false }
                }
            });
        }

        const response = await axios.post(
            `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
            { structuredQuery }
        );

        const notifications = [];
        let unreadCount = 0;

        if (response.data) {
            for (const item of response.data) {
                if (item.document) {
                    const docId = item.document.name.split('/').pop();
                    const data = parseFirestoreDoc(item.document);

                    notifications.push({
                        id: docId,
                        ...data
                    });

                    if (!data.read) unreadCount++;
                }
            }
        }

        ctx.body = {
            notifications,
            unreadCount
        };
    } catch (error) {
        console.error('Error fetching notifications:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to fetch notifications' };
    }
}

// Mark notification as read
export async function markNotificationAsRead(ctx) {
    try {
        const userId = ctx.state.user.uid;
        const { notificationId } = ctx.params;

        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/notifications/${notificationId}`;

        // Get notification first to verify ownership
        const getResponse = await axios.get(url);
        const notification = parseFirestoreDoc(getResponse.data);

        if (notification.userId !== userId) {
            ctx.status = 403;
            ctx.body = { error: 'Unauthorized' };
            return;
        }

        // Update notification
        await axios.patch(
            `${url}?updateMask.fieldPaths=read&updateMask.fieldPaths=readAt`,
            {
                fields: {
                    read: { booleanValue: true },
                    readAt: { timestampValue: new Date().toISOString() }
                }
            }
        );

        ctx.body = { success: true };
    } catch (error) {
        console.error('Error marking notification as read:', error);
        ctx.status = error.response?.status || 500;
        ctx.body = { error: 'Failed to mark notification as read' };
    }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(ctx) {
    try {
        const userId = ctx.state.user.uid;

        // Query unread notifications
        const structuredQuery = {
            from: [{ collectionId: 'notifications' }],
            where: {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        {
                            fieldFilter: {
                                field: { fieldPath: 'userId' },
                                op: 'EQUAL',
                                value: { stringValue: userId }
                            }
                        },
                        {
                            fieldFilter: {
                                field: { fieldPath: 'read' },
                                op: 'EQUAL',
                                value: { booleanValue: false }
                            }
                        }
                    ]
                }
            }
        };

        const response = await axios.post(
            `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
            { structuredQuery }
        );

        let count = 0;
        const updatePromises = [];

        if (response.data) {
            for (const item of response.data) {
                if (item.document) {
                    const docId = item.document.name.split('/').pop();
                    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/notifications/${docId}`;

                    updatePromises.push(
                        axios.patch(
                            `${url}?updateMask.fieldPaths=read&updateMask.fieldPaths=readAt`,
                            {
                                fields: {
                                    read: { booleanValue: true },
                                    readAt: { timestampValue: new Date().toISOString() }
                                }
                            }
                        )
                    );
                    count++;
                }
            }
        }

        await Promise.all(updatePromises);

        ctx.body = { success: true, count };
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to mark all notifications as read' };
    }
}

// Delete notification
export async function deleteNotification(ctx) {
    try {
        const userId = ctx.state.user.uid;
        const { notificationId } = ctx.params;

        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/notifications/${notificationId}`;

        // Get notification first to verify ownership
        const getResponse = await axios.get(url);
        const notification = parseFirestoreDoc(getResponse.data);

        if (notification.userId !== userId) {
            ctx.status = 403;
            ctx.body = { error: 'Unauthorized' };
            return;
        }

        // Delete notification
        await axios.delete(url);

        ctx.body = { success: true };
    } catch (error) {
        console.error('Error deleting notification:', error);
        ctx.status = error.response?.status || 500;
        ctx.body = { error: 'Failed to delete notification' };
    }
}

// Get unread count
export async function getUnreadCount(ctx) {
    try {
        const userId = ctx.state.user.uid;

        const structuredQuery = {
            from: [{ collectionId: 'notifications' }],
            where: {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        {
                            fieldFilter: {
                                field: { fieldPath: 'userId' },
                                op: 'EQUAL',
                                value: { stringValue: userId }
                            }
                        },
                        {
                            fieldFilter: {
                                field: { fieldPath: 'read' },
                                op: 'EQUAL',
                                value: { booleanValue: false }
                            }
                        }
                    ]
                }
            }
        };

        const response = await axios.post(
            `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
            { structuredQuery }
        );

        let unreadCount = 0;
        if (response.data) {
            for (const item of response.data) {
                if (item.document) unreadCount++;
            }
        }

        ctx.body = { unreadCount };
    } catch (error) {
        console.error('Error getting unread count:', error);
        ctx.status = 500;
        ctx.body = { error: 'Failed to get unread count' };
    }
}

// Create notification (helper function for other services)
export async function createNotification(userId, notificationData) {
    try {
        const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/notifications`;

        const fields = {
            userId: { stringValue: userId },
            type: { stringValue: notificationData.type || 'system' },
            title: { stringValue: notificationData.title },
            message: { stringValue: notificationData.message },
            read: { booleanValue: false },
            createdAt: { timestampValue: new Date().toISOString() }
        };

        if (notificationData.link) {
            fields.link = { stringValue: notificationData.link };
        }

        const response = await axios.post(url, { fields });

        const docId = response.data.name.split('/').pop();
        return docId;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

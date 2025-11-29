import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    updateDoc,
    doc,
    deleteDoc,
    getDocs,
    getDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Message {
    id: string;
    fromUserId: string;
    fromUsername: string;
    fromDisplayName: string;
    fromAvatarUrl?: string;
    toUserId: string;
    toUsername: string;
    toDisplayName: string;
    subject: string;
    body: string;
    isRead: boolean;
    isStarred: boolean;
    isArchived: boolean;
    isTrashed: boolean;
    isDraft: boolean;
    folder?: string;
    labels?: string[];
    createdAt: Date;
    updatedAt: Date;
    // Reply thread support
    threadId?: string; // ID of the original message if this is a reply
    replyToId?: string; // Direct parent message ID
    replies?: Message[]; // Child replies (for client-side use only, not stored)
}

export interface ReplyToken {
    id: string;
    token: string;
    messageId: string;
    authorizedUserId: string; // Only this user can access the reply link
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}

const MESSAGES_COLLECTION = 'messages';

// Send a new message
export const sendMessage = async (
    fromUserId: string,
    fromUsername: string,
    fromDisplayName: string,
    fromAvatarUrl: string | undefined,
    toUserId: string,
    toUsername: string,
    toDisplayName: string,
    subject: string,
    body: string
): Promise<string> => {
    try {
        const messageData = {
            fromUserId,
            fromUsername,
            fromDisplayName,
            fromAvatarUrl: fromAvatarUrl || null,
            toUserId,
            toUsername,
            toDisplayName,
            subject,
            body,
            isRead: false,
            isStarred: false,
            isArchived: false,
            isTrashed: false,
            isDraft: false,
            folder: null,
            labels: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);
        return docRef.id;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// Get inbox messages for a user (exclude replies - they're shown nested)
export const getInboxMessages = async (userId: string): Promise<Message[]> => {
    try {
        const q = query(
            collection(db, MESSAGES_COLLECTION),
            where('toUserId', '==', userId),
            where('isTrashed', '==', false),
            where('isArchived', '==', false),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        // Filter out replies (messages with replyToId) - they'll be shown nested under parent
        const allMessages = querySnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            } as Message));

        return allMessages.filter(msg => !msg.replyToId);
    } catch (error) {
        console.error('Error getting inbox messages:', error);
        throw error;
    }
};

// Get sent messages for a user (exclude replies)
export const getSentMessages = async (userId: string): Promise<Message[]> => {
    try {
        const q = query(
            collection(db, MESSAGES_COLLECTION),
            where('fromUserId', '==', userId),
            where('isTrashed', '==', false),
            where('isDraft', '==', false),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const allMessages = querySnapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            } as Message));

        return allMessages.filter(msg => !msg.replyToId);
    } catch (error) {
        console.error('Error getting sent messages:', error);
        throw error;
    }
};

// Get starred messages
export const getStarredMessages = async (userId: string): Promise<Message[]> => {
    try {
        // Get received starred messages
        const qReceived = query(
            collection(db, MESSAGES_COLLECTION),
            where('toUserId', '==', userId),
            where('isStarred', '==', true),
            where('isTrashed', '==', false),
            orderBy('createdAt', 'desc')
        );

        // Get sent starred messages
        const qSent = query(
            collection(db, MESSAGES_COLLECTION),
            where('fromUserId', '==', userId),
            where('isStarred', '==', true),
            where('isTrashed', '==', false),
            orderBy('createdAt', 'desc')
        );

        const [receivedSnapshot, sentSnapshot] = await Promise.all([
            getDocs(qReceived),
            getDocs(qSent)
        ]);

        const allMessages = [
            ...receivedSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            } as Message)),
            ...sentSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            } as Message))
        ];

        // Filter out replies and sort by createdAt desc
        const messages = allMessages.filter(msg => !msg.replyToId);
        return messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error('Error getting starred messages:', error);
        throw error;
    }
};

// Get trashed messages
export const getTrashedMessages = async (userId: string): Promise<Message[]> => {
    try {
        // Get received trashed messages
        const qReceived = query(
            collection(db, MESSAGES_COLLECTION),
            where('toUserId', '==', userId),
            where('isTrashed', '==', true),
            orderBy('createdAt', 'desc')
        );

        // Get sent trashed messages
        const qSent = query(
            collection(db, MESSAGES_COLLECTION),
            where('fromUserId', '==', userId),
            where('isTrashed', '==', true),
            orderBy('createdAt', 'desc')
        );

        const [receivedSnapshot, sentSnapshot] = await Promise.all([
            getDocs(qReceived),
            getDocs(qSent)
        ]);

        const allMessages = [
            ...receivedSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            } as Message)),
            ...sentSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            } as Message))
        ];

        // Filter out replies and sort by createdAt desc
        const messages = allMessages.filter(msg => !msg.replyToId);
        return messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
        console.error('Error getting trashed messages:', error);
        throw error;
    }
};

// Get a single message
export const getMessage = async (messageId: string): Promise<Message | null> => {
    try {
        const docRef = doc(db, MESSAGES_COLLECTION, messageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data(),
                createdAt: docSnap.data().createdAt?.toDate() || new Date(),
                updatedAt: docSnap.data().updatedAt?.toDate() || new Date()
            } as Message;
        }
        return null;
    } catch (error) {
        console.error('Error getting message:', error);
        throw error;
    }
};

// Mark message as read
export const markAsRead = async (messageId: string): Promise<void> => {
    try {
        const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
        await updateDoc(messageRef, {
            isRead: true,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
        throw error;
    }
};

// Mark message as unread
export const markAsUnread = async (messageId: string): Promise<void> => {
    try {
        const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
        await updateDoc(messageRef, {
            isRead: false,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error marking message as unread:', error);
        throw error;
    }
};

// Toggle star
export const toggleStar = async (messageId: string, isStarred: boolean): Promise<void> => {
    try {
        const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
        await updateDoc(messageRef, {
            isStarred: !isStarred,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error toggling star:', error);
        throw error;
    }
};

// Move to trash
export const moveToTrash = async (messageId: string): Promise<void> => {
    try {
        const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
        await updateDoc(messageRef, {
            isTrashed: true,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error moving message to trash:', error);
        throw error;
    }
};

// Archive message
export const archiveMessage = async (messageId: string): Promise<void> => {
    try {
        const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
        await updateDoc(messageRef, {
            isArchived: true,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error archiving message:', error);
        throw error;
    }
};

// Delete message permanently
export const deleteMessage = async (messageId: string): Promise<void> => {
    try {
        const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
        await deleteDoc(messageRef);
    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
};

// Get unread count
export const getUnreadCount = async (userId: string): Promise<number> => {
    try {
        const q = query(
            collection(db, MESSAGES_COLLECTION),
            where('toUserId', '==', userId),
            where('isRead', '==', false),
            where('isTrashed', '==', false)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

// Subscribe to inbox messages (real-time)
export const subscribeToInboxMessages = (
    userId: string,
    callback: (messages: Message[]) => void
): (() => void) => {
    const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('toUserId', '==', userId),
        where('isTrashed', '==', false),
        where('isArchived', '==', false),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Message[];
        callback(messages);
    });
};

// Subscribe to unread count (real-time)
export const subscribeToUnreadCount = (
    userId: string,
    callback: (count: number) => void
): (() => void) => {
    const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('toUserId', '==', userId),
        where('isRead', '==', false),
        where('isTrashed', '==', false)
    );

    return onSnapshot(q, (querySnapshot) => {
        callback(querySnapshot.size);
    });
};

// Reply token functions
const REPLY_TOKENS_COLLECTION = 'replyTokens';

// Generate a unique reply token
export const generateReplyToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Create a reply token for a message
export const createReplyToken = async (
    messageId: string,
    authorizedUserId: string
): Promise<string> => {
    // First, invalidate all existing active tokens for this message and user (single token slot)
    const existingTokensQuery = query(
        collection(db, REPLY_TOKENS_COLLECTION),
        where('messageId', '==', messageId),
        where('authorizedUserId', '==', authorizedUserId),
        where('used', '==', false)
    );

    const existingTokensSnapshot = await getDocs(existingTokensQuery);
    const invalidatePromises = existingTokensSnapshot.docs.map(doc =>
        updateDoc(doc.ref, { used: true })
    );
    await Promise.all(invalidatePromises);

    // Now create the new token
    const token = generateReplyToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

    await addDoc(collection(db, REPLY_TOKENS_COLLECTION), {
        token,
        messageId,
        authorizedUserId,
        expiresAt,
        used: false,
        createdAt: serverTimestamp()
    });

    return token;
};

// Validate and get reply token
export const validateReplyToken = async (
    token: string,
    userId: string
): Promise<{ valid: boolean; messageId?: string }> => {
    try {
        const q = query(
            collection(db, REPLY_TOKENS_COLLECTION),
            where('token', '==', token),
            where('authorizedUserId', '==', userId)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return { valid: false };
        }

        const tokenData = snapshot.docs[0].data();
        const expiresAt = tokenData.expiresAt?.toDate();

        // Check if token is expired or used
        if (tokenData.used || (expiresAt && expiresAt < new Date())) {
            return { valid: false };
        }

        return { valid: true, messageId: tokenData.messageId };
    } catch (error) {
        console.error('Error validating reply token:', error);
        return { valid: false };
    }
};

// Mark token as used
export const markTokenAsUsed = async (token: string): Promise<void> => {
    try {
        const q = query(
            collection(db, REPLY_TOKENS_COLLECTION),
            where('token', '==', token)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const tokenDoc = snapshot.docs[0];
            await updateDoc(doc(db, REPLY_TOKENS_COLLECTION, tokenDoc.id), {
                used: true
            });
        }
    } catch (error) {
        console.error('Error marking token as used:', error);
        throw error;
    }
};

// Send a reply to a message
export const sendReply = async (
    messageId: string,
    fromUserId: string,
    fromUsername: string,
    fromDisplayName: string,
    fromAvatarUrl: string | undefined,
    toUserId: string,
    toUsername: string,
    toDisplayName: string,
    body: string,
    token?: string
): Promise<void> => {
    try {
        // Get the original message to get thread info
        const originalMessage = await getMessage(messageId);
        if (!originalMessage) {
            throw new Error('Original message not found');
        }

        // Create the reply
        const threadId = originalMessage.threadId || messageId;
        await addDoc(collection(db, MESSAGES_COLLECTION), {
            fromUserId,
            fromUsername,
            fromDisplayName,
            fromAvatarUrl: fromAvatarUrl || null,
            toUserId,
            toUsername,
            toDisplayName,
            subject: originalMessage.subject, // Keep same subject
            body,
            isRead: false,
            isStarred: false,
            isArchived: false,
            isTrashed: false,
            isDraft: false,
            threadId, // Link to thread
            replyToId: messageId, // Direct parent
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Mark token as used if provided
        if (token) {
            await markTokenAsUsed(token);
        }
    } catch (error) {
        console.error('Error sending reply:', error);
        throw error;
    }
};

// Get all messages in a thread
export const getThreadMessages = async (threadId: string): Promise<Message[]> => {
    try {
        const q = query(
            collection(db, MESSAGES_COLLECTION),
            where('threadId', '==', threadId),
            orderBy('createdAt', 'asc')
        );

        const snapshot = await getDocs(q);
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Message[];

        return messages;
    } catch (error) {
        console.error('Error getting thread messages:', error);
        return [];
    }
};

// Get reply count for a message
export const getReplyCount = async (messageId: string): Promise<number> => {
    try {
        const threadId = messageId; // The original message is the threadId
        const q = query(
            collection(db, MESSAGES_COLLECTION),
            where('threadId', '==', threadId)
        );

        const snapshot = await getDocs(q);
        // Exclude the original message itself
        return snapshot.docs.filter(doc => doc.id !== messageId).length;
    } catch (error) {
        console.error('Error getting reply count:', error);
        return 0;
    }
};

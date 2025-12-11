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
    setDoc,
    serverTimestamp,
    increment
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
    body: string;
    isRead: boolean;
    conversationId: string;
    createdAt: Date;
}

export interface Conversation {
    id: string;
    participants: string[];
    lastMessage: {
        body: string;
        fromUserId: string;
        createdAt: Date;
        isRead: boolean;
    };
    unreadCount: {
        [userId: string]: number;
    };
    updatedAt: Date;
    participantDetails: {
        [userId: string]: {
            username: string;
            displayName: string;
            atName?: string;
            avatarUrl?: string | null;
        }
    };
    acceptedParticipants: string[]; // List of users who have accepted the chat
}

const MESSAGES_COLLECTION = 'messages';
const CONVERSATIONS_COLLECTION = 'conversations';

// Helper to get consistent conversation ID
export const getConversationId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
};

// Send a new message (and update conversation)
export const sendMessage = async (
    fromUserId: string,
    fromUsername: string,
    fromDisplayName: string,
    fromAtName: string | undefined,
    fromAvatarUrl: string | undefined,
    toUserId: string,
    toUsername: string,
    toDisplayName: string,
    toAtName: string | undefined,
    toAvatarUrl: string | undefined,
    body: string
): Promise<string> => {
    try {
        const conversationId = getConversationId(fromUserId, toUserId);

        // 1. Add message
        const messageData = {
            fromUserId,
            fromUsername,
            fromDisplayName,
            fromAvatarUrl: fromAvatarUrl || null,
            toUserId,
            toUsername,
            toDisplayName,
            body,
            isRead: false,
            conversationId,
            createdAt: serverTimestamp(),
        };

        const messageRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);

        // 2. Update or Create Conversation
        const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
        const conversationSnap = await getDoc(conversationRef);

        const participantDetails = {
            [fromUserId]: {
                username: fromUsername,
                displayName: fromDisplayName,
                atName: fromAtName,
                avatarUrl: fromAvatarUrl || null
            },
            [toUserId]: {
                username: toUsername,
                displayName: toDisplayName,
                atName: toAtName,
                avatarUrl: toAvatarUrl || null
            }
        };

        if (!conversationSnap.exists()) {
            // Create new conversation
            await setDoc(conversationRef, {
                participants: [fromUserId, toUserId],
                lastMessage: {
                    body,
                    fromUserId,
                    createdAt: serverTimestamp(),
                    isRead: false
                },
                unreadCount: {
                    [fromUserId]: 0,
                    [toUserId]: 1
                },
                updatedAt: serverTimestamp(),
                participantDetails,
                acceptedParticipants: [fromUserId] // Sender implicitly accepts
            });
        } else {
            // Update existing conversation
            // We need to preserve existing participant details if we don't have them
            const existingData = conversationSnap.data() as Conversation;

            // Merge participant details carefully
            const updatedParticipantDetails = { ...existingData.participantDetails };

            // Update sender
            updatedParticipantDetails[fromUserId] = participantDetails[fromUserId];

            // Update receiver ONLY if we have new info (e.g. avatar is not null) OR if it's missing
            if (participantDetails[toUserId].avatarUrl || !updatedParticipantDetails[toUserId]) {
                updatedParticipantDetails[toUserId] = {
                    ...updatedParticipantDetails[toUserId],
                    ...participantDetails[toUserId]
                };
            }

            await updateDoc(conversationRef, {
                lastMessage: {
                    body,
                    fromUserId,
                    createdAt: serverTimestamp(),
                    isRead: false
                },
                [`unreadCount.${toUserId}`]: increment(1),
                updatedAt: serverTimestamp(),
                participantDetails: updatedParticipantDetails
                // We don't change acceptedParticipants here, unless we want to re-open a blocked chat?
                // For now, assume status persists.
            });
        }

        return messageRef.id;

    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// Accept conversation
export const acceptConversation = async (conversationId: string, userId: string): Promise<void> => {
    try {
        const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
        const conversationSnap = await getDoc(conversationRef);

        if (conversationSnap.exists()) {
            const data = conversationSnap.data() as Conversation;
            const acceptedParticipants = data.acceptedParticipants || [];

            if (!acceptedParticipants.includes(userId)) {
                await updateDoc(conversationRef, {
                    acceptedParticipants: [...acceptedParticipants, userId]
                });
            }
        }
    } catch (error) {
        console.error('Error accepting conversation:', error);
        throw error;
    }
};

// Get conversations for a user
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
    try {
        const q = query(
            collection(db, CONVERSATIONS_COLLECTION),
            where('participants', 'array-contains', userId),
            orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            lastMessage: {
                ...doc.data().lastMessage,
                createdAt: doc.data().lastMessage?.createdAt?.toDate() || new Date()
            }
        } as Conversation));
    } catch (error) {
        console.error('Error getting conversations:', error);
        throw error;
    }
};

// Subscribe to conversations (real-time)
export const subscribeToConversations = (
    userId: string,
    callback: (conversations: Conversation[]) => void
): (() => void) => {
    const q = query(
        collection(db, CONVERSATIONS_COLLECTION),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
        const conversations = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            lastMessage: {
                ...doc.data().lastMessage,
                createdAt: doc.data().lastMessage?.createdAt?.toDate() || new Date()
            }
        } as Conversation));
        callback(conversations);
    });
};

// Get messages for a conversation
export const getConversationMessages = async (conversationId: string): Promise<Message[]> => {
    try {
        const q = query(
            collection(db, MESSAGES_COLLECTION),
            where('conversationId', '==', conversationId),
            orderBy('createdAt', 'asc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Message));
    } catch (error) {
        console.error('Error getting conversation messages:', error);
        throw error;
    }
};

// Subscribe to conversation messages (real-time)
export const subscribeToConversation = (
    conversationId: string,
    callback: (messages: Message[]) => void
): (() => void) => {
    const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
        const messages = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Message));
        callback(messages);
    });
};

// Mark message as read
export const markAsRead = async (messageId: string): Promise<void> => {
    try {
        const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
        const messageSnap = await getDoc(messageRef);

        if (messageSnap.exists() && !messageSnap.data().isRead) {
            const data = messageSnap.data();
            await updateDoc(messageRef, { isRead: true });

            // Decrement unread count in conversation
            const conversationRef = doc(db, CONVERSATIONS_COLLECTION, data.conversationId);
            await updateDoc(conversationRef, {
                [`unreadCount.${data.toUserId}`]: increment(-1)
            });
        }
    } catch (error) {
        console.error('Error marking message as read:', error);
        throw error;
    }
};

// Delete message
export const deleteMessage = async (messageId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, MESSAGES_COLLECTION, messageId));
    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
};

// Delete conversation
export const deleteConversation = async (conversationId: string): Promise<void> => {
    try {
        // Delete the conversation document
        await deleteDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId));

        // Note: We should also delete messages, but for now we'll leave them orphaned 
        // or handle via a cloud function trigger.
    } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
    }
};

// Get total unread count for user
export const getUnreadCount = async (userId: string): Promise<number> => {
    try {
        // We can sum up unread counts from conversations
        const q = query(
            collection(db, CONVERSATIONS_COLLECTION),
            where('participants', 'array-contains', userId)
        );

        const snapshot = await getDocs(q);
        let total = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            total += data.unreadCount?.[userId] || 0;
        });
        return total;
    } catch (error) {
        console.error('Error getting unread count:', error);
        return 0;
    }
};

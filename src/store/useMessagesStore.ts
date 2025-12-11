import { create } from 'zustand';
import type { Message } from '../collections/messages';
import {
    getUserConversations,
    getConversationMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    getUnreadCount,
    subscribeToConversations,
    subscribeToConversation,
    getConversationId,
    acceptConversation,
} from '../collections/messages';

interface Conversation {
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
    acceptedParticipants?: string[];
}

interface MessagesState {
    conversations: Conversation[];
    messages: Message[];
    selectedConversationId: string | null;
    isLoading: boolean;
    error: string | null;
    unsubscribeConversations: (() => void) | null;
    unsubscribeConversation: (() => void) | null;

    fetchConversations: (userId: string) => Promise<void>;
    fetchConversationMessages: (conversationId: string) => Promise<void>;
    sendDirectMessage: (
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
    ) => Promise<string>;
    acceptChat: (conversationId: string, userId: string) => Promise<void>;
    removeConversation: (conversationId: string) => Promise<void>;
    markMessageRead: (messageId: string) => Promise<void>;
    deleteMessageById: (messageId: string) => Promise<void>;
    fetchUnreadCount: (userId: string) => Promise<number>;
    startConversationSubscription: (userId: string) => void;
    startMessagesSubscription: (conversationId: string) => void;
    stopSubscriptions: () => void;
    setSelectedConversation: (conversationId: string | null) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
    conversations: [],
    messages: [],
    selectedConversationId: null,
    isLoading: false,
    error: null,
    unsubscribeConversations: null,
    unsubscribeConversation: null,

    fetchConversations: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const conversations = await getUserConversations(userId);
            set({ conversations, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load conversations',
                isLoading: false,
            });
        }
    },

    fetchConversationMessages: async (conversationId: string) => {
        set({ isLoading: true, error: null, selectedConversationId: conversationId });
        try {
            const messages = await getConversationMessages(conversationId);
            set({ messages, isLoading: false });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to load messages',
                isLoading: false,
            });
        }
    },

    sendDirectMessage: async (
        fromUserId,
        fromUsername,
        fromDisplayName,
        fromAtName,
        fromAvatarUrl,
        toUserId,
        toUsername,
        toDisplayName,
        toAtName,
        toAvatarUrl,
        body
    ) => {
        const messageId = await sendMessage(
            fromUserId,
            fromUsername,
            fromDisplayName,
            fromAtName,
            fromAvatarUrl,
            toUserId,
            toUsername,
            toDisplayName,
            toAtName,
            toAvatarUrl,
            body
        );

        // Optimistic update if we are in the conversation
        const convoId = getConversationId(fromUserId, toUserId);
        if (get().selectedConversationId === convoId) {
            // We don't need to manually add if subscription is active, but good for responsiveness
            // Actually, subscription is better.
        }

        return messageId;
    },

    acceptChat: async (conversationId: string, userId: string) => {
        await acceptConversation(conversationId, userId);
        // Optimistic update
        set({
            conversations: get().conversations.map((c) => {
                if (c.id === conversationId) {
                    const accepted = c.acceptedParticipants || [];
                    if (!accepted.includes(userId)) {
                        return { ...c, acceptedParticipants: [...accepted, userId] };
                    }
                }
                return c;
            }),
        });
    },

    removeConversation: async (conversationId: string) => {
        // We need to import deleteConversation dynamically or add it to imports
        // Since we can't change imports easily in this block, let's assume it's imported or use the one from collections
        const { deleteConversation } = await import('../collections/messages');
        await deleteConversation(conversationId);

        set({
            conversations: get().conversations.filter(c => c.id !== conversationId),
            selectedConversationId: get().selectedConversationId === conversationId ? null : get().selectedConversationId,
            messages: get().selectedConversationId === conversationId ? [] : get().messages
        });
    },

    markMessageRead: async (messageId: string) => {
        await markAsRead(messageId);
        // Optimistic update
        set({
            messages: get().messages.map((m) => (m.id === messageId ? { ...m, isRead: true } : m)),
        });
    },

    deleteMessageById: async (messageId: string) => {
        await deleteMessage(messageId);
        set({ messages: get().messages.filter((m) => m.id !== messageId) });
    },

    fetchUnreadCount: async (userId: string) => {
        return getUnreadCount(userId);
    },

    startConversationSubscription: (userId: string) => {
        // Unsubscribe previous if any
        get().unsubscribeConversations?.();

        const unsub = subscribeToConversations(userId, (conversations) => {
            set({ conversations });
        });
        set({ unsubscribeConversations: unsub });
    },

    startMessagesSubscription: (conversationId: string) => {
        // Unsubscribe previous if any
        get().unsubscribeConversation?.();

        const unsub = subscribeToConversation(conversationId, (messages) => {
            set({ messages, selectedConversationId: conversationId });
        });
        set({ unsubscribeConversation: unsub, selectedConversationId: conversationId });
    },

    stopSubscriptions: () => {
        get().unsubscribeConversations?.();
        get().unsubscribeConversation?.();
        set({ unsubscribeConversations: null, unsubscribeConversation: null });
    },

    setSelectedConversation: (conversationId: string | null) => set({ selectedConversationId: conversationId }),
}));

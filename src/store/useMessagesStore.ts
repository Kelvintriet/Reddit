import { create } from 'zustand';
import type { Message } from '../collections/messages';
import { getInboxMessages, getSentMessages, getStarredMessages, getTrashedMessages, getMessage, sendMessage, markAsRead, markAsUnread, toggleStar, moveToTrash, archiveMessage, getUnreadCount, subscribeToInboxMessages, subscribeToUnreadCount, getThreadMessages } from '../collections/messages';

interface MessagesState {
    messages: Message[];
    selectedMessage: Message | null;
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    currentView: 'inbox' | 'sent' | 'starred' | 'trash';
    unsubscribeInbox: (() => void) | null;
    unsubscribeUnread: (() => void) | null;

    // Actions
    fetchInboxMessages: (userId: string) => Promise<void>;
    fetchSentMessages: (userId: string) => Promise<void>;
    fetchStarredMessages: (userId: string) => Promise<void>;
    fetchTrashedMessages: (userId: string) => Promise<void>;
    selectMessage: (messageId: string) => Promise<void>;
    sendNewMessage: (fromUserId: string, fromUsername: string, fromDisplayName: string, fromAvatarUrl: string | undefined, toUserId: string, toUsername: string, toDisplayName: string, subject: string, body: string) => Promise<void>;
    markMessageAsRead: (messageId: string) => Promise<void>;
    markMessageAsUnread: (messageId: string) => Promise<void>;
    toggleMessageStar: (messageId: string, isStarred: boolean) => Promise<void>;
    moveMessageToTrash: (messageId: string) => Promise<void>;
    archiveMessageAction: (messageId: string) => Promise<void>;
    fetchUnreadCount: (userId: string) => Promise<void>;
    setCurrentView: (view: 'inbox' | 'sent' | 'starred' | 'trash') => void;
    subscribeToMessages: (userId: string) => void;
    unsubscribeFromMessages: () => void;
    clearSelection: () => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
    messages: [],
    selectedMessage: null,
    unreadCount: 0,
    isLoading: false,
    error: null,
    currentView: 'inbox',
    unsubscribeInbox: null,
    unsubscribeUnread: null,

    fetchInboxMessages: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const messages = await getInboxMessages(userId);
            set({ messages, isLoading: false });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch messages', isLoading: false });
        }
    },

    fetchSentMessages: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const messages = await getSentMessages(userId);
            set({ messages, isLoading: false });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch sent messages', isLoading: false });
        }
    },

    fetchStarredMessages: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const messages = await getStarredMessages(userId);
            set({ messages, isLoading: false });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch starred messages', isLoading: false });
        }
    },

    fetchTrashedMessages: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            const messages = await getTrashedMessages(userId);
            set({ messages, isLoading: false });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch trashed messages', isLoading: false });
        }
    },

    selectMessage: async (messageId: string) => {
        set({ isLoading: true, error: null });
        try {
            const message = await getMessage(messageId);

            // Load thread messages if this message is part of a thread or has replies
            if (message) {
                const threadId = message.threadId || messageId;
                const threadMessages = await getThreadMessages(threadId);

                // Attach replies to the message
                message.replies = threadMessages.filter(m => m.id !== message.id);
            }

            set({ selectedMessage: message, isLoading: false });

            // Mark as read if not already read
            if (message && !message.isRead) {
                await markAsRead(messageId);
                // Update the message in the list
                const messages = get().messages.map(m =>
                    m.id === messageId ? { ...m, isRead: true } : m
                );
                set({ messages });
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch message', isLoading: false });
        }
    },

    sendNewMessage: async (fromUserId: string, fromUsername: string, fromDisplayName: string, fromAvatarUrl: string | undefined, toUserId: string, toUsername: string, toDisplayName: string, subject: string, body: string) => {
        set({ isLoading: true, error: null });
        try {
            await sendMessage(fromUserId, fromUsername, fromDisplayName, fromAvatarUrl, toUserId, toUsername, toDisplayName, subject, body);
            set({ isLoading: false });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to send message', isLoading: false });
            throw error;
        }
    },

    markMessageAsRead: async (messageId: string) => {
        try {
            await markAsRead(messageId);
            const messages = get().messages.map(m =>
                m.id === messageId ? { ...m, isRead: true } : m
            );
            set({ messages });

            if (get().selectedMessage?.id === messageId) {
                set({ selectedMessage: { ...get().selectedMessage!, isRead: true } });
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to mark as read' });
        }
    },

    markMessageAsUnread: async (messageId: string) => {
        try {
            await markAsUnread(messageId);
            const messages = get().messages.map(m =>
                m.id === messageId ? { ...m, isRead: false } : m
            );
            set({ messages });

            if (get().selectedMessage?.id === messageId) {
                set({ selectedMessage: { ...get().selectedMessage!, isRead: false } });
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to mark as unread' });
        }
    },

    toggleMessageStar: async (messageId: string, isStarred: boolean) => {
        try {
            await toggleStar(messageId, isStarred);
            const messages = get().messages.map(m =>
                m.id === messageId ? { ...m, isStarred: !isStarred } : m
            );
            set({ messages });

            if (get().selectedMessage?.id === messageId) {
                set({ selectedMessage: { ...get().selectedMessage!, isStarred: !isStarred } });
            }
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to toggle star' });
        }
    },

    moveMessageToTrash: async (messageId: string) => {
        try {
            await moveToTrash(messageId);
            const messages = get().messages.filter(m => m.id !== messageId);
            set({ messages, selectedMessage: null });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to move to trash' });
        }
    },

    archiveMessageAction: async (messageId: string) => {
        try {
            await archiveMessage(messageId);
            const messages = get().messages.filter(m => m.id !== messageId);
            set({ messages, selectedMessage: null });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to archive message' });
        }
    },

    fetchUnreadCount: async (userId: string) => {
        try {
            const count = await getUnreadCount(userId);
            set({ unreadCount: count });
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    },

    setCurrentView: (view: 'inbox' | 'sent' | 'starred' | 'trash') => {
        set({ currentView: view, selectedMessage: null });
    },

    subscribeToMessages: (userId: string) => {
        // Unsubscribe from previous subscriptions
        get().unsubscribeFromMessages();

        // Subscribe to inbox messages
        const unsubInbox = subscribeToInboxMessages(userId, (messages) => {
            set({ messages });
        });

        // Subscribe to unread count
        const unsubUnread = subscribeToUnreadCount(userId, (count) => {
            set({ unreadCount: count });
        });

        set({ unsubscribeInbox: unsubInbox, unsubscribeUnread: unsubUnread });
    },

    unsubscribeFromMessages: () => {
        const { unsubscribeInbox, unsubscribeUnread } = get();
        if (unsubscribeInbox) unsubscribeInbox();
        if (unsubscribeUnread) unsubscribeUnread();
        set({ unsubscribeInbox: null, unsubscribeUnread: null });
    },

    clearSelection: () => {
        set({ selectedMessage: null });
    }
}));

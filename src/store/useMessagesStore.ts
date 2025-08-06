import { create } from 'zustand';
import type {
  Message,
  Conversation
} from '../collections/messages';
import {
  sendMessage as sendMessageAPI,
  getUserMessages,
  getConversation,
  markMessageAsRead,
  deleteMessage,
  getUserConversations,
  getUnreadMessageCount,
  subscribeToUserMessages
} from '../collections/messages';
import { useAuthStore } from './authStore';

interface MessagesState {
  // State
  messages: Message[];
  sentMessages: Message[];
  conversations: Conversation[];
  currentConversation: Message[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Real-time subscription
  unsubscribeMessages: (() => void) | null;

  // Actions
  fetchInboxMessages: () => Promise<void>;
  fetchSentMessages: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchConversation: (otherUserId: string) => Promise<void>;
  sendMessage: (messageData: {
    receiverId: string;
    receiverUsername: string;
    subject: string;
    content: string;
    type?: 'message' | 'system' | 'notification';
  }) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  subscribeToMessages: () => void;
  unsubscribeFromMessages: () => void;
  clearError: () => void;
  setCurrentConversation: (messages: Message[]) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  // Initial state
  messages: [],
  sentMessages: [],
  conversations: [],
  currentConversation: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  unsubscribeMessages: null,

  // Fetch inbox messages
  fetchInboxMessages: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const messages = await getUserMessages(user.uid, 'inbox');
      set({ messages, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
        isLoading: false 
      });
    }
  },

  // Fetch sent messages
  fetchSentMessages: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const sentMessages = await getUserMessages(user.uid, 'sent');
      set({ sentMessages, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch sent messages',
        isLoading: false 
      });
    }
  },

  // Fetch conversations
  fetchConversations: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const conversations = await getUserConversations(user.uid);
      set({ conversations, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch conversations',
        isLoading: false 
      });
    }
  },

  // Fetch conversation with specific user
  fetchConversation: async (otherUserId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const conversation = await getConversation(user.uid, otherUserId);
      set({ currentConversation: conversation, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch conversation',
        isLoading: false 
      });
    }
  },

  // Send message
  sendMessage: async (messageData) => {
    try {
      set({ isLoading: true, error: null });
      
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      await sendMessageAPI({
        senderId: user.uid,
        senderUsername: user.username || user.displayName || 'Unknown',
        senderAvatarUrl: user.avatarUrl || user.photoURL,
        ...messageData
      });

      // Refresh messages and conversations
      await Promise.all([
        get().fetchInboxMessages(),
        get().fetchSentMessages(),
        get().fetchConversations(),
        get().fetchUnreadCount()
      ]);

      set({ isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false 
      });
    }
  },

  // Mark message as read
  markAsRead: async (messageId: string) => {
    try {
      await markMessageAsRead(messageId);
      
      // Update local state
      set(state => ({
        messages: state.messages.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        ),
        currentConversation: state.currentConversation.map(msg => 
          msg.id === messageId ? { ...msg, isRead: true } : msg
        )
      }));

      // Refresh unread count
      await get().fetchUnreadCount();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to mark message as read'
      });
    }
  },

  // Delete message
  deleteMessage: async (messageId: string) => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      await deleteMessage(messageId, user.uid);
      
      // Remove from local state
      set(state => ({
        messages: state.messages.filter(msg => msg.id !== messageId),
        sentMessages: state.sentMessages.filter(msg => msg.id !== messageId),
        currentConversation: state.currentConversation.filter(msg => msg.id !== messageId)
      }));

      // Refresh conversations
      await get().fetchConversations();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete message'
      });
    }
  },

  // Fetch unread count
  fetchUnreadCount: async () => {
    try {
      const { user } = useAuthStore.getState();
      if (!user) return;

      const unreadCount = await getUnreadMessageCount(user.uid);
      set({ unreadCount });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  // Subscribe to real-time messages
  subscribeToMessages: () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    // Unsubscribe from previous subscription
    const currentUnsubscribe = get().unsubscribeMessages;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }

    // Subscribe to new messages
    const unsubscribe = subscribeToUserMessages(user.uid, (messages) => {
      set({ messages });
      // Update unread count
      get().fetchUnreadCount();
    });

    set({ unsubscribeMessages: unsubscribe });
  },

  // Unsubscribe from real-time messages
  unsubscribeFromMessages: () => {
    const unsubscribe = get().unsubscribeMessages;
    if (unsubscribe) {
      unsubscribe();
      set({ unsubscribeMessages: null });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Set current conversation
  setCurrentConversation: (messages: Message[]) => {
    set({ currentConversation: messages });
  }
}));

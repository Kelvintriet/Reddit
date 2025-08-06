import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  where, 
  deleteDoc, 
  addDoc, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  receiverId: string;
  receiverUsername: string;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  type: 'message' | 'system' | 'notification';
  parentMessageId?: string;
  isDeleted: boolean;
  deletedBy?: string[];
}

export interface Conversation {
  id: string;
  participants: string[];
  participantUsernames: string[];
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: { [userId: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

// Send a new message
export const sendMessage = async (messageData: {
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  receiverId: string;
  receiverUsername: string;
  subject: string;
  content: string;
  type?: 'message' | 'system' | 'notification';
  parentMessageId?: string;
}): Promise<string> => {
  try {
    // Validate required fields
    if (!messageData.senderId) {
      throw new Error('senderId is required');
    }
    if (!messageData.receiverId) {
      throw new Error('receiverId is required');
    }
    if (!messageData.subject) {
      throw new Error('subject is required');
    }
    if (!messageData.content) {
      throw new Error('content is required');
    }

    // Prevent sending message to self
    if (messageData.senderId === messageData.receiverId) {
      throw new Error('Không thể gửi tin nhắn cho chính mình');
    }

    const messagesRef = collection(db, 'messages');
    
    const message: Omit<Message, 'id'> = {
      ...messageData,
      type: messageData.type || 'message',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      deletedBy: []
    };

    const docRef = await addDoc(messagesRef, {
      ...message,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update or create conversation
    await updateConversation(messageData.senderId, messageData.receiverId, {
      lastMessage: messageData.content.substring(0, 100),
      lastMessageAt: new Date(),
      senderUsername: messageData.senderUsername,
      receiverUsername: messageData.receiverUsername
    });

    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get messages for a user (inbox)
export const getUserMessages = async (userId: string, type: 'inbox' | 'sent' = 'inbox'): Promise<Message[]> => {
  try {
    const messagesRef = collection(db, 'messages');
    const field = type === 'inbox' ? 'receiverId' : 'senderId';
    
    const q = query(
      messagesRef,
      where(field, '==', userId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Message);
    });

    return messages;
  } catch (error) {
    console.error('Error getting user messages:', error);
    throw error;
  }
};

// Get conversation between two users
export const getConversation = async (userId1: string, userId2: string): Promise<Message[]> => {
  try {
    const messagesRef = collection(db, 'messages');
    
    const q = query(
      messagesRef,
      where('isDeleted', '==', false),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const message = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Message;

      // Filter messages between the two users
      if (
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
      ) {
        messages.push(message);
      }
    });

    return messages;
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
};

// Mark message as read
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      isRead: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// Delete message (soft delete)
export const deleteMessage = async (messageId: string, userId: string): Promise<void> => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);
    
    if (!messageDoc.exists()) {
      throw new Error('Message not found');
    }

    const messageData = messageDoc.data() as Message;
    const deletedBy = messageData.deletedBy || [];
    
    // Add user to deletedBy array
    if (!deletedBy.includes(userId)) {
      deletedBy.push(userId);
    }

    // If both sender and receiver have deleted, mark as fully deleted
    const isFullyDeleted = deletedBy.includes(messageData.senderId) && deletedBy.includes(messageData.receiverId);

    await updateDoc(messageRef, {
      deletedBy,
      isDeleted: isFullyDeleted,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Update or create conversation
const updateConversation = async (
  userId1: string, 
  userId2: string, 
  data: {
    lastMessage: string;
    lastMessageAt: Date;
    senderUsername: string;
    receiverUsername: string;
  }
): Promise<void> => {
  try {
    const conversationId = [userId1, userId2].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);

    if (conversationDoc.exists()) {
      const existingData = conversationDoc.data() as Conversation;
      const unreadCount = existingData.unreadCount || {};
      
      // Increment unread count for receiver
      unreadCount[userId2] = (unreadCount[userId2] || 0) + 1;

      await updateDoc(conversationRef, {
        lastMessage: data.lastMessage,
        lastMessageAt: serverTimestamp(),
        unreadCount,
        updatedAt: serverTimestamp()
      });
    } else {
      const conversation: Omit<Conversation, 'id'> = {
        participants: [userId1, userId2],
        participantUsernames: [data.senderUsername, data.receiverUsername],
        lastMessage: data.lastMessage,
        lastMessageAt: data.lastMessageAt,
        unreadCount: { [userId2]: 1 },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(conversationRef, {
        ...conversation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
};

// Get user conversations
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const conversations: Conversation[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastMessageAt: data.lastMessageAt?.toDate() || new Date()
      } as Conversation);
    });

    return conversations;
  } catch (error) {
    console.error('Error getting user conversations:', error);
    throw error;
  }
};

// Get unread message count for user
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('receiverId', '==', userId),
      where('isRead', '==', false),
      where('isDeleted', '==', false)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    return 0;
  }
};

// Real-time listener for new messages
export const subscribeToUserMessages = (
  userId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('receiverId', '==', userId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages: Message[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Message);
    });
    callback(messages);
  });
};

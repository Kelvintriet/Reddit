import { WebSocketServer } from 'ws';

// Store active connections: userId -> WebSocket
const activeConnections = new Map();

// Store typing status: conversationId -> Set of userIds currently typing
const typingStatus = new Map();

export function initializeMessagingWebSocket(server) {
    const wss = new WebSocketServer({
        noServer: true
    });

    wss.on('connection', (ws, req) => {
        console.log('🔌 New messaging WebSocket connection');

        let userId = null;
        let currentConversationId = null;

        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());

                switch (message.type) {
                    case 'auth':
                        // Authenticate user
                        userId = message.userId;
                        activeConnections.set(userId, ws);
                        console.log(`✅ User ${userId} authenticated`);
                        ws.send(JSON.stringify({ type: 'auth_success', userId }));
                        break;

                    case 'join_conversation':
                        // Join a conversation
                        currentConversationId = message.conversationId;
                        console.log(`👥 User ${userId} joined conversation ${currentConversationId}`);
                        break;

                    case 'typing_start':
                        // User started typing
                        if (currentConversationId) {
                            if (!typingStatus.has(currentConversationId)) {
                                typingStatus.set(currentConversationId, new Set());
                            }
                            typingStatus.get(currentConversationId).add(userId);

                            // Broadcast to other users in conversation
                            broadcastToConversation(currentConversationId, userId, {
                                type: 'user_typing',
                                userId,
                                conversationId: currentConversationId,
                                isTyping: true
                            });
                        }
                        break;

                    case 'typing_stop':
                        // User stopped typing
                        if (currentConversationId && typingStatus.has(currentConversationId)) {
                            typingStatus.get(currentConversationId).delete(userId);

                            // Broadcast to other users in conversation
                            broadcastToConversation(currentConversationId, userId, {
                                type: 'user_typing',
                                userId,
                                conversationId: currentConversationId,
                                isTyping: false
                            });
                        }
                        break;

                    case 'new_message':
                        // New message sent - notify other users
                        if (currentConversationId) {
                            broadcastToConversation(currentConversationId, userId, {
                                type: 'new_message',
                                conversationId: currentConversationId,
                                message: message.message
                            });
                        }
                        break;

                    default:
                        console.log('Unknown message type:', message.type);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        ws.on('close', () => {
            console.log(`🔌 User ${userId} disconnected`);
            if (userId) {
                activeConnections.delete(userId);

                // Clean up typing status
                if (currentConversationId && typingStatus.has(currentConversationId)) {
                    typingStatus.get(currentConversationId).delete(userId);
                }
            }
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    console.log('✅ Messaging WebSocket server initialized at /ws/messaging');
    return wss;
}

// Broadcast message to all users in a conversation except sender
function broadcastToConversation(conversationId, senderId, message) {
    // In a real app, you'd query the database for conversation participants
    // For now, broadcast to all connected users except sender
    activeConnections.forEach((ws, userId) => {
        if (userId !== senderId && ws.readyState === 1) { // 1 = OPEN
            ws.send(JSON.stringify(message));
        }
    });
}

// Send notification to specific user
export function sendNotificationToUser(userId, notification) {
    const ws = activeConnections.get(userId);
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({
            type: 'notification',
            notification
        }));
    }
}

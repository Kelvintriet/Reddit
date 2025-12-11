import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

export function useMessagingWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const { user } = useAuthStore();
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!user) return;

        const connect = () => {
            const ws = new WebSocket(`${WS_URL}/ws/messaging`);

            ws.onopen = () => {
                console.log('✅ Connected to messaging WebSocket');
                setIsConnected(true);

                // Authenticate
                ws.send(JSON.stringify({
                    type: 'auth',
                    userId: user.uid
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    switch (data.type) {
                        case 'auth_success':
                            console.log('✅ Authenticated with messaging server');
                            break;

                        case 'user_typing':
                            setTypingUsers(prev => {
                                const newSet = new Set(prev);
                                if (data.isTyping) {
                                    newSet.add(data.userId);
                                } else {
                                    newSet.delete(data.userId);
                                }
                                return newSet;
                            });
                            break;

                        case 'new_message':
                            // Trigger message refresh
                            window.dispatchEvent(new CustomEvent('new-message', { detail: data }));
                            break;

                        case 'notification':
                            // Trigger notification
                            window.dispatchEvent(new CustomEvent('notification', { detail: data.notification }));
                            break;
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            ws.onclose = () => {
                console.log('🔌 Disconnected from messaging WebSocket');
                setIsConnected(false);

                // Attempt to reconnect after 3 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    console.log('🔄 Attempting to reconnect...');
                    connect();
                }, 3000);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [user]);

    const joinConversation = (conversationId: string) => {
        if (wsRef.current && isConnected) {
            wsRef.current.send(JSON.stringify({
                type: 'join_conversation',
                conversationId
            }));
        }
    };

    const startTyping = () => {
        if (wsRef.current && isConnected) {
            wsRef.current.send(JSON.stringify({
                type: 'typing_start'
            }));
        }
    };

    const stopTyping = () => {
        if (wsRef.current && isConnected) {
            wsRef.current.send(JSON.stringify({
                type: 'typing_stop'
            }));
        }
    };

    const sendMessage = (message: any) => {
        if (wsRef.current && isConnected) {
            wsRef.current.send(JSON.stringify({
                type: 'new_message',
                message
            }));
        }
    };

    return {
        isConnected,
        typingUsers,
        joinConversation,
        startTyping,
        stopTyping,
        sendMessage
    };
}

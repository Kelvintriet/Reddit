import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useMessagesStore } from '../store/useMessagesStore';
import { Mail, Send, Search, MoreVertical, Plus, ShieldAlert, CheckCircle, Trash2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { searchUsersByPartialName, getUserProfile } from '../collections/users';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './Inbox.css';

const Inbox = () => {
    const { user, isInitialized } = useAuthStore();
    const location = useLocation();
    const {
        conversations,
        messages,
        selectedConversationId,
        fetchConversations,
        sendDirectMessage,
        acceptChat,
        removeConversation,
        startConversationSubscription,
        startMessagesSubscription,
        stopSubscriptions,
        setSelectedConversation,
        markMessageRead
    } = useMessagesStore();

    const [messageInput, setMessageInput] = useState('');
    const [showNewChat, setShowNewChat] = useState(false);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
    const [newChatUser, setNewChatUser] = useState<any>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Handle navigation from Profile
    useEffect(() => {
        if (location.state?.startChatWith && user) {
            const targetUser = location.state.startChatWith;
            setNewChatUser(targetUser);
            startNewChat(targetUser);
            // Clear state to prevent re-running
            window.history.replaceState({}, document.title);
        }
    }, [location.state, user]);

    // Initial subscription
    useEffect(() => {
        if (user) {
            fetchConversations(user.uid);
            startConversationSubscription(user.uid);
        }
        return () => {
            stopSubscriptions();
        };
    }, [user]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Repair missing participant details
    useEffect(() => {
        if (!conversations || !user) return;

        const repairConversations = async () => {
            for (const conversation of conversations) {
                const otherUserId = conversation.participants.find((id: string) => id !== user.uid);
                if (otherUserId && (!conversation.participantDetails?.[otherUserId] || !conversation.participantDetails?.[otherUserId]?.displayName)) {
                    console.log('Repairing conversation:', conversation.id, 'missing user:', otherUserId);
                    try {
                        const userProfile = await getUserProfile(otherUserId);
                        if (userProfile) {
                            const conversationRef = doc(db, 'conversations', conversation.id);
                            const updatedDetails = {
                                ...conversation.participantDetails,
                                [otherUserId]: {
                                    username: userProfile.username || 'User',
                                    displayName: userProfile.displayName || 'User',
                                    avatarUrl: userProfile.avatarUrl || (userProfile as any).photoURL || null
                                }
                            };
                            await updateDoc(conversationRef, {
                                participantDetails: updatedDetails
                            });
                        }
                    } catch (error) {
                        console.error('Error repairing conversation:', error);
                    }
                }
            }
        };

        repairConversations();
    }, [conversations, user]);

    // Mark messages as read when viewing conversation
    useEffect(() => {
        if (selectedConversationId && messages.length > 0 && user) {
            const unreadMessages = messages.filter(m => !m.isRead && m.toUserId === user.uid);
            unreadMessages.forEach(m => markMessageRead(m.id));
        }
    }, [messages, selectedConversationId, user]);

    const handleConversationClick = (conversationId: string) => {
        setSelectedConversation(conversationId);
        startMessagesSubscription(conversationId);
        setShowNewChat(false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !user) return;

        const conversation = conversations.find(c => c.id === selectedConversationId);
        // If conversation doesn't exist in store yet (new chat), we need to rely on newChatUser
        
        let otherUserId = '';
        let otherUser = null;

        if (conversation) {
            otherUserId = conversation.participants.find(id => id !== user.uid) || '';
            otherUser = conversation.participantDetails[otherUserId];
        } else if (newChatUser) {
            otherUserId = newChatUser.id;
            otherUser = newChatUser;
        }

        if (!otherUserId) return;

        try {
            await sendDirectMessage(
                user.uid,
                user.username || user.displayName || 'Anonymous',
                user.displayName || user.username || 'Anonymous',
                user.avatarUrl || user.photoURL || undefined,
                otherUserId,
                otherUser?.username || 'User',
                otherUser?.displayName || 'User',
                otherUser?.avatarUrl || otherUser?.photoURL || undefined,
                messageInput.trim()
            );
            setMessageInput('');
            
            // If this was a new chat, we need to switch to the conversation view immediately
            // to enforce the "Waiting for acceptance" state.
            if (!conversation) {
                // We can try to find the conversation ID from the message ID or just calculate it
                // But sendDirectMessage returns messageId. 
                // We know the conversation ID is deterministic.
                const participants = [user.uid, otherUserId].sort();
                const newConvoId = participants.join('_');
                
                // Force update state to view this conversation
                setSelectedConversation(newConvoId);
                setShowNewChat(false);
                setNewChatUser(null);
                // Trigger subscription if not already
                startMessagesSubscription(newConvoId);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // New Chat Search
    const handleUserSearch = async (query: string) => {
        setUserSearchQuery(query);
        if (query.length < 2) {
            setUserSuggestions([]);
            return;
        }

        try {
            const results = await searchUsersByPartialName(query, 5);
            setUserSuggestions(results);
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const startNewChat = async (selectedUser: any) => {
        if (!user) return;

        // Check if conversation already exists
        const existingConversation = conversations.find(c => 
            c.participants.includes(selectedUser.id) && c.participants.includes(user.uid)
        );

        if (existingConversation) {
            handleConversationClick(existingConversation.id);
        } else {
            // Create a temporary conversation object or just set ID and let the store handle it
            // Since we need a conversation ID to send a message, we can calculate it
            setNewChatUser(selectedUser);
            const participants = [user.uid, selectedUser.id].sort();
            const newConvoId = participants.join('_');
            
            setSelectedConversation(newConvoId);
            startMessagesSubscription(newConvoId); // This will return empty list
            setShowNewChat(false);
            setUserSearchQuery('');
            setUserSuggestions([]);
        }
    };

    const getOtherParticipant = (conversation: any) => {
        if (!user) return null;
        const otherUserId = conversation.participants.find((id: string) => id !== user.uid);
        if (!otherUserId) return null;
        
        const details = conversation.participantDetails?.[otherUserId];
        if (details) return { ...details, id: otherUserId };
        
        // Fallback if details are missing but we have the ID
        return {
            id: otherUserId,
            displayName: 'Loading...',
            username: 'loading',
            avatarUrl: null
        };
    };

    if (!isInitialized) {
        return (
            <div className="inbox-container">
                <div className="inbox-empty">
                    <div className="loading-spinner"></div>
                    <h2>Loading...</h2>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="inbox-container">
                <div className="inbox-empty">
                    <Mail size={48} />
                    <h2>Please log in to view messages</h2>
                </div>
            </div>
        );
    }

    const selectedConversation = conversations.find(c => c.id === selectedConversationId);
    
    // Hack: If selectedConversation is null but selectedConversationId is set, 
    // it means it's a new chat. We need the user details.
    // I'll store the "new chat user" in a state.

    const handleNewChatSelect = (u: any) => {
        setNewChatUser(u);
        startNewChat(u);
    };

    const activeChatUser = selectedConversation 
        ? getOtherParticipant(selectedConversation) 
        : newChatUser;

    const isAccepted = selectedConversation?.acceptedParticipants?.includes(user?.uid || '');
    // If I am the sender, I am implicitly accepted. 
    // But if the OTHER person hasn't accepted, I might want to know.
    // Actually, the requirement is: "other user MUST accept the conversation, else, user will be blocked and cant chat"
    // This usually means the RECEIVER sees an "Accept" button.
    // The SENDER sees "Waiting for acceptance".
    
    const otherUserId = activeChatUser?.id || (selectedConversation?.participants.find((id: string) => id !== user?.uid));
    const isOtherAccepted = selectedConversation?.acceptedParticipants?.includes(otherUserId);

    // If it's a new chat (no conversation yet), we assume we can send the first message.
    const isNewChat = !selectedConversation;

    const handleAcceptChat = async () => {
        if (selectedConversationId && user) {
            await acceptChat(selectedConversationId, user.uid);
        }
    };

    const handleDeclineChat = async () => {
        if (selectedConversationId && user) {
            if (window.confirm('Are you sure you want to decline this chat? It will be deleted.')) {
                await removeConversation(selectedConversationId);
                setSelectedConversation(null);
            }
        }
    };

    const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this conversation?')) {
            await removeConversation(conversationId);
            if (selectedConversationId === conversationId) {
                setSelectedConversation(null);
            }
        }
        setActiveMenuId(null);
    };

    return (
        <div className="inbox-container" onClick={() => setActiveMenuId(null)}>
            {/* Sidebar - Conversation List */}
            <div className="inbox-sidebar">
                <div className="inbox-sidebar-header">
                    <h2>Chats</h2>
                    <button 
                        className="inbox-compose-btn" 
                        onClick={() => setShowNewChat(!showNewChat)}
                        title="Compose New Message"
                    >
                        <Plus size={18} />
                        <span>Compose</span>
                    </button>
                </div>

                {showNewChat && (
                    <div className="inbox-search-container">
                        <div className="inbox-search">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={userSearchQuery}
                                onChange={(e) => handleUserSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {userSuggestions.length > 0 && (
                            <div className="inbox-suggestions">
                                {userSuggestions.map(u => (
                                    <div 
                                        key={u.id} 
                                        className="inbox-suggestion-item"
                                        onClick={() => handleNewChatSelect(u)}
                                    >
                                        <div className="inbox-avatar-small">
                                            {u.avatarUrl ? (
                                                <img src={u.avatarUrl} alt={u.displayName} />
                                            ) : (
                                                <span>{u.displayName?.[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="inbox-suggestion-info">
                                            <span className="inbox-suggestion-name">{u.displayName}</span>
                                            <span className="inbox-suggestion-username">@{u.username}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="inbox-list-items">
                    {conversations.map(conversation => {
                        const otherUser = getOtherParticipant(conversation);
                        const isUnread = conversation.unreadCount?.[user.uid] > 0;
                        const isMenuOpen = activeMenuId === conversation.id;
                        
                        // Check if conversation is fully accepted
                        const isAcceptedByMe = conversation.acceptedParticipants?.includes(user.uid);
                        const otherUserId = conversation.participants.find(id => id !== user.uid);
                        const isAcceptedByOther = conversation.acceptedParticipants?.includes(otherUserId || '');
                        const isFullyAccepted = isAcceptedByMe && isAcceptedByOther;

                        return (
                            <div
                                key={conversation.id}
                                className={`inbox-message-item ${selectedConversationId === conversation.id ? 'selected' : ''} ${isUnread ? 'unread' : ''}`}
                                onClick={() => handleConversationClick(conversation.id)}
                            >
                                <div className="inbox-avatar">
                                    {otherUser?.avatarUrl ? (
                                        <img src={otherUser.avatarUrl} alt={otherUser.displayName} />
                                    ) : (
                                        <div className="inbox-avatar-placeholder">
                                            {otherUser?.displayName?.[0]?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                </div>
                                <div className="inbox-message-item-content">
                                    <div className="inbox-message-item-header">
                                        <span className="inbox-message-sender">{otherUser?.displayName || 'Unknown User'}</span>
                                        <span className="inbox-message-time">
                                            {conversation.lastMessage?.createdAt && 
                                                formatDistanceToNow(conversation.lastMessage.createdAt, { addSuffix: false, locale: vi })}
                                        </span>
                                    </div>
                                    <div className="inbox-message-preview">
                                        {conversation.lastMessage?.fromUserId === user.uid ? 'You: ' : ''}
                                        {conversation.lastMessage?.body}
                                    </div>
                                </div>
                                {isUnread && <div className="inbox-unread-dot"></div>}
                                
                                {/* 3-dot menu - Only show if NOT fully accepted (as per request) */}
                                {!isFullyAccepted && (
                                    <div className="inbox-item-menu">
                                        <button 
                                            className="inbox-menu-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(isMenuOpen ? null : conversation.id);
                                            }}
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                        {isMenuOpen && (
                                            <div className="inbox-menu-dropdown">
                                                <button 
                                                    className="inbox-menu-item delete"
                                                    onClick={(e) => handleDeleteConversation(e, conversation.id)}
                                                >
                                                    <Trash2 size={14} />
                                                    <span>Delete Chat</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chat Window */}
            <div className="inbox-message-detail">
                {selectedConversationId ? (
                    <>
                        <div className="inbox-detail-header chat-header">
                            <div className="inbox-detail-sender">
                                <div className="inbox-sender-avatar">
                                    {activeChatUser?.avatarUrl ? (
                                        <img src={activeChatUser.avatarUrl} alt={activeChatUser.displayName} />
                                    ) : (
                                        <div className="inbox-sender-avatar-placeholder">
                                            {activeChatUser?.displayName?.[0]?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                </div>
                                <div className="inbox-sender-info">
                                    <div className="inbox-sender-name">{activeChatUser?.displayName}</div>
                                    <div className="inbox-sender-email">@{activeChatUser?.username}</div>
                                </div>
                            </div>
                            <button className="inbox-icon-btn">
                                <MoreVertical size={20} />
                            </button>
                        </div>

                        <div className="chat-messages-list">
                            {/* Request Status Banner */}
                            {!isNewChat && !isAccepted && (
                                <div className="chat-request-banner">
                                    <ShieldAlert size={24} />
                                    <div className="chat-request-info">
                                        <h4>Message Request</h4>
                                        <p>Do you want to accept messages from {activeChatUser?.displayName}?</p>
                                    </div>
                                    <div className="chat-request-actions">
                                        <button className="btn-accept" onClick={handleAcceptChat}>
                                            <CheckCircle size={16} /> Accept
                                        </button>
                                        <button className="btn-decline" onClick={handleDeclineChat}>
                                            <XCircle size={16} /> Decline
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!isNewChat && isAccepted && !isOtherAccepted && (
                                <div className="chat-request-banner waiting">
                                    <div className="chat-request-info">
                                        <p>Waiting for {activeChatUser?.displayName} to accept your request.</p>
                                    </div>
                                </div>
                            )}

                            {messages.map((msg, index) => {
                                const isMe = msg.fromUserId === user.uid;
                                const showAvatar = !isMe && (index === 0 || messages[index - 1].fromUserId !== msg.fromUserId);
                                
                                return (
                                    <div key={msg.id} className={`chat-message-row ${isMe ? 'me' : 'other'}`}>
                                        {!isMe && (
                                            <div className="chat-avatar-spacer">
                                                {showAvatar && (
                                                    <div className="chat-avatar-small">
                                                        {activeChatUser?.avatarUrl ? (
                                                            <img src={activeChatUser.avatarUrl} alt={activeChatUser.displayName} />
                                                        ) : (
                                                            <span>{activeChatUser?.displayName?.[0]?.toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className={`chat-bubble ${isMe ? 'me' : 'other'}`}>
                                            {msg.body}
                                            <div className="chat-time">
                                                {formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: vi })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-area">
                            {isNewChat || (isAccepted && isOtherAccepted) ? (
                                <form onSubmit={handleSendMessage}>
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                    />
                                    <button type="submit" disabled={!messageInput.trim()}>
                                        <Send size={20} />
                                    </button>
                                </form>
                            ) : (
                                <div className="chat-input-disabled">
                                    {!isAccepted 
                                        ? "Accept the chat to reply." 
                                        : "Waiting for acceptance..."}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="inbox-detail-empty">
                        <Mail size={64} />
                        <h3>Select a conversation</h3>
                        <p>Choose a chat from the list or start a new one.</p>
                        <button 
                            className="btn-primary" 
                            style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => setShowNewChat(true)}
                        >
                            <Plus size={20} />
                            Compose New Message
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inbox;

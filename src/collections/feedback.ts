import { db } from '../lib/firebase';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    increment
} from 'firebase/firestore';

export type FeedbackCategory = 'bugs' | 'ideas' | 'questions';
export type FeedbackStatus = 'waiting' | 'in_progress' | 'done' | 'rejected';

export interface FeedbackReaction {
    emoji: string;
    count: number;
    users: string[]; // Array of user IDs who reacted
}

export interface FeedbackPost {
    id?: string;
    title: string;
    content: string;
    category: FeedbackCategory;
    status: FeedbackStatus;
    isAnonymous: boolean;
    authorId: string;
    authorUsername?: string; // Hidden if anonymous
    authorAtName?: string; // Hidden if anonymous
    reactions: { [emoji: string]: FeedbackReaction };
    commentCount: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    statusUpdatedBy?: string; // Moderator who updated status
    statusUpdatedAt?: Timestamp;
}

const FEEDBACK_COLLECTION = 'feedbackPosts';

/**
 * Create a new feedback post
 */
export const createFeedbackPost = async (
    postData: Omit<FeedbackPost, 'id' | 'reactions' | 'commentCount' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> => {
    try {
        const newPost = {
            ...postData,
            status: 'waiting' as FeedbackStatus,
            reactions: {},
            commentCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, FEEDBACK_COLLECTION), newPost);
        return docRef.id;
    } catch (error) {
        console.error('Error creating feedback post:', error);
        throw error;
    }
};

/**
 * Get feedback posts by category
 */
export const getFeedbackPostsByCategory = async (
    category: FeedbackCategory,
    limitCount: number = 50
): Promise<FeedbackPost[]> => {
    try {
        const q = query(
            collection(db, FEEDBACK_COLLECTION),
            where('category', '==', category),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as FeedbackPost));
    } catch (error) {
        console.error('Error getting feedback posts:', error);
        throw error;
    }
};

/**
 * Get all feedback posts
 */
export const getAllFeedbackPosts = async (limitCount: number = 100): Promise<FeedbackPost[]> => {
    try {
        const q = query(
            collection(db, FEEDBACK_COLLECTION),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as FeedbackPost));
    } catch (error) {
        console.error('Error getting all feedback posts:', error);
        throw error;
    }
};

/**
 * Get a single feedback post
 */
export const getFeedbackPost = async (postId: string): Promise<FeedbackPost | null> => {
    try {
        const docRef = doc(db, FEEDBACK_COLLECTION, postId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            } as FeedbackPost;
        }
        return null;
    } catch (error) {
        console.error('Error getting feedback post:', error);
        throw error;
    }
};

/**
 * Add or remove emoji reaction
 */
export const toggleFeedbackReaction = async (
    postId: string,
    emoji: string,
    userId: string
): Promise<void> => {
    try {
        const postRef = doc(db, FEEDBACK_COLLECTION, postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
            throw new Error('Post not found');
        }

        const post = postSnap.data() as FeedbackPost;
        const reactions = post.reactions || {};
        const reaction = reactions[emoji] || { emoji, count: 0, users: [] };

        // Toggle reaction
        if (reaction.users.includes(userId)) {
            // Remove reaction
            reaction.users = reaction.users.filter(id => id !== userId);
            reaction.count = Math.max(0, reaction.count - 1);

            if (reaction.count === 0) {
                delete reactions[emoji];
            } else {
                reactions[emoji] = reaction;
            }
        } else {
            // Add reaction
            reaction.users.push(userId);
            reaction.count += 1;
            reactions[emoji] = reaction;
        }

        await updateDoc(postRef, {
            reactions,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error toggling reaction:', error);
        throw error;
    }
};

/**
 * Update feedback post status (moderators only)
 */
export const updateFeedbackStatus = async (
    postId: string,
    status: FeedbackStatus,
    moderatorId: string
): Promise<void> => {
    try {
        const postRef = doc(db, FEEDBACK_COLLECTION, postId);

        await updateDoc(postRef, {
            status,
            statusUpdatedBy: moderatorId,
            statusUpdatedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating feedback status:', error);
        throw error;
    }
};

/**
 * Delete feedback post
 */
export const deleteFeedbackPost = async (postId: string): Promise<void> => {
    try {
        const postRef = doc(db, FEEDBACK_COLLECTION, postId);
        await deleteDoc(postRef);
    } catch (error) {
        console.error('Error deleting feedback post:', error);
        throw error;
    }
};

/**
 * Increment comment count
 */
export const incrementFeedbackCommentCount = async (postId: string): Promise<void> => {
    try {
        const postRef = doc(db, FEEDBACK_COLLECTION, postId);
        await updateDoc(postRef, {
            commentCount: increment(1),
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error incrementing comment count:', error);
        throw error;
    }
};

/**
 * Get feedback posts by user (including anonymous ones they created)
 */
export const getUserFeedbackPosts = async (userId: string): Promise<FeedbackPost[]> => {
    try {
        const q = query(
            collection(db, FEEDBACK_COLLECTION),
            where('authorId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as FeedbackPost));
    } catch (error) {
        console.error('Error getting user feedback posts:', error);
        throw error;
    }
};

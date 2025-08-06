import { collection, doc, addDoc, getDoc, updateDoc, deleteDoc, query, where, orderBy, limit, getDocs, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Post } from '../types';

// Re-export Post interface for backward compatibility
export type { Post };

// Tạo bài viết mới
export const createPost = async (data: {
  title: string;
  content: string;
  contentType?: 'markdown' | 'html'; // Add content type field
  subreddit?: string;
  authorId: string;
  authorUsername: string;
  type: 'text' | 'link' | 'image';
  url?: string;
  imageUrls?: string[];
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    downloadUrl: string;
  }>;
  tags?: string[];
}): Promise<string> => {
  try {
    // Chỉ thêm fields có giá trị, loại bỏ undefined
    const postData: any = {
      title: data.title,
      content: data.content,
      contentType: data.contentType || 'html', // Default to HTML for backward compatibility
      authorId: data.authorId,
      authorUsername: data.authorUsername || 'Người dùng ẩn danh',
      type: data.type,
      createdAt: serverTimestamp(),
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      viewCount: 0,
      viewedBy: [],
      votes: {}
    };
    
    // Chỉ thêm các field optional nếu chúng có giá trị
    if (data.subreddit) {
      postData.subreddit = data.subreddit;
    }
    
    if (data.url) {
      postData.url = data.url;
    }
    
    // Kiểm tra imageUrls cẩn thận để tránh undefined
    if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
      // Lọc ra các URL hợp lệ (không undefined, không null, không empty)
      const validImageUrls = data.imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
      if (validImageUrls.length > 0) {
        postData.imageUrls = validImageUrls;
      }
    }
    
    // Thêm attachments nếu có
    if (data.attachments && Array.isArray(data.attachments) && data.attachments.length > 0) {
      const validAttachments = data.attachments.filter(attachment => 
        attachment && attachment.id && attachment.url && attachment.type
      );
      if (validAttachments.length > 0) {
        postData.attachments = validAttachments;
      }
    }
    
    // Thêm tags nếu có
    if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
      const validTags = data.tags.filter(tag => tag && typeof tag === 'string' && tag.trim() !== '');
      if (validTags.length > 0) {
        postData.tags = validTags;
      }
    }

    console.log('📝 Creating post with data:', postData);
    
    const docRef = await addDoc(collection(db, 'posts'), postData);
    console.log('✅ Post created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating post:', error);
    throw error;
  }
};

// Lấy bài viết theo ID
export const getPost = async (postId: string) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (postSnap.exists()) {
      const postData = postSnap.data() as Post;
      return { id: postSnap.id, ...postData };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting post:', error);
    throw error;
  }
};

// Cập nhật view count cho bài viết
export const incrementPostView = async (postId: string, userId?: string): Promise<void> => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const postData = postSnap.data();
    const viewedBy = postData.viewedBy || [];
    const authorId = postData.authorId;
    
    // Không đếm view của chính author
    if (userId && userId === authorId) {
      return;
    }
    
    // Nếu không có userId (người dùng ẩn danh), tăng view count
    if (!userId) {
      await updateDoc(postRef, {
        viewCount: increment(1)
      });
      return;
    }
    
    // Kiểm tra xem user đã xem bài viết này chưa
    if (!viewedBy.includes(userId)) {
      await updateDoc(postRef, {
        viewCount: increment(1),
        viewedBy: [...viewedBy, userId]
      });
    }
  } catch (error) {
    console.error('Error incrementing post view:', error);
    throw error;
  }
};

// Lấy danh sách bài viết
export const getPosts = async (options: {
  subreddit?: string;
  authorId?: string;
  sortBy?: 'new' | 'top' | 'hot';
  limit?: number;
  includeDeleted?: boolean; // Thêm option để include deleted posts
}) => {
  const { subreddit, authorId, sortBy = 'hot', limit: queryLimit = 50, includeDeleted = false } = options;
  const postsRef = collection(db, 'posts');
  let q;
  
  // Xây dựng query dựa trên các tham số
  if (subreddit) {
    if (sortBy === 'new') {
      q = includeDeleted 
        ? query(
            postsRef,
            where('subreddit', '==', subreddit),
            orderBy('createdAt', 'desc'),
            limit(queryLimit)
          )
        : query(
            postsRef,
            where('subreddit', '==', subreddit),
            where('isDeleted', '!=', true),
            orderBy('createdAt', 'desc'),
            limit(queryLimit)
          );
    } else {
      q = includeDeleted
        ? query(
            postsRef,
            where('subreddit', '==', subreddit),
            limit(queryLimit)
          )
        : query(
            postsRef,
            where('subreddit', '==', subreddit),
            where('isDeleted', '!=', true),
            limit(queryLimit)
          );
    }
  } else if (authorId) {
    if (sortBy === 'new') {
      q = includeDeleted
        ? query(
            postsRef,
            where('authorId', '==', authorId),
            orderBy('createdAt', 'desc'),
            limit(queryLimit)
          )
        : query(
            postsRef,
            where('authorId', '==', authorId),
            where('isDeleted', '!=', true),
            orderBy('createdAt', 'desc'),
            limit(queryLimit)
          );
    } else {
      q = includeDeleted
        ? query(
            postsRef,
            where('authorId', '==', authorId),
            limit(queryLimit)
          )
        : query(
            postsRef,
            where('authorId', '==', authorId),
            where('isDeleted', '!=', true),
            limit(queryLimit)
          );
    }
  } else {
    if (sortBy === 'new') {
      q = includeDeleted
        ? query(
            postsRef,
            orderBy('createdAt', 'desc'),
            limit(queryLimit)
          )
        : query(
            postsRef,
            where('isDeleted', '!=', true),
            orderBy('createdAt', 'desc'),
            limit(queryLimit)
          );
    } else {
      q = includeDeleted
        ? query(
            postsRef,
            orderBy('upvotes', 'desc'),
            limit(queryLimit)
          )
        : query(
            postsRef,
            where('isDeleted', '!=', true),
            orderBy('upvotes', 'desc'),
            limit(queryLimit)
          );
    }
  }
  
  try {
    const querySnapshot = await getDocs(q);
    const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
    
    // Sắp xếp theo upvotes nếu cần
    if ((subreddit || authorId) && sortBy === 'top') {
      return posts.sort((a, b) => b.upvotes - a.upvotes);
    }
    
    return posts;
  } catch (error) {
    console.error('Error getting posts:', error);
    throw error;
  }
};

// Vote cho bài viết
export const votePost = async (postId: string, userId: string, voteType: 'up' | 'down') => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (postSnap.exists()) {
      const data = postSnap.data() as Post;
      const votes = data.votes || {};
      const currentVote = votes[userId];
      
      let upvotes = data.upvotes || 0;
      let downvotes = data.downvotes || 0;
      
      // Remove previous vote
      if (currentVote === 'up') upvotes--;
      if (currentVote === 'down') downvotes--;
      
      // Add new vote (if different from current)
      if (currentVote !== voteType) {
        votes[userId] = voteType;
        if (voteType === 'up') upvotes++;
        if (voteType === 'down') downvotes++;
      } else {
        delete votes[userId]; // Remove vote if same
      }
      
      await updateDoc(postRef, { votes, upvotes, downvotes });
      return { votes, upvotes, downvotes };
    }
    
    return null;
  } catch (error) {
    console.error('Error voting on post:', error);
    throw error;
  }
};

// Xóa bài viết
export const deletePost = async (postId: string) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);
    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

// Soft delete bài viết
export const softDeletePost = async (postId: string, userId: string, reason?: string) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const postData = postSnap.data() as Post;
    
    // Backup original data for potential restoration
    const originalData = {
      upvotes: postData.upvotes || 0,
      downvotes: postData.downvotes || 0,
      commentCount: postData.commentCount || 0,
      votes: postData.votes || {}
    };
    
    await updateDoc(postRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: userId,
      deleteReason: reason || 'No reason provided',
      originalData: originalData,
      // Reset interactive data
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      votes: {},
      viewCount: 0,
      viewedBy: []
    });
    
    console.log('✅ Post soft deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Error soft deleting post:', error);
    throw error;
  }
};

// Restore bài viết từ deleted
export const restorePost = async (postId: string, userId: string) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const postData = postSnap.data() as Post;
    
    if (!postData.isDeleted) {
      throw new Error('Post is not deleted');
    }
    
    // Delete all comments related to this post
    const commentsRef = collection(db, 'comments');
    const commentsQuery = query(commentsRef, where('postId', '==', postId));
    const commentsSnap = await getDocs(commentsQuery);
    
    // Delete all comments in batches
    const deletePromises = commentsSnap.docs.map(commentDoc => 
      deleteDoc(doc(db, 'comments', commentDoc.id))
    );
    await Promise.all(deletePromises);
    
    // Restore post but reset all interactive data (votes, comments)
    const updateData: any = {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
      // Reset all votes and comments data
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      votes: {},
      originalData: null
    };
    
    await updateDoc(postRef, updateData);
    
    console.log(`✅ Post restored successfully with reset data. Deleted ${commentsSnap.docs.length} comments`);
    return true;
  } catch (error) {
    console.error('❌ Error restoring post:', error);
    throw error;
  }
};

// Permanently delete bài viết
export const permanentlyDeletePost = async (postId: string) => {
  try {
    // First, delete all comments related to this post
    const commentsRef = collection(db, 'comments');
    const commentsQuery = query(commentsRef, where('postId', '==', postId));
    const commentsSnap = await getDocs(commentsQuery);
    
    // Delete all comments in batches
    const deletePromises = commentsSnap.docs.map(commentDoc => 
      deleteDoc(doc(db, 'comments', commentDoc.id))
    );
    await Promise.all(deletePromises);
    
    // Then delete the post itself
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);
    
    console.log(`✅ Post and ${commentsSnap.docs.length} comments permanently deleted`);
    return true;
  } catch (error) {
    console.error('❌ Error permanently deleting post:', error);
    throw error;
  }
};

// Edit bài viết
export const editPost = async (postId: string, updates: {
  title?: string;
  content?: string;
  contentType?: 'markdown' | 'html';
  editReason?: string;
}, userId: string) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const postData = postSnap.data() as Post;
    
    // Create edit history entry
    const editHistoryEntry = {
      editedAt: new Date(),
      previousContent: postData.content,
      previousTitle: postData.title,
      editReason: updates.editReason || 'No reason provided'
    };
    
    const currentEditHistory = postData.editHistory || [];
    
    const updateData: any = {
      isEdited: true,
      editedAt: serverTimestamp(),
      editHistory: [...currentEditHistory, editHistoryEntry]
    };
    
    if (updates.title) {
      updateData.title = updates.title;
    }
    
    if (updates.content) {
      updateData.content = updates.content;
    }

    if (updates.contentType) {
      updateData.contentType = updates.contentType;
    }
    
    await updateDoc(postRef, updateData);
    
    console.log('✅ Post edited successfully');
    return true;
  } catch (error) {
    console.error('❌ Error editing post:', error);
    throw error;
  }
};

// Lấy deleted posts
export const getDeletedPosts = async (userId?: string) => {
  try {
    const postsRef = collection(db, 'posts');
    let q;
    
    if (userId) {
      // Chỉ lấy posts của user cụ thể
      q = query(
        postsRef,
        where('isDeleted', '==', true),
        where('deletedBy', '==', userId),
        orderBy('deletedAt', 'desc')
      );
    } else {
      // Lấy tất cả deleted posts (cho admin)
      q = query(
        postsRef,
        where('isDeleted', '==', true),
        orderBy('deletedAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    const deletedPosts = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Post));
    
    return deletedPosts;
  } catch (error) {
    console.error('Error getting deleted posts:', error);
    throw error;
  }
};

// Auto cleanup - xóa vĩnh viễn posts đã deleted > 15 ngày
export const cleanupOldDeletedPosts = async () => {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('isDeleted', '==', true),
      where('deletedAt', '<', fifteenDaysAgo)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
    
    console.log(`✅ Cleaned up ${querySnapshot.docs.length} old deleted posts`);
    return querySnapshot.docs.length;
  } catch (error) {
    console.error('❌ Error cleaning up old deleted posts:', error);
    throw error;
  }
};
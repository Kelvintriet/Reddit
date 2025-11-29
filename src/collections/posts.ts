import { collection, doc, addDoc, getDoc, updateDoc, deleteDoc, setDoc, query, where, orderBy, limit, getDocs, serverTimestamp, increment } from 'firebase/firestore';
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
    
    // Mark uploaded files as attached to this post
    const fileIds: string[] = [];
    if (data.imageUrls && data.imageUrls.length > 0) {
      // Extract file IDs from imageUrls
      data.imageUrls.forEach(url => {
        const match = url.match(/files\/([^\/\?]+)/);
        if (match) fileIds.push(match[1]);
      });
    }
    if (data.attachments && data.attachments.length > 0) {
      data.attachments.forEach(att => {
        if (att.id) fileIds.push(att.id);
      });
    }
    
    if (fileIds.length > 0) {
      try {
        const { markFilesAsAttached } = await import('../services/appwrite/orphanedFiles');
        await markFilesAsAttached(fileIds, docRef.id);
      } catch (error) {
        console.warn('Failed to mark files as attached (non-critical):', error);
      }
    }
    
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
      return { ...postData, id: postSnap.id };
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

// Vote cho bài viết - Frontend calculates totals from votes object
export const votePost = async (postId: string, userId: string, voteType: 'up' | 'down') => {
  try {
    // First check deletedPosts collection - if found, reject voting immediately
    const deletedPostRef = doc(db, 'deletedPosts', postId);
    const deletedPostSnap = await getDoc(deletedPostRef);
    
    if (deletedPostSnap.exists()) {
      // Post is deleted, cannot vote
      throw new Error('Cannot vote on deleted post');
    }
    
    // Check main posts collection
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const data = postSnap.data() as Post;
    
    // Double check - don't allow voting on deleted posts (safety check)
    if (data.isDeleted) {
      throw new Error('Cannot vote on deleted post');
    }
    
    const votes = data.votes || {};
    const currentVote = votes[userId];
    
    // Update votes object
    if (currentVote === voteType) {
      // Remove vote if clicking same button
      delete votes[userId];
    } else {
      // Add or change vote
      votes[userId] = voteType;
    }
    
    // Calculate totals from votes object (frontend calculation)
    let upvotes = 0;
    let downvotes = 0;
    Object.values(votes).forEach((vote: any) => {
      if (vote === 'up') upvotes++;
      else if (vote === 'down') downvotes++;
    });
    
    // Save calculated totals to database
    await updateDoc(postRef, { votes, upvotes, downvotes });
    return { votes, upvotes, downvotes };
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

// Soft delete bài viết - Move to deletedPosts collection
export const softDeletePost = async (postId: string, userId: string, reason?: string) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const postData = postSnap.data() as Post;
    
    // Backup ALL original data for potential restoration as fresh post
    // Filter out undefined values as Firestore doesn't allow them
    const originalData: any = {};
    if (postData.title !== undefined) originalData.title = postData.title;
    if (postData.content !== undefined) originalData.content = postData.content;
    originalData.contentType = postData.contentType || 'html';
    if (postData.authorId !== undefined) originalData.authorId = postData.authorId;
    if (postData.authorUsername !== undefined) originalData.authorUsername = postData.authorUsername;
    if (postData.subreddit !== undefined) originalData.subreddit = postData.subreddit;
    originalData.imageUrls = postData.imageUrls || [];
    originalData.attachments = postData.attachments || [];
    originalData.type = postData.type || 'text';
    if (postData.url !== undefined) originalData.url = postData.url;
    originalData.tags = postData.tags || [];
    
    // Create deleted post document with [deleted] content but keep votes
    // Filter out undefined values from postData spread
    const deletedPostData: any = {
      ...Object.fromEntries(
        Object.entries(postData).filter(([_, value]) => value !== undefined)
      ),
      id: postId, // Keep original ID for direct access
      isDeleted: true,
      deletedAt: serverTimestamp(),
      deletedBy: userId,
      deleteReason: reason || 'No reason provided',
      originalData: originalData,
      // Override content with [deleted] but keep votes
      title: '[deleted]',
      content: '[deleted]',
      authorUsername: '[deleted]',
      imageUrls: [],
      attachments: []
      // Votes remain unchanged - they stay visible but can't be modified
    };
    
    // Copy to deletedPosts collection
    const deletedPostRef = doc(db, 'deletedPosts', postId);
    await setDoc(deletedPostRef, deletedPostData);
    
    // Delete from main posts collection
    await deleteDoc(postRef);
    
    console.log('✅ Post moved to deletedPosts collection');
    return true;
  } catch (error) {
    console.error('❌ Error soft deleting post:', error);
    throw error;
  }
};

// Restore bài viết từ deleted - Creates a NEW fresh post (doesn't restore the old one)
export const restorePost = async (postId: string, userId: string) => {
  try {
    // Get from deletedPosts collection
    const deletedPostRef = doc(db, 'deletedPosts', postId);
    const postSnap = await getDoc(deletedPostRef);
    
    if (!postSnap.exists()) {
      throw new Error('Post not found');
    }
    
    const postData = postSnap.data() as Post;
    
    if (!postData.isDeleted || !postData.originalData) {
      throw new Error('Post is not deleted or has no backup data');
    }
    
    // Check if post is permanently deleted (cannot be restored)
    if ((postData as any).permanentlyDeleted === true) {
      throw new Error('This post has been permanently deleted and cannot be restored');
    }
    
    // Verify user owns the deleted post
    if (postData.deletedBy !== userId) {
      throw new Error('You do not have permission to restore this post');
    }
    
    const originalData = postData.originalData as any;
    
    // Create a NEW fresh post with original content but reset stats
    // Filter out undefined values as Firestore doesn't allow them
    const newPostData: any = {
      createdAt: serverTimestamp(),
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      viewCount: 0,
      viewedBy: [],
      votes: {},
      isDeleted: false,
      isEdited: false
    };
    
    // Only add fields that are defined
    if (originalData.title !== undefined) newPostData.title = originalData.title;
    if (originalData.content !== undefined) newPostData.content = originalData.content;
    newPostData.contentType = originalData.contentType || 'html';
    if (originalData.authorId !== undefined) {
      newPostData.authorId = originalData.authorId;
    } else if (postData.authorId !== undefined) {
      newPostData.authorId = postData.authorId;
    }
    if (originalData.authorUsername !== undefined) newPostData.authorUsername = originalData.authorUsername;
    if (originalData.subreddit !== undefined) newPostData.subreddit = originalData.subreddit;
    newPostData.imageUrls = originalData.imageUrls || [];
    newPostData.attachments = originalData.attachments || [];
    newPostData.type = originalData.type || 'text';
    if (originalData.url !== undefined) newPostData.url = originalData.url;
    newPostData.tags = originalData.tags || [];
    
    // Create the new post in main posts collection
    const newPostRef = doc(collection(db, 'posts'));
    await setDoc(newPostRef, newPostData);
    
    // The old deleted post remains in deletedPosts collection - it's not restored
    // This creates a fresh repost instead
    
    console.log(`✅ Post restored as fresh new post. Old post remains in deletedPosts.`);
    return newPostRef.id;
  } catch (error) {
    console.error('❌ Error restoring post:', error);
    throw error;
  }
};

// Permanently delete bài viết - Mark as permanently deleted (frozen, not recoverable)
// Post remains in deletedPosts collection but cannot be restored
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
    
    // Mark post as permanently deleted instead of actually deleting it
    // Post remains frozen in deletedPosts collection, URL still works, but not recoverable
    const deletedPostRef = doc(db, 'deletedPosts', postId);
    await updateDoc(deletedPostRef, {
      permanentlyDeleted: true,
      permanentlyDeletedAt: serverTimestamp()
    });
    
    console.log(`✅ Post marked as permanently deleted. ${commentsSnap.docs.length} comments deleted. Post remains frozen in deletedPosts.`);
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
}, _userId: string) => {
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

// Lấy deleted posts from deletedPosts collection (only recoverable ones)
export const getDeletedPosts = async (userId?: string) => {
  try {
    const deletedPostsRef = collection(db, 'deletedPosts');
    let q;
    
    if (userId) {
      // Chỉ lấy posts của user cụ thể
      q = query(
        deletedPostsRef,
        where('deletedBy', '==', userId),
        orderBy('deletedAt', 'desc')
      );
    } else {
      // Lấy tất cả deleted posts (cho admin)
      q = query(
        deletedPostsRef,
        orderBy('deletedAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    // Filter out permanently deleted posts on client side
    const deletedPosts = querySnapshot.docs
      .map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Post))
      .filter(post => !(post as any).permanentlyDeleted); // Exclude permanently deleted
    
    return deletedPosts;
  } catch (error) {
    console.error('Error getting deleted posts:', error);
    throw error;
  }
};

// Auto cleanup - Mark old deleted posts (>15 days) as permanently deleted (frozen, not recoverable)
// Posts remain in deletedPosts collection but cannot be restored
export const cleanupOldDeletedPosts = async () => {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    const deletedPostsRef = collection(db, 'deletedPosts');
    const q = query(
      deletedPostsRef,
      where('deletedAt', '<', fifteenDaysAgo)
    );
    
    const querySnapshot = await getDocs(q);
    // Filter out already permanently deleted posts on client side
    const postsToMark = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.permanentlyDeleted; // Only mark ones not already permanently deleted
    });
    
    const updatePromises = postsToMark.map(doc => 
      updateDoc(doc.ref, {
        permanentlyDeleted: true,
        permanentlyDeletedAt: serverTimestamp()
      })
    );
    
    await Promise.all(updatePromises);
    
    console.log(`✅ Marked ${postsToMark.length} old deleted posts as permanently deleted (frozen)`);
    return postsToMark.length;
  } catch (error) {
    console.error('❌ Error cleaning up old deleted posts:', error);
    throw error;
  }
};
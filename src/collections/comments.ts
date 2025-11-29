import { collection, doc, addDoc, getDoc, updateDoc, query, where, orderBy, limit, getDocs, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Định nghĩa interface cho Comment
export interface Comment {
  id?: string;
  content: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  parentId?: string; // null cho comment gốc, có giá trị cho reply
  depth: number; // 0 cho comment gốc, tăng dần cho các reply
  createdAt: Date;
  updatedAt?: Date;
  upvotes: number;
  downvotes: number;
  votes: Record<string, 'up' | 'down'>;
  replyCount: number; // Số lượng reply trực tiếp
  isDeleted?: boolean; // Soft delete
  deletedAt?: Date;
}

const MAX_REPLY_DEPTH = 10;

// Tạo comment mới
export const createComment = async (data: {
  content: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  parentId?: string;
}): Promise<string> => {
  try {
    let depth = 0;

    // Nếu là reply, tính depth và kiểm tra giới hạn
    if (data.parentId) {
      const parentComment = await getComment(data.parentId);
      if (!parentComment) {
        throw new Error('Parent comment not found');
      }

      depth = parentComment.depth + 1;

      if (depth > MAX_REPLY_DEPTH) {
        throw new Error(`Maximum reply depth of ${MAX_REPLY_DEPTH} exceeded`);
      }
    }

    const commentData: any = {
      content: data.content,
      postId: data.postId,
      authorId: data.authorId,
      authorUsername: data.authorUsername,
      depth,
      createdAt: serverTimestamp(),
      upvotes: 0,
      downvotes: 0,
      votes: {},
      replyCount: 0,
      isDeleted: false
    };

    // Chỉ thêm parentId nếu có
    if (data.parentId) {
      commentData.parentId = data.parentId;
    }

    const docRef = await addDoc(collection(db, 'comments'), commentData);

    // Cập nhật comment count của post
    const postRef = doc(db, 'posts', data.postId);
    await updateDoc(postRef, {
      commentCount: increment(1)
    });

    // Nếu là reply, cập nhật reply count của parent comment
    if (data.parentId) {
      const parentRef = doc(db, 'comments', data.parentId);
      await updateDoc(parentRef, {
        replyCount: increment(1)
      });
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw new Error('Không thể tạo bình luận. Vui lòng thử lại.');
  }
};

// Lấy comment theo ID
export const getComment = async (commentId: string): Promise<Comment | null> => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (commentSnap.exists()) {
      const commentData = commentSnap.data() as Comment;
      return { id: commentSnap.id, ...commentData };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting comment:', error);
    throw error;
  }
};

// Lấy comments của một post
export const getComments = async (postId: string, options: {
  parentId?: string | null; // null để lấy comment gốc, string để lấy replies
  limit?: number;
  orderBy?: 'newest' | 'oldest' | 'top';
} = {}): Promise<Comment[]> => {
  const { parentId = null, limit: queryLimit = 50, orderBy: sortBy = 'top' } = options;

  try {
    const commentsRef = collection(db, 'comments');
    let q;

    if (parentId === null) {
      // Lấy comment gốc (không có parentId)
      if (sortBy === 'newest') {
        q = query(
          commentsRef,
          where('postId', '==', postId),
          where('parentId', '==', null),
          orderBy('createdAt', 'desc'),
          limit(queryLimit)
        );
      } else if (sortBy === 'oldest') {
        q = query(
          commentsRef,
          where('postId', '==', postId),
          where('parentId', '==', null),
          orderBy('createdAt', 'asc'),
          limit(queryLimit)
        );
      } else {
        // top - sắp xếp theo upvotes
        q = query(
          commentsRef,
          where('postId', '==', postId),
          where('parentId', '==', null),
          orderBy('upvotes', 'desc'),
          limit(queryLimit)
        );
      }
    } else {
      // Lấy replies của một comment
      if (sortBy === 'newest') {
        q = query(
          commentsRef,
          where('postId', '==', postId),
          where('parentId', '==', parentId),
          orderBy('createdAt', 'desc'),
          limit(queryLimit)
        );
      } else if (sortBy === 'oldest') {
        q = query(
          commentsRef,
          where('postId', '==', postId),
          where('parentId', '==', parentId),
          orderBy('createdAt', 'asc'),
          limit(queryLimit)
        );
      } else {
        q = query(
          commentsRef,
          where('postId', '==', postId),
          where('parentId', '==', parentId),
          orderBy('upvotes', 'desc'),
          limit(queryLimit)
        );
      }
    }

    const querySnapshot = await getDocs(q);
    const comments = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        isDeleted: data.isDeleted || false,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        deletedAt: data.deletedAt?.toDate()
      } as Comment;
    });

    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

// Vote cho comment
// Vote cho comment - Frontend calculates totals from votes object
export const voteComment = async (commentId: string, userId: string, voteType: 'up' | 'down') => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (commentSnap.exists()) {
      const data = commentSnap.data() as Comment;

      // Prevent voting on deleted comments
      if (data.isDeleted) {
        throw new Error('Cannot vote on deleted comment');
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
      await updateDoc(commentRef, { votes, upvotes, downvotes });
      return { votes, upvotes, downvotes };
    }

    return null;
  } catch (error) {
    console.error('Error voting on comment:', error);
    throw error;
  }
};

// Cập nhật comment
export const updateComment = async (commentId: string, content: string, userId: string) => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentSnap.data() as Comment;

    // Kiểm tra quyền chỉnh sửa
    if (commentData.authorId !== userId) {
      throw new Error('You do not have permission to edit this comment');
    }

    await updateDoc(commentRef, {
      content,
      updatedAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
};

// Xóa comment (soft delete)
export const deleteComment = async (commentId: string, userId: string) => {
  try {
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);

    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentSnap.data() as Comment;

    // Kiểm tra quyền xóa
    if (commentData.authorId !== userId) {
      throw new Error('You do not have permission to delete this comment');
    }

    await updateDoc(commentRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
      content: '[deleted]',
      authorUsername: '[deleted]'
      // Votes remain unchanged - they stay visible but can't be modified
    });

    // Giảm comment count của post
    const postRef = doc(db, 'posts', commentData.postId);
    await updateDoc(postRef, {
      commentCount: increment(-1)
    });

    // Nếu có parent, giảm reply count
    if (commentData.parentId) {
      const parentRef = doc(db, 'comments', commentData.parentId);
      await updateDoc(parentRef, {
        replyCount: increment(-1)
      });
    }

    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

// Lấy comment tree (comment + replies) cho hiển thị
export const getCommentTree = async (postId: string, sortBy: 'newest' | 'oldest' | 'top' = 'top'): Promise<Comment[]> => {
  try {
    // Lấy tất cả comments của post
    const allCommentsRef = collection(db, 'comments');
    const q = query(
      allCommentsRef,
      where('postId', '==', postId),
      orderBy('createdAt', 'asc') // Sắp xếp theo thời gian tạo để xây dựng tree
    );

    const querySnapshot = await getDocs(q);
    const allComments = querySnapshot.docs.map(doc => {
      const data = doc.data() as Comment;
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt ? (typeof data.createdAt === 'object' && 'toDate' in data.createdAt ? (data.createdAt as any).toDate() : data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? (typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt ? (data.updatedAt as any).toDate() : data.updatedAt) : undefined,
        deletedAt: data.deletedAt ? (typeof data.deletedAt === 'object' && 'toDate' in data.deletedAt ? (data.deletedAt as any).toDate() : data.deletedAt) : undefined,
        replies: [] as Comment[]
      } as Comment & { replies: Comment[] };
    });

    // Xây dựng comment tree
    const commentMap = new Map();
    const rootComments: Comment[] = [];

    // Tạo map để dễ tìm kiếm
    allComments.forEach(comment => {
      commentMap.set(comment.id, comment);
    });

    // Xây dựng tree structure
    allComments.forEach(comment => {
      if (!comment.parentId) {
        // Comment gốc
        rootComments.push(comment);
      } else {
        // Reply - thêm vào parent
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          if (!parent.replies) {
            parent.replies = [];
          }
          parent.replies.push(comment);
        }
      }
    });

    // Sắp xếp comments dựa trên sortBy
    const sortComments = (comments: Comment[]) => {
      if (sortBy === 'newest') {
        return comments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } else if (sortBy === 'oldest') {
        return comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      } else {
        // top - theo upvotes
        return comments.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      }
    };

    // Sắp xếp cả root comments và replies
    const sortedRootComments = sortComments(rootComments);

    // Đệ quy sắp xếp replies
    const sortRepliesRecursively = (comments: any[]) => {
      comments.forEach(comment => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies = sortComments(comment.replies);
          sortRepliesRecursively(comment.replies);
        }
      });
    };

    sortRepliesRecursively(sortedRootComments);

    return sortedRootComments as Comment[];
  } catch (error) {
    console.error('Error getting comment tree:', error);
    throw error;
  }
}; 
import { collection, doc, setDoc, getDoc, getDocs, updateDoc, query, orderBy, limit, where, deleteDoc, addDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Định nghĩa interface cho Subreddit
export interface Subreddit {
  id?: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  memberCount: number;
  members: string[];
  rules?: string[];
  bannerUrl?: string;
  iconUrl?: string;
  isPrivate?: boolean;
  moderators?: string[];
}

// Tạo subreddit mới
export const createSubreddit = async (data: {
  name: string;
  description: string;
  createdBy: string;
  rules?: string[];
  bannerUrl?: string;
  iconUrl?: string;
  isPrivate?: boolean;
}) => {
  try {
    const subredditId = data.name.toLowerCase();
    const subredditRef = doc(db, 'subreddits', subredditId);
    const subredditSnap = await getDoc(subredditRef);
    
    if (subredditSnap.exists()) {
      throw new Error('Subreddit already exists');
    }
    
    // Chỉ thêm fields có giá trị, loại bỏ undefined
    const subredditData: any = {
      name: data.name.toLowerCase(), // Lưu tên subreddit dưới dạng lowercase
      description: data.description,
      createdBy: data.createdBy,
      createdAt: serverTimestamp(), // Use Firestore server timestamp
      memberCount: 1,
      members: [data.createdBy],
      moderators: [data.createdBy]
    };
    
    // Chỉ thêm các field optional nếu chúng có giá trị
    if (data.rules && data.rules.length > 0) {
      subredditData.rules = data.rules;
    }
    
    if (data.bannerUrl) {
      subredditData.bannerUrl = data.bannerUrl;
    }
    
    if (data.iconUrl) {
      subredditData.iconUrl = data.iconUrl;
    }
    
    if (data.isPrivate !== undefined) {
      subredditData.isPrivate = data.isPrivate;
    }
    
    await setDoc(subredditRef, subredditData);
    
    return { id: subredditId, ...subredditData };
  } catch (error) {
    console.error('Error creating subreddit:', error);
    throw error;
  }
};

// Lấy subreddit theo tên
export const getSubreddit = async (name: string) => {
  try {
    const subredditRef = doc(db, 'subreddits', name.toLowerCase());
    const subredditSnap = await getDoc(subredditRef);
    
    if (subredditSnap.exists()) {
      const subredditData = subredditSnap.data() as Subreddit;
      return { id: subredditSnap.id, ...subredditData };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting subreddit:', error);
    throw error;
  }
};

// Lấy danh sách subreddits
export const getSubreddits = async (options: {
  limit?: number;
  orderByMemberCount?: boolean;
  userId?: string; // Để lọc các subreddit mà người dùng đã tham gia
}) => {
  const { limit: queryLimit = 50, orderByMemberCount = true, userId } = options;
  const subredditsRef = collection(db, 'subreddits');
  let q;
  
  if (userId) {
    // Lấy các subreddit mà người dùng đã tham gia
    q = query(
      subredditsRef,
      where('members', 'array-contains', userId),
      limit(queryLimit)
    );
  } else {
    // Lấy tất cả subreddit, sắp xếp theo số lượng thành viên
    if (orderByMemberCount) {
      q = query(
        subredditsRef,
        orderBy('memberCount', 'desc'),
        limit(queryLimit)
      );
    } else {
      q = query(
        subredditsRef,
        limit(queryLimit)
      );
    }
  }
  
  try {
    const querySnapshot = await getDocs(q);
    const subreddits = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subreddit));
    return subreddits;
  } catch (error) {
    console.error('Error getting subreddits:', error);
    throw error;
  }
};

// Tham gia subreddit
export const joinSubreddit = async (subredditName: string, userId: string) => {
  try {
    const subredditRef = doc(db, 'subreddits', subredditName.toLowerCase());
    const subredditSnap = await getDoc(subredditRef);
    
    if (!subredditSnap.exists()) {
      throw new Error('Subreddit không tồn tại');
    }
    
    const data = subredditSnap.data() as Subreddit;
    const members = data.members || [];
    
    if (members.includes(userId)) {
      return false; // Đã tham gia rồi
    }
    
    // Sử dụng arrayUnion để tránh conflict
    await updateDoc(subredditRef, {
      members: arrayUnion(userId),
      memberCount: (data.memberCount || 0) + 1
    });
    
    return true;
  } catch (error) {
    console.error('Error joining subreddit:', error);
    throw error;
  }
};

// Rời khỏi subreddit
export const leaveSubreddit = async (subredditName: string, userId: string) => {
  try {
    const subredditRef = doc(db, 'subreddits', subredditName.toLowerCase());
    const subredditSnap = await getDoc(subredditRef);

    if (!subredditSnap.exists()) {
      throw new Error('Subreddit không tồn tại');
    }

    const data = subredditSnap.data() as Subreddit;
    const members = data.members || [];

    // Check if user is the owner/creator
    if (data.createdBy === userId) {
      throw new Error('Chủ sở hữu không thể rời khỏi cộng đồng của mình');
    }

    if (!members.includes(userId)) {
      return false; // Chưa tham gia
    }

    // Sử dụng arrayRemove để tránh conflict
    await updateDoc(subredditRef, {
      members: arrayRemove(userId),
      memberCount: Math.max((data.memberCount || 0) - 1, 0)
    });

    return true;
  } catch (error) {
    console.error('Error leaving subreddit:', error);
    throw error;
  }
};

// Cập nhật thông tin subreddit
export const updateSubreddit = async (subredditName: string, data: Partial<Subreddit>) => {
  try {
    const subredditRef = doc(db, 'subreddits', subredditName.toLowerCase());
    await updateDoc(subredditRef, data);
    return true;
  } catch (error) {
    console.error('Error updating subreddit:', error);
    throw error;
  }
};

// Xóa subreddit (chỉ creator mới có quyền)
export const deleteSubreddit = async (subredditName: string) => {
  try {
    const subredditRef = doc(db, 'subreddits', subredditName.toLowerCase());
    const subredditSnap = await getDoc(subredditRef);
    
    if (!subredditSnap.exists()) {
      throw new Error('Subreddit not found');
    }
    
    // TODO: In production, add permission check here
    // const data = subredditSnap.data() as Subreddit;
    // if (data.createdBy !== userId) {
    //   throw new Error('Only creator can delete subreddit');
    // }
    
    await deleteDoc(subredditRef);
    return true;
  } catch (error) {
    console.error('Error deleting subreddit:', error);
    throw error;
  }
}; 
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

// Định nghĩa interface cho User
export interface User {
  id: string;
  displayName: string;
  email: string;
  username?: string;
  atName?: string; // @name format, unique, cannot be changed
  customUID?: string; // 9-character UID: XXX-YYY-ZZZ
  region?: string; // User's selected region
  regionCode?: string; // 3-character region code
  onboardingCompleted?: boolean; // Whether user completed onboarding
  createdAt: Date;
  karma: number;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  joinedSubreddits?: string[];
  savedPosts?: string[];
  isAdmin?: boolean;
  hideProfile?: boolean;
  hidePosts?: boolean;
  hideComments?: boolean;
  showLocation?: boolean;
  // Inbox Privacy Settings
  allowMessageSearch?: boolean; // Allow others to find user by partial name in compose
  allowMessagesFrom?: 'everyone' | 'specific' | 'nobody'; // Who can send messages
  allowedMessageUsers?: string[]; // List of user IDs allowed to send messages (when allowMessagesFrom is 'specific')
}

// Tạo hoặc cập nhật profile người dùng
export const createUserProfile = async (user: FirebaseUser, additionalData?: any) => {
  // console.log('Creating/updating user profile for:', user.uid);

  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Tạo profile mới
      const createdAt = new Date();
      const userData = {
        displayName: user.displayName || '',
        email: user.email || '',
        username: user.displayName || `user_${user.uid.substring(0, 8)}`,
        photoURL: user.photoURL || null,
        createdAt,
        karma: 0,
        joinedSubreddits: [],
        savedPosts: [],
        ...additionalData
      };

      await setDoc(userRef, userData);
      // console.log('User profile created:', user.uid);

      return { id: user.uid, ...userData };
    } else {
      // Cập nhật profile nếu cần
      if (additionalData) {
        await updateDoc(userRef, additionalData);
        // console.log('User profile updated:', user.uid);
      }

      return { id: user.uid, ...userSnap.data() };
    }
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw error;
  }
};

// Lấy thông tin profile người dùng
export const getUserProfile = async (uid: string) => {
  // console.log('Getting user profile for:', uid);

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      // console.log('User profile retrieved:', userData);
      return { id: userSnap.id, ...userData };
    } else {
      // console.log('User profile not found for:', uid);
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Search user by multiple criteria (ID, username, atName)
export const searchUserByIdentifier = async (identifier: string) => {
  try {
    // Remove common prefixes
    let searchTerm = identifier.trim();
    if (searchTerm.startsWith('u/')) {
      searchTerm = searchTerm.substring(2);
    } else if (searchTerm.startsWith('@')) {
      searchTerm = searchTerm.substring(1);
    } else if (searchTerm.startsWith('ID: ')) {
      searchTerm = searchTerm.substring(4);
    }

    const usersRef = collection(db, 'users');

    // Try to find by customUID first (ID format like 549-110-NAM)
    if (searchTerm.includes('-')) {
      const customUIDQuery = query(usersRef, where('customUID', '==', searchTerm));
      const customUIDSnapshot = await getDocs(customUIDQuery);

      if (!customUIDSnapshot.empty) {
        const userData = customUIDSnapshot.docs[0].data() as User;
        return { id: customUIDSnapshot.docs[0].id, ...userData };
      }
    }

    // Try to find by username
    const usernameQuery = query(usersRef, where('username', '==', searchTerm));
    const usernameSnapshot = await getDocs(usernameQuery);

    if (!usernameSnapshot.empty) {
      const userData = usernameSnapshot.docs[0].data() as User;
      return { id: usernameSnapshot.docs[0].id, ...userData };
    }

    // Try to find by displayName
    const displayNameQuery = query(usersRef, where('displayName', '==', searchTerm));
    const displayNameSnapshot = await getDocs(displayNameQuery);

    if (!displayNameSnapshot.empty) {
      const userData = displayNameSnapshot.docs[0].data() as User;
      return { id: displayNameSnapshot.docs[0].id, ...userData };
    }

    // Try to find by atName
    const atNameQuery = query(usersRef, where('atName', '==', searchTerm));
    const atNameSnapshot = await getDocs(atNameQuery);

    if (!atNameSnapshot.empty) {
      const userData = atNameSnapshot.docs[0].data() as User;
      return { id: atNameSnapshot.docs[0].id, ...userData };
    }

    return null;
  } catch (error) {
    console.error('Error searching user:', error);
    throw error;
  }
};

// Search users by partial name with privacy checks
export const searchUsersByPartialName = async (searchTerm: string, limit: number = 5): Promise<User[]> => {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const usersRef = collection(db, 'users');
    const allUsersQuery = query(usersRef);
    const snapshot = await getDocs(allUsersQuery);

    const results: User[] = [];

    snapshot.forEach((doc) => {
      const userData = doc.data() as User;

      // Check if user allows message search (defaults to true if not set)
      if (userData.allowMessageSearch === false) {
        return; // Skip this user
      }

      const lowerSearch = searchTerm.toLowerCase();
      const username = (userData.username || '').toLowerCase();
      const displayName = (userData.displayName || '').toLowerCase();
      const atName = (userData.atName || '').toLowerCase();
      const customUID = (userData.customUID || '').toLowerCase();

      // Check if any field matches partial search
      if (username.includes(lowerSearch) ||
        displayName.includes(lowerSearch) ||
        atName.includes(lowerSearch) ||
        customUID.includes(lowerSearch)) {
        results.push({ id: doc.id, ...userData });
      }
    });

    // Sort by relevance (exact matches first, then by length)
    results.sort((a, b) => {
      const aUsername = (a.username || '').toLowerCase();
      const bUsername = (b.username || '').toLowerCase();
      const lowerSearch = searchTerm.toLowerCase();

      const aExact = aUsername === lowerSearch ? 1 : 0;
      const bExact = bUsername === lowerSearch ? 1 : 0;

      if (aExact !== bExact) return bExact - aExact;
      return aUsername.length - bUsername.length;
    });

    return results.slice(0, limit);
  } catch (error) {
    console.error('Error searching users by partial name:', error);
    return [];
  }
};

// Cập nhật thông tin profile người dùng
export const updateUserProfile = async (uid: string, data: Partial<User>) => {
  // console.log('Updating user profile for:', uid, 'with data:', data);

  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
    // console.log('User profile updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Tăng/giảm karma cho người dùng
export const updateUserKarma = async (uid: string, amount: number) => {
  console.log(`Updating karma for user ${uid} by ${amount}`);

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      const currentKarma = userData.karma ?? 0; // Use ?? instead of || to handle 0 correctly
      const newKarma = Math.max(0, currentKarma + amount); // Ensure karma doesn't go below 0

      await updateDoc(userRef, { karma: newKarma });
      console.log(`Karma updated from ${currentKarma} to ${newKarma}`);

      return newKarma;
    } else {
      console.error('User not found:', uid);
      // Create user document if it doesn't exist
      await setDoc(userRef, { karma: Math.max(0, amount), createdAt: new Date() });
      return Math.max(0, amount);
    }
  } catch (error) {
    console.error('Error updating user karma:', error);
    throw error;
  }
};

// Lưu bài viết
export const savePost = async (uid: string, postId: string) => {
  console.log(`User ${uid} saving post ${postId}`);

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      const savedPosts = userData.savedPosts || [];

      if (!savedPosts.includes(postId)) {
        await updateDoc(userRef, {
          savedPosts: [...savedPosts, postId]
        });
        console.log(`Post ${postId} saved by user ${uid}`);
        return true;
      } else {
        console.log(`Post ${postId} already saved by user ${uid}`);
        return false;
      }
    } else {
      console.error('User not found:', uid);
      return false;
    }
  } catch (error) {
    console.error('Error saving post:', error);
    throw error;
  }
};

// Bỏ lưu bài viết
export const unsavePost = async (uid: string, postId: string) => {
  console.log(`User ${uid} unsaving post ${postId}`);

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      const savedPosts = userData.savedPosts || [];

      if (savedPosts.includes(postId)) {
        await updateDoc(userRef, {
          savedPosts: savedPosts.filter(id => id !== postId)
        });
        console.log(`Post ${postId} unsaved by user ${uid}`);
        return true;
      } else {
        console.log(`Post ${postId} not saved by user ${uid}`);
        return false;
      }
    } else {
      console.error('User not found:', uid);
      return false;
    }
  } catch (error) {
    console.error('Error unsaving post:', error);
    throw error;
  }
};

// Lấy danh sách bài viết đã lưu
export const getSavedPosts = async (uid: string) => {
  console.log(`Getting saved posts for user ${uid}`);

  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as User;
      const savedPosts = userData.savedPosts || [];

      if (savedPosts.length === 0) {
        console.log('No saved posts found');
        return [];
      }

      // Lấy thông tin chi tiết của các bài viết đã lưu
      const postsRef = collection(db, 'posts');
      const chunks = [];

      // Chia nhỏ mảng savedPosts để tránh lỗi "in" filter có quá nhiều điều kiện
      for (let i = 0; i < savedPosts.length; i += 10) {
        chunks.push(savedPosts.slice(i, i + 10));
      }

      let allPosts = [];

      for (const chunk of chunks) {
        const q = query(postsRef, where('id', 'in', chunk));
        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allPosts = [...allPosts, ...posts];
      }

      console.log(`Retrieved ${allPosts.length} saved posts`);
      return allPosts;
    } else {
      console.error('User not found:', uid);
      return [];
    }
  } catch (error) {
    console.error('Error getting saved posts:', error);
    throw error;
  }
};

// Kiểm tra @name có sẵn hay không
export const checkAtNameAvailability = async (atName: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('atName', '==', atName));
    const querySnapshot = await getDocs(q);

    return querySnapshot.empty; // true nếu không có user nào dùng @name này
  } catch (error) {
    console.error('Error checking @name availability:', error);
    throw error;
  }
}; 
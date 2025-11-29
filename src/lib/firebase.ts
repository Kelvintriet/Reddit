import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import { collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, where, limit, serverTimestamp, Timestamp } from 'firebase/firestore'

// Sử dụng cấu hình từ services/firebase/config.ts
import { db, auth, storage } from '../services/firebase/config';

// Không cần khởi tạo lại Firebase
export { db, auth, storage };

// Cấu hình Google Auth Provider với các tùy chọn bổ sung
export const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('email')
googleProvider.addScope('profile')
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

// Auth functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

export const registerWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password)

export const logout = () => signOut(auth)

// User profile functions
export const createUserProfile = async (user: FirebaseUser, additionalData?: any) => {
  if (!user) return

  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    const { displayName, email } = user
    const createdAt = serverTimestamp()

    try {
      await setDoc(userRef, {
        displayName: displayName || additionalData?.username || email?.split('@')[0],
        email,
        createdAt,
        karma: 0,
        ...additionalData
      })
    } catch (error) {
      console.log('Error creating user profile:', error)
    }
  }

  return userRef
}

export const getUserProfile = async (uid: string) => {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)
  return userSnap.exists() ? userSnap.data() : null
}

export const updateUserProfile = async (uid: string, data: any) => {
  const userRef = doc(db, 'users', uid)
  return updateDoc(userRef, data)
}

// Subreddit functions
export const createSubreddit = async (data: {
  name: string
  description: string
  createdBy: string
}) => {
  const subredditRef = doc(db, 'subreddits', data.name.toLowerCase())
  const subredditSnap = await getDoc(subredditRef)

  if (subredditSnap.exists()) {
    throw new Error('Subreddit already exists')
  }

  return setDoc(subredditRef, {
    ...data,
    createdAt: serverTimestamp(),
    memberCount: 1,
    members: [data.createdBy]
  })
}

export const getSubreddits = async () => {
  const subredditsRef = collection(db, 'subreddits')
  const q = query(subredditsRef, orderBy('memberCount', 'desc'), limit(50))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const getSubreddit = async (name: string) => {
  const subredditRef = doc(db, 'subreddits', name.toLowerCase())
  const subredditSnap = await getDoc(subredditRef)
  return subredditSnap.exists() ? { id: subredditSnap.id, ...subredditSnap.data() } : null
}

export const joinSubreddit = async (subredditName: string, userId: string) => {
  const subredditRef = doc(db, 'subreddits', subredditName.toLowerCase())
  const subredditSnap = await getDoc(subredditRef)

  if (subredditSnap.exists()) {
    const data = subredditSnap.data()
    const members = data.members || []

    if (!members.includes(userId)) {
      return updateDoc(subredditRef, {
        members: [...members, userId],
        memberCount: (data.memberCount || 0) + 1
      })
    }
  }
}

export const leaveSubreddit = async (subredditName: string, userId: string) => {
  const subredditRef = doc(db, 'subreddits', subredditName.toLowerCase())
  const subredditSnap = await getDoc(subredditRef)

  if (subredditSnap.exists()) {
    const data = subredditSnap.data()
    const members = data.members || []

    if (members.includes(userId)) {
      return updateDoc(subredditRef, {
        members: members.filter((id: string) => id !== userId),
        memberCount: Math.max((data.memberCount || 0) - 1, 0)
      })
    }
  }
}

// Post functions
export const createPost = async (data: {
  title: string
  content: string
  subreddit?: string
  authorId: string
  authorUsername: string
  type: 'text' | 'link' | 'image'
  url?: string
}) => {
  console.log('Creating post in Firebase with data:', data);

  try {
    // Kiểm tra xem collection posts đã tồn tại chưa, nếu chưa thì tạo mới
    const postsRef = collection(db, 'posts');

    // Tạo dữ liệu cho bài viết
    const postData = {
      ...data,
      createdAt: new Date(), // Sử dụng Date thay vì serverTimestamp để đảm bảo có giá trị ngay lập tức
      upvotes: 0,
      downvotes: 0,
      commentCount: 0,
      viewCount: 0,
      viewedBy: [],
      votes: {} // userId -> 'up' | 'down'
    };

    console.log('Final post data to be saved:', postData);

    // Thêm document mới vào collection posts
    const docRef = await addDoc(postsRef, postData);

    console.log('Post created with ID:', docRef.id);

    // Cập nhật lại document với ID để dễ tham chiếu
    await updateDoc(doc(db, 'posts', docRef.id), {
      id: docRef.id
    });

    return docRef;
  } catch (error) {
    console.error('Error in createPost function:', error);
    throw error;
  }
}

// Tăng số lượt xem cho bài viết
export const incrementPostView = async (postId: string, userId: string) => {
  console.log(`Incrementing view for post ${postId} by user ${userId}`);

  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (postSnap.exists()) {
      const postData = postSnap.data();
      const viewedBy = postData.viewedBy || [];

      // Chỉ tăng lượt xem nếu người dùng chưa xem bài viết này
      if (!viewedBy.includes(userId)) {
        console.log(`User ${userId} has not viewed post ${postId} before, incrementing view count`);
        const newViewCount = (postData.viewCount || 0) + 1;

        await updateDoc(postRef, {
          viewCount: newViewCount,
          viewedBy: [...viewedBy, userId]
        });

        console.log(`View count updated to ${newViewCount}`);
        return true;
      } else {
        console.log(`User ${userId} has already viewed post ${postId}`);
        return false;
      }
    } else {
      console.error(`Post ${postId} not found`);
      return false;
    }
  } catch (error) {
    console.error('Error incrementing post view:', error);
    return false;
  }
}

// Special subreddits: trending và popular
export const OFFICIAL_SUBREDDITS = ['trending', 'popular', 'explore'];

// Kiểm tra xem một subreddit có phải là official không
export const isOfficialSubreddit = (subredditName: string): boolean => {
  return OFFICIAL_SUBREDDITS.includes(subredditName.toLowerCase());
};

// Lấy trending posts (tỉ lệ upvote/downvote cao nhất trong 100 posts)
export const getTrendingPosts = async () => {
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'), limit(100));
  const querySnapshot = await getDocs(q);

  const posts = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    upvoteRatio: calculateUpvoteRatio(doc.data())
  }));

  // Sắp xếp theo upvote ratio
  return posts
    .sort((a, b) => b.upvoteRatio - a.upvoteRatio)
    .slice(0, 20); // Chỉ lấy 20 posts có ratio cao nhất
};

// Lấy popular posts (nhiều lượt xem nhất trong 1000 posts)
export const getPopularPosts = async () => {
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('viewCount', 'desc'), limit(20));

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    // Nếu không có index cho viewCount, sắp xếp theo upvotes
    console.log('Falling back to upvotes sorting for popular posts');
    const fallbackQuery = query(postsRef, orderBy('upvotes', 'desc'), limit(20));
    const querySnapshot = await getDocs(fallbackQuery);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

// Lấy các subreddit phổ biến nhất để khám phá
export const getExploreSubreddits = async () => {
  const subredditsRef = collection(db, 'subreddits');
  const q = query(subredditsRef, orderBy('memberCount', 'desc'), limit(20));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Tính tỉ lệ upvote/downvote
const calculateUpvoteRatio = (post: any): number => {
  const upvotes = post.upvotes || 0;
  const downvotes = post.downvotes || 0;
  const total = upvotes + downvotes;

  if (total === 0) return 0;
  return upvotes / total;
};

// Cập nhật getPosts để hỗ trợ trending và popular
export const getPosts = async (subreddit?: string, sortBy: 'hot' | 'new' | 'top' = 'hot') => {
  // Xử lý các subreddit đặc biệt
  if (subreddit === 'trending') {
    return getTrendingPosts();
  }

  if (subreddit === 'popular') {
    return getPopularPosts();
  }

  if (subreddit === 'explore') {
    return getExploreSubreddits();
  }

  // Logic thông thường cho các subreddit khác
  const postsRef = collection(db, 'posts');
  let q;

  if (subreddit) {
    if (sortBy === 'new') {
      q = query(
        postsRef,
        where('subreddit', '==', subreddit),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      // Để tránh lỗi index, chúng ta không sắp xếp theo upvotes khi lọc theo subreddit
      q = query(
        postsRef,
        where('subreddit', '==', subreddit),
        limit(50)
      );
    }
  } else {
    if (sortBy === 'new') {
      q = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        postsRef,
        orderBy('upvotes', 'desc'),
        limit(50)
      );
    }
  }

  const querySnapshot = await getDocs(q);
  const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Nếu cần sắp xếp theo upvotes nhưng không thể dùng orderBy trong query
  if (subreddit && sortBy === 'top') {
    return posts.sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0));
  }

  return posts;
}

export const getPost = async (postId: string) => {
  console.log('Getting post with ID:', postId);

  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (postSnap.exists()) {
      const postData = postSnap.data();
      console.log('Post data retrieved:', postData);
      return { id: postSnap.id, ...postData };
    } else {
      console.log('Post not found with ID:', postId);
      return null;
    }
  } catch (error) {
    console.error('Error getting post:', error);
    throw error;
  }
}

export const votePost = async (postId: string, userId: string, voteType: 'up' | 'down') => {
  const postRef = doc(db, 'posts', postId)
  const postSnap = await getDoc(postRef)

  if (postSnap.exists()) {
    const data = postSnap.data()
    const votes = data.votes || {}
    const currentVote = votes[userId]

    let upvotes = data.upvotes || 0
    let downvotes = data.downvotes || 0

    // Remove previous vote
    if (currentVote === 'up') upvotes--
    if (currentVote === 'down') downvotes--

    // Add new vote (if different from current)
    if (currentVote !== voteType) {
      votes[userId] = voteType
      if (voteType === 'up') upvotes++
      if (voteType === 'down') downvotes++
    } else {
      delete votes[userId] // Remove vote if same
    }

    return updateDoc(postRef, { votes, upvotes, downvotes })
  }
}

export const deletePost = async (postId: string) => {
  const postRef = doc(db, 'posts', postId)
  return deleteDoc(postRef)
}

// Comment functions
export const createComment = async (data: {
  content: string
  postId: string
  authorId: string
  authorUsername: string
  parentCommentId?: string
}) => {
  const commentsRef = collection(db, 'comments')
  const comment = await addDoc(commentsRef, {
    ...data,
    createdAt: serverTimestamp(),
    upvotes: 0,
    downvotes: 0,
    votes: {},
    replies: []
  })

  // Update post comment count
  const postRef = doc(db, 'posts', data.postId)
  const postSnap = await getDoc(postRef)
  if (postSnap.exists()) {
    const postData = postSnap.data()
    await updateDoc(postRef, {
      commentCount: (postData.commentCount || 0) + 1
    })
  }

  return comment
}

export const getComments = async (postId: string) => {
  const commentsRef = collection(db, 'comments')
  const q = query(
    commentsRef,
    where('postId', '==', postId),
    orderBy('createdAt', 'asc')
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const voteComment = async (commentId: string, userId: string, voteType: 'up' | 'down') => {
  const commentRef = doc(db, 'comments', commentId)
  const commentSnap = await getDoc(commentRef)

  if (commentSnap.exists()) {
    const data = commentSnap.data()
    const votes = data.votes || {}
    const currentVote = votes[userId]

    let upvotes = data.upvotes || 0
    let downvotes = data.downvotes || 0

    // Remove previous vote
    if (currentVote === 'up') upvotes--
    if (currentVote === 'down') downvotes--

    // Add new vote (if different from current)
    if (currentVote !== voteType) {
      votes[userId] = voteType
      if (voteType === 'up') upvotes++
      if (voteType === 'down') downvotes++
    } else {
      delete votes[userId] // Remove vote if same
    }

    return updateDoc(commentRef, { votes, upvotes, downvotes })
  }
}

export const deleteComment = async (commentId: string, postId: string) => {
  const commentRef = doc(db, 'comments', commentId)

  // Update post comment count
  const postRef = doc(db, 'posts', postId)
  const postSnap = await getDoc(postRef)
  if (postSnap.exists()) {
    const postData = postSnap.data()
    await updateDoc(postRef, {
      commentCount: Math.max((postData.commentCount || 0) - 1, 0)
    })
  }

  return deleteDoc(commentRef)
}

// Real-time auth state listener
export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

export { serverTimestamp, Timestamp }
export type { FirebaseUser } 
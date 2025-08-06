import { create } from 'zustand'
import { collection, getDocs, query, where, orderBy, limit, getDoc, doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Post } from '../types'
import { createPost as createPostCollection, votePost as votePostCollection } from '../collections/posts';
import { processKarmaAction } from '../services/karmaService';

interface PostsState {
  posts: Post[]
  currentPost: Post | null
  isLoading: boolean
  error: string | null
  sortBy: 'hot' | 'new' | 'top'
  setSortBy: (sortBy: 'hot' | 'new' | 'top') => void
  setCurrentPost: (post: Post | null) => void
  fetchPosts: (subreddit?: string) => Promise<void>
  fetchPostById: (id: string, userId?: string) => Promise<Post | null>
  fetchSpecialSubreddit: (type: 'popular' | 'trending') => Promise<void>
  fetchUserPosts: (userId: string) => Promise<void>
  createPost: (postData: Omit<Post, 'id' | 'createdAt' | 'upvotes' | 'downvotes' | 'commentCount' | 'viewCount' | 'viewedBy' | 'votes'>, userId: string, username: string) => Promise<string | null>
  voteOnPost: (postId: string, voteType: 'up' | 'down', userId: string) => Promise<void>
  removePostFromState: (postId: string) => void // Add method to remove post from state
  deletePost: (postId: string) => void // Delete post (alias for removePostFromState)
  clearError: () => void
}

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  currentPost: null,
  isLoading: false,
  error: null,
  sortBy: 'hot',
  
  setSortBy: (sortBy) => set({ sortBy }),
  setCurrentPost: (post) => set({ currentPost: post }),
  clearError: () => set({ error: null }),
  
  fetchPosts: async (subreddit?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const postsRef = collection(db, 'posts')
      let q
      
      // Handle special subreddits
      if (subreddit === 'popular' || subreddit === 'trending') {
        await get().fetchSpecialSubreddit(subreddit)
        return
      }
      
      if (subreddit) {
        // Fetch posts from specific subreddit
        q = query(
          postsRef,
          where('subreddit', '==', subreddit),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
      } else {
        // Fetch all posts for home feed
        q = query(
          postsRef,
          orderBy('createdAt', 'desc'),
          limit(50)
        )
      }
      
      const querySnapshot = await getDocs(q)
      const posts: Post[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        posts.push({
          id: doc.id,
          title: data.title,
          content: data.content || '',
          contentType: data.contentType || 'html', // Default to HTML for backward compatibility
          authorId: data.authorId,
          authorUsername: data.authorUsername,
          subreddit: data.subreddit,
          createdAt: data.createdAt,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          commentCount: data.commentCount || 0,
          imageUrls: data.imageUrls || [],
          viewCount: data.viewCount || 0,
          viewedBy: data.viewedBy || [],
          votes: data.votes || {},
          type: data.type || 'text',
          url: data.url
        })
      })
      
      set({ posts, isLoading: false, error: null })
    } catch (error) {
      set({ 
        posts: [], 
        isLoading: false, 
        error: 'Không thể tải bài viết. Vui lòng thử lại.' 
      })
    }
  },

  fetchSpecialSubreddit: async (type: 'popular' | 'trending') => {
    set({ isLoading: true, error: null })
    
    try {
      const postsRef = collection(db, 'posts')
      const now = new Date()
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      
      // Get all posts from the last month
      const q = query(
        postsRef,
        where('createdAt', '>=', monthAgo),
        orderBy('createdAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const allPosts: Post[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        allPosts.push({
          id: doc.id,
          title: data.title,
          content: data.content || '',
          authorId: data.authorId,
          authorUsername: data.authorUsername,
          subreddit: data.subreddit,
          createdAt: data.createdAt,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          commentCount: data.commentCount || 0,
          imageUrls: data.imageUrls || [],
          viewCount: data.viewCount || 0,
          viewedBy: data.viewedBy || [],
          votes: data.votes || {},
          type: data.type || 'text',
          url: data.url
        })
      })
      
      let filteredPosts: Post[] = []
      
      if (type === 'popular') {
        // Popular: Most views and likes ratio (not including downvotes)
        // Only 100 posts monthly
        filteredPosts = allPosts
          .sort((a, b) => {
            const aScore = ((a.viewCount ?? 0) * 0.3) + ((a.upvotes ?? 0) * 0.7)
            const bScore = ((b.viewCount ?? 0) * 0.3) + ((b.upvotes ?? 0) * 0.7)
            return bScore - aScore
          })
          .slice(0, 100)
      } else if (type === 'trending') {
        // Trending: Best ratio between upvotes and downvotes
        // Only 150 posts monthly, updated daily
        filteredPosts = allPosts
          .filter(post => post.upvotes > 0 || post.downvotes > 0) // Must have votes
          .sort((a, b) => {
            const aRatio = a.upvotes / Math.max(1, a.upvotes + a.downvotes)
            const bRatio = b.upvotes / Math.max(1, b.upvotes + b.downvotes)
            
            // Secondary sort by total engagement
            if (Math.abs(aRatio - bRatio) < 0.01) {
              return ((b.upvotes ?? 0) + (b.downvotes ?? 0) + (b.viewCount ?? 0)) - ((a.upvotes ?? 0) + (a.downvotes ?? 0) + (a.viewCount ?? 0))
            }
            
            return bRatio - aRatio
          })
          .slice(0, 150)
      }
      
      set({ posts: filteredPosts, isLoading: false, error: null })
    } catch (error) {
      set({ 
        posts: [], 
        isLoading: false, 
        error: `Không thể tải bài viết ${type}. Vui lòng thử lại.` 
      })
    }
  },
  
  fetchPostById: async (id: string, userId?: string) => {
    try {
      const postDoc = await getDoc(doc(db, 'posts', id))
      
      if (postDoc.exists()) {
        const data = postDoc.data()
        const post: Post = {
          id: postDoc.id,
          title: data.title,
          content: data.content || '',
          contentType: data.contentType || 'html', // Default to HTML for backward compatibility
          authorId: data.authorId,
          authorUsername: data.authorUsername,
          subreddit: data.subreddit,
          createdAt: data.createdAt,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          commentCount: data.commentCount || 0,
          imageUrls: data.imageUrls || [],
          viewCount: data.viewCount || 0,
          viewedBy: data.viewedBy || [],
          votes: data.votes || {},
          type: data.type || 'text',
          url: data.url
        }
        
        // Update currentPost in store
        set({ currentPost: post })
        return post
      }
      
      // Post not found
      set({ currentPost: null })
      return null
    } catch (error) {
      // Silent error handling
      set({ currentPost: null })
      return null
    }
  },

  fetchUserPosts: async (userId: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const postsRef = collection(db, 'posts')
      const q = query(
        postsRef,
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
      
      const querySnapshot = await getDocs(q)
      const posts: Post[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        posts.push({
          id: doc.id,
          title: data.title,
          content: data.content || '',
          contentType: data.contentType || 'html', // Default to HTML for backward compatibility
          authorId: data.authorId,
          authorUsername: data.authorUsername,
          subreddit: data.subreddit,
          createdAt: data.createdAt,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          commentCount: data.commentCount || 0,
          imageUrls: data.imageUrls || [],
          viewCount: data.viewCount || 0,
          viewedBy: data.viewedBy || [],
          votes: data.votes || {},
          type: data.type || 'text',
          url: data.url
        })
      })
      
      set({ posts, isLoading: false, error: null })
    } catch (error) {
      set({ 
        posts: [], 
        isLoading: false, 
        error: 'Không thể tải bài viết của người dùng. Vui lòng thử lại.' 
      })
    }
  },

  createPost: async (postData, userId, username) => {
    set({ isLoading: true });
    try {
      const newPostId = await createPostCollection({
        ...postData,
        authorId: userId,
        authorUsername: username || 'Người dùng ẩn danh',
        type: postData.type || 'text',
      });

      // Process karma for post creation
      await processKarmaAction({
        type: 'post_created',
        userId: userId
      });

      set({ isLoading: false });
      return newPostId;
    } catch (error: any) {
      set({ error: error.message || 'Tạo bài viết thất bại', isLoading: false });
      return null;
    }
  },

  voteOnPost: async (postId, voteType, userId) => {
    try {
      // Get the post to find the author
      const post = get().posts.find(p => p.id === postId) || get().currentPost;
      if (!post) {
        // Fetch post if not in state
        const postDoc = await getDoc(doc(db, 'posts', postId));
        if (postDoc.exists()) {
          const postData = postDoc.data();
          const authorId = postData.authorId;

          // Get previous vote to calculate karma change
          const previousVote = postData.votes?.[userId] || null;

          const updatedVotes = await votePostCollection(postId, userId, voteType);

          // Process karma for the post author
          if (authorId && authorId !== userId) { // Don't give karma for voting on own posts
            // Remove previous vote karma if exists
            if (previousVote) {
              await processKarmaAction({
                type: 'vote_removed',
                userId: authorId,
                postId: postId,
                previousVote: previousVote
              });
            }

            // Add new vote karma
            await processKarmaAction({
              type: voteType === 'up' ? 'post_upvote' : 'post_downvote',
              userId: authorId,
              postId: postId
            });
          }

          set({ error: null });
          return;
        }
      }

      // Get previous vote to calculate karma change
      const previousVote = post?.votes?.[userId] || null;

      const updatedVotes = await votePostCollection(postId, userId, voteType);

      // Process karma for the post author
      if (post?.authorId && post.authorId !== userId) { // Don't give karma for voting on own posts
        // Remove previous vote karma if exists
        if (previousVote) {
          await processKarmaAction({
            type: 'vote_removed',
            userId: post.authorId,
            postId: postId,
            previousVote: previousVote
          });
        }

        // Add new vote karma
        await processKarmaAction({
          type: voteType === 'up' ? 'post_upvote' : 'post_downvote',
          userId: post.authorId,
          postId: postId
        });
      }

      // Update the specific post in the 'posts' array
      const updatedPosts = get().posts.map(p => {
        if (p.id === postId) {
          return { ...p, ...updatedVotes };
        }
        return p;
      });

      // Update currentPost if it's the one being voted on
      const currentPost = get().currentPost;
      const updatedCurrentPost = currentPost?.id === postId ? { ...currentPost, ...updatedVotes } : currentPost;

      set({ posts: updatedPosts, currentPost: updatedCurrentPost });
    } catch (error: any) {
      set({ error: error.message || 'Vote thất bại' });
    }
  },

  removePostFromState: (postId: string) => {
    const updatedPosts = get().posts.filter(p => p.id !== postId);
    const currentPost = get().currentPost;
    const updatedCurrentPost = currentPost?.id === postId ? null : currentPost;

    set({ posts: updatedPosts, currentPost: updatedCurrentPost });
  },

  deletePost: (postId: string) => {
    // Alias for removePostFromState - used by bot system
    get().removePostFromState(postId);
  },

  clearError: () => set({ error: null }),
}))
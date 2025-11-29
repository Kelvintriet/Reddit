import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { collection, getDocs, query, where, orderBy, limit, getDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Post } from '../types'
import { createPost as createPostCollection, votePost as votePostCollection } from '../collections/posts'
import { processKarmaAction } from '../services/karmaService'

interface CacheEntry {
  data: Post[]
  timestamp: number
  subreddit?: string
}

interface PostsState {
  posts: Post[]
  currentPost: Post | null
  isLoading: boolean
  error: string | null
  sortBy: 'hot' | 'new' | 'top'
  cache: Record<string, CacheEntry>
  realtimeUnsubscribe: (() => void) | null
  setSortBy: (sortBy: 'hot' | 'new' | 'top') => void
  setCurrentPost: (post: Post | null) => void
  fetchPosts: (subreddit?: string, forceRefresh?: boolean) => Promise<void>
  fetchPostById: (id: string, userId?: string) => Promise<Post | null>
  fetchSpecialSubreddit: (type: 'popular' | 'trending') => Promise<void>
  fetchUserPosts: (userId: string) => Promise<void>
  createPost: (postData: Omit<Post, 'id' | 'createdAt' | 'upvotes' | 'downvotes' | 'commentCount' | 'viewCount' | 'viewedBy' | 'votes'>, userId: string, username: string) => Promise<string | null>
  voteOnPost: (postId: string, voteType: 'up' | 'down', userId: string) => Promise<void>
  removePostFromState: (postId: string) => void
  deletePost: (postId: string) => void
  clearError: () => void
  clearCache: () => void
  setupRealtimeListener: (subreddit?: string) => void
  cleanupRealtimeListener: () => void
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const usePostsStore = create<PostsState>()(
  persist(
    (set, get) => ({
      posts: [],
      currentPost: null,
      isLoading: false,
      error: null,
      sortBy: 'hot',
      cache: {},
      realtimeUnsubscribe: null,

      setSortBy: (sortBy) => set({ sortBy }),
      setCurrentPost: (post) => set({ currentPost: post }),
      clearError: () => set({ error: null }),
      clearCache: () => set({ cache: {} }),

      setupRealtimeListener: (subreddit?: string) => {
        // Clean up existing listener
        const currentUnsubscribe = get().realtimeUnsubscribe
        if (currentUnsubscribe) {
          currentUnsubscribe()
        }

        // Setup new listener
        const postsRef = collection(db, 'posts')
        let q

        if (subreddit && subreddit !== 'popular' && subreddit !== 'trending') {
          q = query(
            postsRef,
            where('subreddit', '==', subreddit),
            orderBy('createdAt', 'desc'),
            limit(100)
          )
        } else if (!subreddit) {
          q = query(
            postsRef,
            orderBy('createdAt', 'desc'),
            limit(100)
          )
        } else {
          // Don't setup realtime for special subreddits
          return
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const posts: Post[] = []

          snapshot.forEach((doc) => {
            const data = doc.data()
            // Filter out deleted posts as safety measure
            if (data.isDeleted === true) return

            // Calculate upvotes/downvotes from votes object
            const votes = data.votes || {}
            let calculatedUpvotes = 0
            let calculatedDownvotes = 0

            Object.values(votes).forEach((vote: any) => {
              if (vote === 'up') calculatedUpvotes++
              else if (vote === 'down') calculatedDownvotes++
            })

            posts.push({
              id: doc.id,
              title: data.title,
              content: data.content || '',
              contentType: data.contentType || 'html',
              authorId: data.authorId,
              authorUsername: data.authorUsername,
              subreddit: data.subreddit,
              createdAt: data.createdAt,
              upvotes: calculatedUpvotes,
              downvotes: calculatedDownvotes,
              commentCount: data.commentCount || 0,
              imageUrls: data.imageUrls || [],
              viewCount: data.viewCount || 0,
              viewedBy: data.viewedBy || [],
              votes: votes,
              type: data.type || 'text',
              url: data.url,
              isDeleted: data.isDeleted || false
            })
          })

          // Filter and limit
          const filteredPosts = posts.filter(p => !p.isDeleted).slice(0, 50)

          // Only update if we have posts OR if this is the initial load (no existing posts)
          const currentPosts = get().posts
          const cacheKey = subreddit || 'home'

          // Only update if we have results OR if current posts are empty (initial load)
          if (filteredPosts.length > 0 || currentPosts.length === 0) {
            set({
              posts: filteredPosts.length > 0 ? filteredPosts : currentPosts,
              cache: {
                ...get().cache,
                [cacheKey]: {
                  data: filteredPosts.length > 0 ? filteredPosts : currentPosts,
                  timestamp: Date.now(),
                  subreddit
                }
              }
            })
          }
        }, (error) => {
          console.error('Realtime listener error:', error)
          // Don't clear posts on error - keep existing posts
        })

        set({ realtimeUnsubscribe: unsubscribe })
      },

      cleanupRealtimeListener: () => {
        const unsubscribe = get().realtimeUnsubscribe
        if (unsubscribe) {
          unsubscribe()
          set({ realtimeUnsubscribe: null })
        }
      },

      fetchPosts: async (subreddit?: string, forceRefresh = false) => {
        const cacheKey = subreddit || 'home'
        const cachedData = get().cache[cacheKey]

        // Check cache validity - only use cache if it has posts
        if (!forceRefresh && cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION && cachedData.data && cachedData.data.length > 0) {
          set({ posts: cachedData.data, isLoading: false, error: null })

          // Setup realtime listener for future updates
          get().setupRealtimeListener(subreddit)
          return
        }

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
            q = query(
              postsRef,
              where('subreddit', '==', subreddit),
              orderBy('createdAt', 'desc'),
              limit(100) // Fetch more to account for filtering
            )
          } else {
            q = query(
              postsRef,
              orderBy('createdAt', 'desc'),
              limit(100) // Fetch more to account for filtering
            )
          }

          const querySnapshot = await getDocs(q)
          const posts: Post[] = []

          querySnapshot.forEach((doc) => {
            const data = doc.data()
            // Filter out deleted posts
            if (data.isDeleted === true) return

            // Calculate upvotes/downvotes from votes object if needed
            const votes = data.votes || {}
            let calculatedUpvotes = data.upvotes || 0
            let calculatedDownvotes = data.downvotes || 0

            // Recalculate from votes object to ensure accuracy
            Object.values(votes).forEach((vote: any) => {
              if (vote === 'up') calculatedUpvotes++
              else if (vote === 'down') calculatedDownvotes++
            })

            posts.push({
              id: doc.id,
              title: data.title,
              content: data.content || '',
              contentType: data.contentType || 'html',
              authorId: data.authorId,
              authorUsername: data.authorUsername,
              subreddit: data.subreddit,
              createdAt: data.createdAt,
              upvotes: calculatedUpvotes,
              downvotes: calculatedDownvotes,
              commentCount: data.commentCount || 0,
              imageUrls: data.imageUrls || [],
              viewCount: data.viewCount || 0,
              viewedBy: data.viewedBy || [],
              votes: votes,
              type: data.type || 'text',
              url: data.url,
              isDeleted: data.isDeleted || false
            })
          })

          // Limit after filtering
          const limitedPosts = posts.slice(0, 50)

          // Only update cache if we have posts
          if (limitedPosts.length > 0) {
            set({
              posts: limitedPosts,
              isLoading: false,
              error: null,
              cache: {
                ...get().cache,
                [cacheKey]: {
                  data: limitedPosts,
                  timestamp: Date.now(),
                  subreddit
                }
              }
            })
          } else {
            // If no posts, keep existing posts but don't cache empty array
            set({
              isLoading: false,
              error: null
            })
          }

          // Setup realtime listener
          get().setupRealtimeListener(subreddit)
        } catch (error) {
          // Don't clear posts on error - keep existing posts
          const currentPosts = get().posts
          set({
            posts: currentPosts.length > 0 ? currentPosts : [],
            isLoading: false,
            error: 'Không thể tải bài viết. Vui lòng thử lại.'
          })
        }
      },

      fetchSpecialSubreddit: async (type: 'popular' | 'trending') => {
        const cacheKey = type
        const cachedData = get().cache[cacheKey]

        // Check cache validity (longer cache for special subreddits - 10 minutes)
        // Only use cache if it has posts
        if (cachedData && Date.now() - cachedData.timestamp < 10 * 60 * 1000 && cachedData.data && cachedData.data.length > 0) {
          set({ posts: cachedData.data, isLoading: false, error: null })
          return
        }

        set({ isLoading: true, error: null })

        try {
          const postsRef = collection(db, 'posts')
          const now = new Date()
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

          const q = query(
            postsRef,
            where('createdAt', '>=', monthAgo),
            orderBy('createdAt', 'desc')
          )

          const querySnapshot = await getDocs(q)
          const allPosts: Post[] = []

          querySnapshot.forEach((doc) => {
            const data = doc.data()
            // Filter out deleted posts from special feeds
            if (data.isDeleted === true) return

            // Calculate upvotes/downvotes from votes object
            const votes = data.votes || {}
            let calculatedUpvotes = 0
            let calculatedDownvotes = 0

            Object.values(votes).forEach((vote: any) => {
              if (vote === 'up') calculatedUpvotes++
              else if (vote === 'down') calculatedDownvotes++
            })

            allPosts.push({
              id: doc.id,
              title: data.title,
              content: data.content || '',
              authorId: data.authorId,
              authorUsername: data.authorUsername,
              subreddit: data.subreddit,
              createdAt: data.createdAt,
              upvotes: calculatedUpvotes,
              downvotes: calculatedDownvotes,
              commentCount: data.commentCount || 0,
              imageUrls: data.imageUrls || [],
              viewCount: data.viewCount || 0,
              viewedBy: data.viewedBy || [],
              votes: votes,
              type: data.type || 'text',
              url: data.url,
              isDeleted: data.isDeleted || false
            })
          })

          let filteredPosts: Post[] = []

          if (type === 'popular') {
            filteredPosts = allPosts
              .sort((a, b) => {
                const aScore = ((a.viewCount ?? 0) * 0.3) + ((a.upvotes ?? 0) * 0.7)
                const bScore = ((b.viewCount ?? 0) * 0.3) + ((b.upvotes ?? 0) * 0.7)
                return bScore - aScore
              })
              .slice(0, 100)
          } else if (type === 'trending') {
            filteredPosts = allPosts
              .filter(post => post.upvotes > 0 || post.downvotes > 0)
              .sort((a, b) => {
                const aRatio = a.upvotes / Math.max(1, a.upvotes + a.downvotes)
                const bRatio = b.upvotes / Math.max(1, b.upvotes + b.downvotes)

                if (Math.abs(aRatio - bRatio) < 0.01) {
                  return ((b.upvotes ?? 0) + (b.downvotes ?? 0) + (b.viewCount ?? 0)) - ((a.upvotes ?? 0) + (a.downvotes ?? 0) + (a.viewCount ?? 0))
                }

                return bRatio - aRatio
              })
              .slice(0, 150)
          }

          // Only update cache if we have posts
          if (filteredPosts.length > 0) {
            set({
              posts: filteredPosts,
              isLoading: false,
              error: null,
              cache: {
                ...get().cache,
                [cacheKey]: {
                  data: filteredPosts,
                  timestamp: Date.now()
                }
              }
            })
          } else {
            // If no posts, keep existing posts but don't cache empty array
            set({
              isLoading: false,
              error: null
            })
          }
        } catch (error) {
          // Don't clear posts on error - keep existing posts
          const currentPosts = get().posts
          set({
            posts: currentPosts.length > 0 ? currentPosts : [],
            isLoading: false,
            error: `Không thể tải bài viết ${type}. Vui lòng thử lại.`
          })
        }
      },

      fetchPostById: async (id: string, _userId?: string) => {
        try {
          // First try main posts collection
          let postDoc = await getDoc(doc(db, 'posts', id))
          let isFromDeletedCollection = false

          // If not found, try deletedPosts collection (for direct URL access)
          if (!postDoc.exists()) {
            postDoc = await getDoc(doc(db, 'deletedPosts', id))
            isFromDeletedCollection = true
          }

          if (postDoc.exists()) {
            const data = postDoc.data()

            // Calculate upvotes/downvotes from votes object
            const votes = data.votes || {}
            let calculatedUpvotes = 0
            let calculatedDownvotes = 0

            Object.values(votes).forEach((vote: any) => {
              if (vote === 'up') calculatedUpvotes++
              else if (vote === 'down') calculatedDownvotes++
            })

            const post: Post = {
              id: postDoc.id,
              title: data.title,
              content: data.content || '',
              contentType: data.contentType || 'html',
              authorId: data.authorId,
              authorUsername: data.authorUsername,
              subreddit: data.subreddit,
              createdAt: data.createdAt,
              upvotes: calculatedUpvotes,
              downvotes: calculatedDownvotes,
              commentCount: data.commentCount || 0,
              imageUrls: data.imageUrls || [],
              viewCount: data.viewCount || 0,
              viewedBy: data.viewedBy || [],
              votes: votes,
              type: data.type || 'text',
              url: data.url,
              // If fetched from deletedPosts collection, mark as deleted
              isDeleted: isFromDeletedCollection || data.isDeleted || false
            }

            set({ currentPost: post })
            return post
          }

          set({ currentPost: null })
          return null
        } catch (error) {
          set({ currentPost: null })
          return null
        }
      },

      fetchUserPosts: async (userId: string) => {
        const cacheKey = `user_${userId}`
        const cachedData = get().cache[cacheKey]

        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
          set({ posts: cachedData.data, isLoading: false, error: null })
          return
        }

        set({ isLoading: true, error: null })

        try {
          const postsRef = collection(db, 'posts')
          // Fetch without isDeleted filter first to avoid index issues, then filter
          const q = query(
            postsRef,
            where('authorId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(100) // Fetch more to account for filtering
          )

          const querySnapshot = await getDocs(q)
          const posts: Post[] = []

          querySnapshot.forEach((doc) => {
            const data = doc.data()
            // Filter out deleted posts
            if (data.isDeleted === true) return

            // Calculate upvotes/downvotes from votes object
            const votes = data.votes || {}
            let calculatedUpvotes = 0
            let calculatedDownvotes = 0

            Object.values(votes).forEach((vote: any) => {
              if (vote === 'up') calculatedUpvotes++
              else if (vote === 'down') calculatedDownvotes++
            })

            posts.push({
              id: doc.id,
              title: data.title,
              content: data.content || '',
              contentType: data.contentType || 'html',
              authorId: data.authorId,
              authorUsername: data.authorUsername,
              subreddit: data.subreddit,
              createdAt: data.createdAt,
              upvotes: calculatedUpvotes,
              downvotes: calculatedDownvotes,
              commentCount: data.commentCount || 0,
              imageUrls: data.imageUrls || [],
              viewCount: data.viewCount || 0,
              viewedBy: data.viewedBy || [],
              votes: votes,
              type: data.type || 'text',
              url: data.url,
              isDeleted: data.isDeleted || false
            })
          })

          // Sort and limit after filtering
          posts.sort((a, b) => {
            let aTime: Date
            let bTime: Date

            const aCreatedAt = a.createdAt as any
            const bCreatedAt = b.createdAt as any

            if (aCreatedAt && typeof aCreatedAt.toDate === 'function') {
              aTime = aCreatedAt.toDate()
            } else if (aCreatedAt instanceof Date) {
              aTime = aCreatedAt
            } else {
              aTime = new Date(0)
            }

            if (bCreatedAt && typeof bCreatedAt.toDate === 'function') {
              bTime = bCreatedAt.toDate()
            } else if (bCreatedAt instanceof Date) {
              bTime = bCreatedAt
            } else {
              bTime = new Date(0)
            }

            return bTime.getTime() - aTime.getTime()
          })

          const limitedPosts = posts.slice(0, 50)

          // Only update cache if we have posts
          if (limitedPosts.length > 0) {
            set({
              posts: limitedPosts,
              isLoading: false,
              error: null,
              cache: {
                ...get().cache,
                [cacheKey]: {
                  data: limitedPosts,
                  timestamp: Date.now()
                }
              }
            })
          } else {
            // If no posts, keep existing posts but don't cache empty array
            set({
              isLoading: false,
              error: null
            })
          }
        } catch (error) {
          // Don't clear posts on error - keep existing posts
          const currentPosts = get().posts
          set({
            posts: currentPosts.length > 0 ? currentPosts : [],
            isLoading: false,
            error: 'Không thể tải bài viết của người dùng. Vui lòng thử lại.'
          })
        }
      },

      createPost: async (postData, userId, username) => {
        set({ isLoading: true })
        try {
          const newPostId = await createPostCollection({
            ...postData,
            authorId: userId,
            authorUsername: username || 'Người dùng ẩn danh',
            type: postData.type || 'text',
          })

          await processKarmaAction({
            type: 'post_created',
            userId: userId,
            contentId: newPostId,
            contentType: 'post',
            points: 1
          })

          // Invalidate cache for the subreddit and home
          const cacheKey = postData.subreddit || 'home'
          const newCache = { ...get().cache }
          delete newCache[cacheKey]
          delete newCache['home']
          set({ cache: newCache })

          set({ isLoading: false })
          return newPostId
        } catch (error: any) {
          set({ error: error.message || 'Tạo bài viết thất bại', isLoading: false })
          return null
        }
      },

      voteOnPost: async (postId, voteType, userId) => {
        try {
          const post = get().posts.find(p => p.id === postId) || get().currentPost
          
          // Check if post is deleted before voting
          if (post?.isDeleted) {
            throw new Error('Cannot vote on deleted post')
          }
          
          if (!post) {
            // Check main posts collection first
            let postDoc = await getDoc(doc(db, 'posts', postId))
            
            // If not found, check deletedPosts collection
            if (!postDoc.exists()) {
              const deletedPostDoc = await getDoc(doc(db, 'deletedPosts', postId))
              if (deletedPostDoc.exists()) {
                throw new Error('Cannot vote on deleted post')
              }
              throw new Error('Post not found')
            }
            
            const postData = postDoc.data()
            
            // Check if post is deleted
            if (postData.isDeleted) {
              throw new Error('Cannot vote on deleted post')
            }
            
            const authorId = postData.authorId

            const updatedVotes = await votePostCollection(postId, userId, voteType)

            if (authorId && authorId !== userId && !postData.isDeleted) {
              await processKarmaAction({
                type: voteType === 'up' ? 'post_upvoted' : 'post_downvoted',
                userId: authorId,
                contentId: postId,
                contentType: 'post',
                points: voteType === 'up' ? 1 : -1
              })
            }

            if (updatedVotes) {
              // Update current post if it matches
              const currentPost = get().currentPost
              if (currentPost?.id === postId) {
                set({ currentPost: { ...currentPost, ...updatedVotes } })
              }
            }

            set({ error: null })
            return
          }

          const updatedVotes = await votePostCollection(postId, userId, voteType)

          if (post?.authorId && post.authorId !== userId && !post.isDeleted) {
            await processKarmaAction({
              type: voteType === 'up' ? 'post_upvoted' : 'post_downvoted',
              userId: post.authorId,
              contentId: postId,
              contentType: 'post',
              points: voteType === 'up' ? 1 : -1
            })
          }

          if (updatedVotes) {
            const updatedPosts = get().posts.map(p => {
              if (p.id === postId) {
                return { ...p, ...updatedVotes }
              }
              return p
            })

            const currentPost = get().currentPost
            const updatedCurrentPost = currentPost?.id === postId ? { ...currentPost, ...updatedVotes } : currentPost

            set({ posts: updatedPosts, currentPost: updatedCurrentPost })
          }
        } catch (error: any) {
          set({ error: error.message || 'Vote thất bại' })
          throw error // Re-throw to prevent UI updates
        }
      },

      removePostFromState: (postId: string) => {
        const updatedPosts = get().posts.filter(p => p.id !== postId)
        const currentPost = get().currentPost
        const updatedCurrentPost = currentPost?.id === postId ? null : currentPost

        set({ posts: updatedPosts, currentPost: updatedCurrentPost })
      },

      deletePost: (postId: string) => {
        get().removePostFromState(postId)
      },
    }),
    {
      name: 'posts-storage',
      partialize: (state) => ({
        cache: state.cache,
        sortBy: state.sortBy
      }),
    }
  )
)

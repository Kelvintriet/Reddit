import { create } from 'zustand'
import { useAuthStore } from './authStore'
import {
  createSubreddit as createSubredditCollection,
  getSubreddits as getSubredditsCollection,
  getSubreddit as getSubredditCollection,
  joinSubreddit as joinSubredditCollection,
  leaveSubreddit as leaveSubredditCollection,
  updateSubreddit as updateSubredditCollection,
  deleteSubreddit as deleteSubredditCollection,
  type Subreddit as SubredditType
} from '../collections/subreddits'
import { getUserProfile } from '../collections/users'

export interface Subreddit extends SubredditType {
  id: string
  creatorId: string
  creatorName: string
  createdAt: Date
  updatedAt: Date
  isPrivate: boolean
  rules: string[]
  moderatorIds: string[]
  moderatorNames?: string[]
  bannerImageUrl?: string
  iconImageUrl?: string
}

interface SubredditsState {
  subreddits: Subreddit[]
  currentSubreddit: Subreddit | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchSubreddits: () => Promise<void>
  fetchSubredditByName: (name: string) => Promise<Subreddit | null>
  createSubreddit: (subreddit: Omit<Subreddit, 'id' | 'creatorId' | 'creatorName' | 'createdAt' | 'updatedAt' | 'memberCount' | 'moderatorIds' | 'members' | 'moderators'>) => Promise<void>
  updateSubreddit: (id: string, subredditData: Partial<Subreddit>) => Promise<void>
  deleteSubreddit: (id: string) => Promise<void>
  joinSubreddit: (id: string) => Promise<void>
  leaveSubreddit: (id: string) => Promise<void>
  clearError: () => void
  setCurrentSubreddit: (subreddit: Subreddit | null) => void
  getUsernameFromId: (uid: string) => Promise<string>
}

export const useSubredditsStore = create<SubredditsState>((set, get) => ({
  subreddits: [],
  currentSubreddit: null,
  isLoading: false,
  error: null,

  getUsernameFromId: async (uid: string) => {
    try {
      const userProfile = await getUserProfile(uid)
      return userProfile?.username || userProfile?.displayName || `user_${uid.substring(0, 8)}`
    } catch (error) {
      console.error('Error fetching username:', error)
      return `user_${uid.substring(0, 8)}`
    }
  },

  fetchSubreddits: async () => {
    try {
      set({ isLoading: true, error: null })

      const fetchedSubreddits = await getSubredditsCollection({
        limit: 50,
        orderByMemberCount: true
      })

      // Convert to local Subreddit interface và fetch usernames
      const subreddits: Subreddit[] = await Promise.all(
        fetchedSubreddits.map(async (sub) => {
          const creatorName = await get().getUsernameFromId(sub.createdBy)
          const moderatorNames = await Promise.all(
            (sub.moderators || [sub.createdBy]).map(id => get().getUsernameFromId(id))
          )

          // Properly handle Firestore timestamp conversion
          const convertFirestoreDate = (date: any): Date => {
            if (!date) return new Date();
            if (date instanceof Date) return date;
            if (date.seconds) return new Date(date.seconds * 1000);
            return new Date(date);
          };

          return {
            ...sub,
            id: sub.id || '',
            creatorId: sub.createdBy,
            creatorName,
            createdAt: convertFirestoreDate(sub.createdAt),
            updatedAt: convertFirestoreDate(sub.updatedAt || sub.createdAt),
            isPrivate: sub.isPrivate || false,
            rules: sub.rules || [],
            moderatorIds: sub.moderators || [sub.createdBy],
            moderatorNames,
            bannerImageUrl: sub.bannerUrl,
            iconImageUrl: sub.iconUrl
          }
        })
      )

      set({ subreddits, isLoading: false })
    } catch (error) {
      console.error('Error fetching subreddits:', error)
      set({
        error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải danh sách subreddits',
        isLoading: false
      })
    }
  },

  fetchSubredditByName: async (name) => {
    try {
      set({ isLoading: true, error: null })

      const subredditData = await getSubredditCollection(name)

      if (subredditData) {
        const creatorName = await get().getUsernameFromId(subredditData.createdBy)
        const moderatorNames = await Promise.all(
          (subredditData.moderators || [subredditData.createdBy]).map(id => get().getUsernameFromId(id))
        )

        // Properly handle Firestore timestamp conversion
        const convertFirestoreDate = (date: any): Date => {
          if (!date) return new Date();
          if (date instanceof Date) return date;
          if (date.seconds) return new Date(date.seconds * 1000);
          return new Date(date);
        };

        const subreddit: Subreddit = {
          ...subredditData,
          id: subredditData.id || '',
          creatorId: subredditData.createdBy,
          creatorName,
          createdAt: convertFirestoreDate(subredditData.createdAt),
          updatedAt: convertFirestoreDate(subredditData.updatedAt || subredditData.createdAt),
          isPrivate: subredditData.isPrivate || false,
          rules: subredditData.rules || [],
          moderatorIds: subredditData.moderators || [subredditData.createdBy],
          moderatorNames,
          bannerImageUrl: subredditData.bannerUrl,
          iconImageUrl: subredditData.iconUrl
        }

        set({ currentSubreddit: subreddit, isLoading: false })
        return subreddit
      } else {
        set({ isLoading: false })
        return null
      }
    } catch (error) {
      console.error('Error fetching subreddit:', error)
      set({
        error: error instanceof Error ? error.message : `Đã xảy ra lỗi khi tìm subreddit ${name}`,
        isLoading: false
      })
      return null
    }
  },

  createSubreddit: async (subredditData) => {
    try {
      set({ isLoading: true, error: null })

      const user = useAuthStore.getState().user
      if (!user) {
        throw new Error('Bạn cần đăng nhập để tạo subreddit')
      }

      await createSubredditCollection({
        ...subredditData,
        createdBy: user.uid
      })

      // Refresh danh sách subreddits
      await get().fetchSubreddits()

      set({ isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tạo subreddit',
        isLoading: false
      })
    }
  },

  updateSubreddit: async (id, subredditData) => {
    try {
      set({ isLoading: true, error: null })

      const user = useAuthStore.getState().user
      if (!user) {
        throw new Error('Bạn cần đăng nhập để cập nhật subreddit')
      }

      // Kiểm tra quyền (chỉ creator hoặc moderator mới có thể cập nhật)
      const subreddit = get().subreddits.find(s => s.id === id)
      if (!subreddit) {
        throw new Error('Không tìm thấy subreddit')
      }

      if (subreddit.creatorId !== user.uid && !subreddit.moderatorIds.includes(user.uid)) {
        throw new Error('Bạn không có quyền cập nhật subreddit này')
      }

      await updateSubredditCollection(id, subredditData)

      // Refresh danh sách subreddits
      await get().fetchSubreddits()

      set({ isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi cập nhật subreddit',
        isLoading: false
      })
    }
  },

  deleteSubreddit: async (id) => {
    try {
      set({ isLoading: true, error: null })

      const user = useAuthStore.getState().user
      if (!user) {
        throw new Error('Bạn cần đăng nhập để xóa subreddit')
      }

      // Kiểm tra quyền (chỉ creator mới có thể xóa)
      const subreddit = get().subreddits.find(s => s.id === id)
      if (!subreddit) {
        throw new Error('Không tìm thấy subreddit')
      }

      if (subreddit.creatorId !== user.uid) {
        throw new Error('Chỉ người tạo mới có thể xóa subreddit')
      }

      await deleteSubredditCollection(id)

      // Refresh danh sách subreddits
      await get().fetchSubreddits()

      set({ isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi xóa subreddit',
        isLoading: false
      })
    }
  },

  joinSubreddit: async (subredditName) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        throw new Error('Bạn cần đăng nhập để tham gia subreddit')
      }

      await joinSubredditCollection(subredditName, user.uid)

      // Refresh current subreddit data
      if (get().currentSubreddit?.name === subredditName) {
        await get().fetchSubredditByName(subredditName)
      }

      // Refresh danh sách subreddits
      await get().fetchSubreddits()
    } catch (error) {
      console.error('Error joining subreddit:', error)
      set({
        error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tham gia subreddit'
      })
    }
  },

  leaveSubreddit: async (subredditName) => {
    try {
      const user = useAuthStore.getState().user
      if (!user) {
        throw new Error('Bạn cần đăng nhập để rời khỏi subreddit')
      }

      await leaveSubredditCollection(subredditName, user.uid)

      // Refresh current subreddit data
      if (get().currentSubreddit?.name === subredditName) {
        await get().fetchSubredditByName(subredditName)
      }

      // Refresh danh sách subreddits
      await get().fetchSubreddits()
    } catch (error) {
      console.error('Error leaving subreddit:', error)
      set({
        error: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi rời khỏi subreddit'
      })
    }
  },

  clearError: () => set({ error: null }),

  setCurrentSubreddit: (subreddit) => set({ currentSubreddit: subreddit })
})) 
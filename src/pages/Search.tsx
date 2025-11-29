import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { collection, query as firestoreQuery, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import PostCard from '../components/post/PostCard'
import PostSkeleton from '../components/post/PostSkeleton'
import type { Post, User } from '../types'

interface SearchResult {
  posts: Post[]
  communities: any[]
  users: User[]
  loading: boolean
  error: string | null
}

const Search = () => {
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''

  // Determine default tab based on search query
  const getDefaultTab = (query: string) => {
    if (query.startsWith('@')) {
      return 'users'
    }
    return 'posts'
  }

  const [activeTab, setActiveTab] = useState<'posts' | 'communities' | 'users' | 'comments'>(getDefaultTab(searchQuery))
  const [results, setResults] = useState<SearchResult>({
    posts: [],
    communities: [],
    users: [],
    loading: false,
    error: null
  })

  useEffect(() => {
    if (searchQuery.trim()) {
      // Update active tab based on search query
      const defaultTab = getDefaultTab(searchQuery.trim())
      setActiveTab(defaultTab)
      performSearch(searchQuery.trim())
    }
  }, [searchQuery])

  const performSearch = async (query: string) => {
    setResults(prev => ({ ...prev, loading: true, error: null }))

    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)

      // Check if this is a user search
      const isUserSearch = query.startsWith('@')
      const isUIDSearch = /^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(query.toUpperCase())

      // Search users
      const usersRef = collection(db, 'users')
      const usersSnapshot = await getDocs(usersRef)
      const users: User[] = []

      usersSnapshot.forEach(doc => {
        const data = doc.data()
        const user: User = {
          id: doc.id,
          displayName: data.displayName,
          email: data.email,
          username: data.username,
          atName: data.atName,
          customUID: data.customUID,
          region: data.region,
          regionCode: data.regionCode,
          onboardingCompleted: data.onboardingCompleted,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          karma: data.karma || 0,
          bio: data.bio,
          avatarUrl: data.avatarUrl,
          bannerUrl: data.bannerUrl,
          joinedSubreddits: data.joinedSubreddits || [],
          savedPosts: data.savedPosts || [],
          isAdmin: data.isAdmin || false,
          hideProfile: data.hideProfile || false,
          hidePosts: data.hidePosts || false,
          hideComments: data.hideComments || false,
          showLocation: data.showLocation || false,
          currentLocation: data.currentLocation,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined
        }

        let matchFound = false

        // Search by UID format (XXX-YYY-ZZZ)
        if (isUIDSearch && user.customUID) {
          if (user.customUID.toUpperCase() === query.toUpperCase()) {
            matchFound = true
          }
        }

        // Search by @name format
        if (isUserSearch) {
          const searchName = query.slice(1).toLowerCase() // Remove @ symbol
          if (user.atName && user.atName.toLowerCase() === searchName) {
            matchFound = true
          }
        }

        // General keyword search for users
        if (!isUserSearch && !isUIDSearch) {
          const usernameMatch = user.username && searchTerms.some(term =>
            user.username!.toLowerCase().includes(term)
          )
          const displayNameMatch = searchTerms.some(term =>
            user.displayName.toLowerCase().includes(term)
          )
          const atNameMatch = user.atName && searchTerms.some(term =>
            user.atName!.toLowerCase().includes(term)
          )
          const bioMatch = user.bio && searchTerms.some(term =>
            user.bio!.toLowerCase().includes(term)
          )

          if (usernameMatch || displayNameMatch || atNameMatch || bioMatch) {
            matchFound = true
          }
        }

        if (matchFound) {
          users.push(user)
        }
      })

      // Search posts - get all posts and filter on client side
      const postsRef = collection(db, 'posts')
      const postsQuery = firestoreQuery(postsRef, orderBy('createdAt', 'desc'), limit(100))
      const postsSnapshot = await getDocs(postsQuery)

      const allPosts: Post[] = []

      postsSnapshot.forEach(doc => {
        const data = doc.data()
        const post: Post = {
          id: doc.id,
          title: data.title,
          content: data.content,
          authorId: data.authorId,
          authorUsername: data.authorUsername,
          subreddit: data.subreddit,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
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

        // Filter posts that match search terms
        const titleMatch = searchTerms.some(term =>
          post.title.toLowerCase().includes(term)
        )
        const contentMatch = searchTerms.some(term =>
          post.content.toLowerCase().includes(term)
        )
        const subredditMatch = post.subreddit && searchTerms.some(term =>
          post.subreddit!.toLowerCase().includes(term)
        )
        const authorMatch = post.authorUsername && searchTerms.some(term =>
          post.authorUsername.toLowerCase().includes(term)
        )

        if (titleMatch || contentMatch || subredditMatch || authorMatch) {
          allPosts.push(post)
        }
      })

      // Sort by relevance (title matches first, then content matches)
      allPosts.sort((a, b) => {
        const aTitle = searchTerms.some(term => a.title.toLowerCase().includes(term))
        const bTitle = searchTerms.some(term => b.title.toLowerCase().includes(term))

        if (aTitle && !bTitle) return -1
        if (!aTitle && bTitle) return 1

        // If both or neither match title, sort by date
        return b.createdAt.getTime() - a.createdAt.getTime()
      })

      // Search communities
      const communitiesRef = collection(db, 'subreddits')
      const communitiesSnapshot = await getDocs(communitiesRef)
      const communities: any[] = []

      communitiesSnapshot.forEach(doc => {
        const data = doc.data()
        const nameMatch = searchTerms.some(term =>
          data.name.toLowerCase().includes(term)
        )
        const descMatch = searchTerms.some(term =>
          data.description.toLowerCase().includes(term)
        )

        if (nameMatch || descMatch) {
          communities.push({
            id: doc.id,
            ...data
          })
        }
      })

      setResults({
        posts: allPosts.slice(0, 50), // Limit to 50 results
        communities: communities.slice(0, 20), // Limit to 20 communities
        users: users.slice(0, 30), // Limit to 30 users
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Search error:', error)
      setResults(prev => ({
        ...prev,
        loading: false,
        error: 'Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại.'
      }))
    }
  }

  if (!searchQuery.trim()) {
    return (
      <div className="container search-container">
        <div className="search-empty">
          <h2>Tìm kiếm trên Reddit</h2>
          <p>Nhập từ khóa vào thanh tìm kiếm để bắt đầu</p>
          <div className="search-tips">
            <h4>Mẹo tìm kiếm:</h4>
            <ul>
              <li>Gõ <strong>@tên_người_dùng</strong> để tìm người dùng cụ thể</li>
              <li>Gõ <strong>XXX-YYY-ZZZ</strong> để tìm theo ID người dùng</li>
              <li>Gõ từ khóa thông thường để tìm bài viết, cộng đồng và người dùng</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container search-container">
      {/* Search Header */}
      <div className="search-header">
        <h1>Kết quả tìm kiếm cho "{searchQuery}"</h1>
        <div className="search-stats">
          {!results.loading && (
            <p>
              Tìm thấy {results.posts.length} bài viết, {results.communities.length} cộng đồng và {results.users.length} người dùng
            </p>
          )}
        </div>
      </div>

      {/* Search Tabs */}
      <div className="search-tabs">
        <button
          className={`search-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          Người dùng ({results.users.length})
        </button>
        <button
          className={`search-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
          </svg>
          Bài viết ({results.posts.length})
        </button>
        <button
          className={`search-tab ${activeTab === 'communities' ? 'active' : ''}`}
          onClick={() => setActiveTab('communities')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zM4 18v-4h3v4H4zm9-12c-2.69 0-5.77 1.28-6 2h4v10H7v-1.5H5.5V18H7v1H4V10.15C2.84 9.63 2 8.4 2 7c0-1.66 1.34-3 3-3s3 1.34 3 3c0 1.06-.57 1.98-1.42 2.48L8 8h3.5V6H13v12h-2V6z" />
          </svg>
          Cộng đồng ({results.communities.length})
        </button>
        <button
          className={`search-tab ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
          Bình luận (0)
        </button>
      </div>

      {/* Search Results */}
      <div className="search-results">
        {results.loading ? (
          <div className="search-loading">
            {Array.from({ length: 5 }).map((_, index) => (
              <PostSkeleton key={index} />
            ))}
          </div>
        ) : results.error ? (
          <div className="error-message">
            {results.error}
          </div>
        ) : (
          <>
            {activeTab === 'users' && (
              <div className="search-users">
                {results.users.length === 0 ? (
                  <div className="search-no-results">
                    <h3>Không tìm thấy người dùng nào</h3>
                    <p>Thử tìm kiếm với từ khóa khác hoặc sử dụng format @tên_người_dùng</p>
                  </div>
                ) : (
                  <div className="users-list">
                    {results.users.map((user) => (
                      <div key={user.id} className="user-item">
                        <div className="user-avatar">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.displayName} />
                          ) : (
                            <div className="user-avatar-placeholder">
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="user-info">
                          <div className="user-names">
                            <Link to={`/u/${user.id}`} className="user-display-name">
                              {user.displayName}
                            </Link>
                            {user.username && (
                              <span className="user-username">u/{user.username}</span>
                            )}
                            {user.atName && (
                              <span className="user-at-name">@{user.atName}</span>
                            )}
                          </div>
                          {user.customUID && (
                            <div className="user-uid">
                              ID: {user.customUID}
                            </div>
                          )}
                          {user.bio && (
                            <p className="user-bio">{user.bio}</p>
                          )}
                          <div className="user-meta">
                            <span className="user-karma">{user.karma} karma</span>
                            {user.region && (
                              <span className="user-region">• {user.region}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="search-posts">
                {results.posts.length === 0 ? (
                  <div className="search-no-results">
                    <h3>Không tìm thấy bài viết nào</h3>
                    <p>Thử tìm kiếm với từ khóa khác</p>
                  </div>
                ) : (
                  <div className="posts-list">
                    {results.posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={{
                          id: post.id,
                          title: post.title,
                          body: post.content,
                          contentType: post.contentType || 'html',
                          author: {
                            uid: post.authorId,
                            displayName: post.authorUsername,
                            photoURL: undefined
                          },
                          community: post.subreddit ? {
                            name: post.subreddit,
                            displayName: post.subreddit
                          } : undefined,
                          imageUrls: post.imageUrls,
                          attachments: post.attachments,
                          createdAt: post.createdAt,
                          upvotes: post.upvotes || 0,
                          downvotes: post.downvotes || 0,
                          commentCount: post.commentCount || 0,
                          type: post.imageUrls && post.imageUrls.length > 0 ? 'image' : 'text'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'communities' && (
              <div className="search-communities">
                {results.communities.length === 0 ? (
                  <div className="search-no-results">
                    <h3>Không tìm thấy cộng đồng nào</h3>
                    <p>Thử tìm kiếm với từ khóa khác</p>
                  </div>
                ) : (
                  <div className="communities-list">
                    {results.communities.map((community) => (
                      <div key={community.id} className="community-item">
                        <div className="community-icon">
                          {community.iconImageUrl ? (
                            <img src={community.iconImageUrl} alt={community.name} />
                          ) : (
                            <div className="community-icon-placeholder">
                              {community.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="community-info">
                          <Link to={`/r/${community.name}`} className="community-name">
                            r/{community.name}
                          </Link>
                          <p className="community-description">{community.description}</p>
                          <div className="community-meta">
                            {community.memberCount || 0} thành viên
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="search-comments">
                <div className="search-no-results">
                  <h3>Tìm kiếm bình luận</h3>
                  <p>Tính năng này sẽ được thêm vào trong tương lai</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Search 
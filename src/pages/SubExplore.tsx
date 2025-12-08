import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSubredditsStore, useAuthStore } from '../store'
import { useLanguageStore } from '../store/useLanguageStore'
import './SubExplore.css'

const SubExplore = () => {
  const [activeTab, setActiveTab] = useState<'popular' | 'new' | 'trending'>('popular')
  const { subreddits, fetchSubreddits, isLoading, error } = useSubredditsStore()
  const { user } = useAuthStore()
  const { t } = useLanguageStore()

  useEffect(() => {
    fetchSubreddits()
  }, [])

  // Lọc và sắp xếp các subreddit theo tab đang chọn
  const filteredSubreddits = [...subreddits].sort((a, b) => {
    if (activeTab === 'popular') {
      return (b.memberCount || 0) - (a.memberCount || 0)
    } else if (activeTab === 'new') {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date((a.createdAt as any)?.seconds * 1000 || Date.now())
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date((b.createdAt as any)?.seconds * 1000 || Date.now())
      return dateB.getTime() - dateA.getTime()
    } else {
      // Trending - ưu tiên các subreddit có tốc độ tăng trưởng thành viên cao
      // Giả lập bằng cách lấy ngẫu nhiên
      return Math.random() - 0.5
    }
  })

  const isUserJoined = (subreddit: any) => {
    if (!user) return false
    // Check both members array and createdBy field
    return subreddit.members?.includes(user.uid) || subreddit.createdBy === user.uid
  }

  const handleJoinSubreddit = async (subredditName: string, isJoined: boolean) => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login'
      return
    }

    try {
      if (isJoined) {
        await useSubredditsStore.getState().leaveSubreddit(subredditName)
      } else {
        await useSubredditsStore.getState().joinSubreddit(subredditName)
      }

      // Force refresh subreddits list to get updated membership status
      await fetchSubreddits()
    } catch (error) {
      console.error('Error joining/leaving subreddit:', error)
      alert(error instanceof Error ? error.message : 'Có lỗi xảy ra')
    }
  }

  const formatDate = (date: any) => {
    if (!date) return 'Unknown date'

    const d = date instanceof Date ? date : new Date(date.seconds * 1000)
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="subexplore-container">
      <div className="subexplore-header">
        <h1 className="subexplore-title">{t('exploreTitle')}</h1>
        <p className="subexplore-description">
          {t('exploreDesc')}
        </p>
      </div>

      <div className="subexplore-tabs">
        <button
          className={`subexplore-tab ${activeTab === 'popular' ? 'active' : ''}`}
          onClick={() => setActiveTab('popular')}
        >
          {t('popular')}
        </button>
        <button
          className={`subexplore-tab ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          {t('newest')}
        </button>
        <button
          className={`subexplore-tab ${activeTab === 'trending' ? 'active' : ''}`}
          onClick={() => setActiveTab('trending')}
        >
          {t('trending')}
        </button>
      </div>

      {isLoading ? (
        <div className="subexplore-loading">
          <div className="subexplore-loading-spinner"></div>
          <p>{t('loadingCommunities')}</p>
        </div>
      ) : error ? (
        <div className="subexplore-error">
          <p>{error}</p>
          <button onClick={() => fetchSubreddits()} className="subexplore-retry-button">
            {t('retry')}
          </button>
        </div>
      ) : (
        <div className="subreddit-grid">
          {filteredSubreddits.map((subreddit) => {
            const isJoined = isUserJoined(subreddit)
            const isOwner = user && subreddit.createdBy === user.uid

            return (
              <div key={subreddit.id} className="subreddit-card">
                <div className="subreddit-card-header">
                  <div className="subreddit-icon">
                    {subreddit.iconUrl ? (
                      <img src={subreddit.iconUrl} alt={subreddit.name} style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }} />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#FF4500',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: 'white'
                      }}>
                        {subreddit.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="subreddit-info">
                    <Link to={`/r/${subreddit.name}`} className="subreddit-name">
                      r/{subreddit.name}
                    </Link>
                    <span className="subreddit-members">
                      {subreddit.memberCount || 0} {t('members')}
                    </span>
                  </div>
                  {isOwner ? (
                    <div className="subreddit-owner-badge">
                      {t('owner')}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoinSubreddit(subreddit.name, isJoined)}
                      className={`subreddit-join-button ${isJoined ? 'joined' : ''}`}
                    >
                      {isJoined ? t('joined') : t('join')}
                    </button>
                  )}
                </div>

                <div className="subreddit-description">
                  {subreddit.description || t('noDescription')}
                </div>

                <div className="subreddit-footer">
                  <span className="subreddit-created">
                    {t('createdDate')}: {formatDate(subreddit.createdAt)}
                  </span>
                </div>
              </div>
            )
          })}

          {filteredSubreddits.length === 0 && (
            <div className="no-subreddits">
              <p>{t('noCommunitiesFound')}</p>
              <Link to="/create-community" className="create-community-link">
                {t('createCommunity')}
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="subexplore-create-banner">
        <div className="create-banner-content">
          <h2>{t('createBannerTitle')}</h2>
          <p>{t('createBannerDesc')}</p>
          <Link to="/create-community" className="create-community-button">
            {t('createCommunityBtn')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SubExplore 
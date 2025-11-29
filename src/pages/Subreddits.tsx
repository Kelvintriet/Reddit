import { useState, useEffect } from 'react'
import { useSubredditsStore, useAuthStore } from '../store'
import SubredditCard from '../components/subreddit/SubredditCard'
import CreateSubredditForm from '../components/subreddit/CreateSubredditForm'
import { Search, Plus, Users } from 'lucide-react'

const Subreddits = () => {
  const { subreddits, fetchSubreddits, isLoading, error, joinSubreddit, leaveSubreddit } = useSubredditsStore()
  const { user } = useAuthStore()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSubreddits()
  }, [])

  const filteredSubreddits = subreddits.filter(
    (subreddit) => subreddit.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleJoin = (id: string) => {
    if (!user) return
    joinSubreddit(id)
  }

  const handleLeave = (id: string) => {
    if (!user) return
    leaveSubreddit(id)
  }

  return (
    <div className="subreddits-page">
      <div className="page-header mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Communities</h1>
          {user && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="reddit-btn reddit-btn-filled flex items-center gap-2"
            >
              {showCreateForm ? (
                'Cancel'
              ) : (
                <>
                  <Plus size={16} />
                  Create Community
                </>
              )}
            </button>
          )}
        </div>

        <div className="search-bar-container relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="reddit-input pl-10 w-full"
          />
        </div>

        {showCreateForm && (
          <div className="mt-6 bg-card rounded-lg shadow-sm p-6 border border-border">
            <CreateSubredditForm
              onSuccess={() => {
                setShowCreateForm(false)
                fetchSubreddits()
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="error-message mb-6">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="loading-spinner"></div>
        </div>
      ) : filteredSubreddits.length === 0 ? (
        <div className="empty-state bg-neutral-background-weak rounded-lg p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-background-strong mb-4">
            <Users size={32} className="text-neutral-content-weak" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No communities found</h3>
          <p className="text-neutral-content-weak mb-6">
            {searchTerm
              ? `No communities matching "${searchTerm}"`
              : 'Be the first to create a community!'}
          </p>
          {user && !showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="reddit-btn reddit-btn-outline"
            >
              Create Community
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubreddits.map((subreddit) => (
            <SubredditCard
              key={subreddit.id}
              subreddit={subreddit}
              onJoin={() => handleJoin(subreddit.id)}
              onLeave={() => handleLeave(subreddit.id)}
              isUserMember={false} // TODO: Implement membership checking
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Subreddits 
import { useState, useEffect } from 'react'
import { useSubredditsStore, useAuthStore } from '../store'
import SubredditCard from '../components/subreddit/SubredditCard'
import CreateSubredditForm from '../components/subreddit/CreateSubredditForm'

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Cộng đồng</h1>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder=""
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-80 px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
          </div>
          
          {user && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition"
            >
              {showCreateForm ? 'Hủy' : 'Tạo cộng đồng mới'}
            </button>
          )}
        </div>
        
        {showCreateForm && (
          <div className="mb-6">
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
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredSubreddits.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-gray-700 p-8 rounded-lg text-center">
          <h3 className="text-xl font-semibold mb-2">Không tìm thấy cộng đồng nào</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm 
              ? `Không tìm thấy cộng đồng phù hợp với "${searchTerm}"`
              : 'Chưa có cộng đồng nào được tạo. Hãy là người đầu tiên tạo cộng đồng!'}
          </p>
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
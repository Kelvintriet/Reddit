import { Link } from 'react-router-dom'
import { type Subreddit } from '../../store/useSubredditsStore'

interface SubredditCardProps {
  subreddit: Subreddit
  onJoin?: () => void
  onLeave?: () => void
  isUserMember?: boolean
}

const SubredditCard = ({ subreddit, onJoin, onLeave, isUserMember = false }: SubredditCardProps) => {
  const { name, description, memberCount, createdAt } = subreddit

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <Link to={`/r/${name}`} className="flex-1">
          <h3 className="text-lg font-medium hover:text-blue-500">r/{name}</h3>
        </Link>

        {(onJoin || onLeave) && (
          <button
            onClick={isUserMember ? onLeave : onJoin}
            className={`px-3 py-1 rounded-full text-sm ${isUserMember
                ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
          >
            {isUserMember ? 'Đã tham gia' : 'Tham gia'}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {memberCount} thành viên • Tạo ngày {createdAt instanceof Date ? createdAt.toLocaleDateString() : typeof createdAt === 'object' && createdAt && 'toDate' in createdAt ? (createdAt as any).toDate().toLocaleDateString() : new Date(createdAt as any).toLocaleDateString()}
      </p>

      <p className="text-gray-700 dark:text-gray-300 mt-3 line-clamp-2">
        {description}
      </p>
    </div>
  )
}

export default SubredditCard 
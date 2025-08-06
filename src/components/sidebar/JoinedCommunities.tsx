import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore, useSubredditsStore } from '../../store';
import { ChevronDown, ChevronUp } from 'lucide-react';

const JoinedCommunities: React.FC = () => {
  const { user } = useAuthStore();
  const { subreddits, fetchSubreddits } = useSubredditsStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [joinedSubreddits, setJoinedSubreddits] = useState<any[]>([]);
  const location = useLocation();
  const currentSubreddit = location.pathname.split('/')[2];

  useEffect(() => {
    if (user) {
      fetchSubreddits();
    }
  }, [user, fetchSubreddits]);

  useEffect(() => {
    if (user && subreddits.length > 0) {
      // Filter subreddits that the user has joined
      const joined = subreddits.filter(subreddit => 
        subreddit.members?.includes(user.uid) || subreddit.createdBy === user.uid
      );
      setJoinedSubreddits(joined);
    }
  }, [user, subreddits]);

  if (!user || joinedSubreddits.length === 0) {
    return null;
  }

  return (
    <div className="sidebar-section">
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: 'var(--space-md)',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3>MY COMMUNITIES</h3>
        {isExpanded ? (
          <ChevronUp size={16} style={{ color: 'var(--color-neutral-content-weak)' }} />
        ) : (
          <ChevronDown size={16} style={{ color: 'var(--color-neutral-content-weak)' }} />
        )}
      </div>
      
      {isExpanded && (
        <ul className="nav-list">
          {joinedSubreddits.slice(0, 10).map((subreddit) => (
            <li key={subreddit.id} className="nav-item">
              <Link 
                to={`/r/${subreddit.name}`} 
                className={`nav-link ${currentSubreddit === subreddit.name ? 'active' : ''}`}
              >
                <div className="subreddit-icon-small">
                  {subreddit.iconUrl ? (
                    <img
                      src={subreddit.iconUrl}
                      alt={subreddit.name}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#FF4500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: 'white'
                    }}>
                      {subreddit.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {subreddit.name}
                </span>
                {subreddit.createdBy === user.uid && (
                  <span style={{
                    fontSize: '10px',
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                    padding: '2px 4px',
                    borderRadius: '8px',
                    marginLeft: 'auto',
                    flexShrink: 0
                  }}>
                    OWNER
                  </span>
                )}
              </Link>
            </li>
          ))}
          
          {joinedSubreddits.length > 10 && (
            <li className="nav-item">
              <Link to="/subreddits" className="nav-link" style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
                View all ({joinedSubreddits.length})
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default JoinedCommunities;

import React from 'react'

const PostSkeleton: React.FC = () => {
  return (
    <div className="post-card">
      {/* Vote sidebar skeleton */}
      <div className="post-vote">
        <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
        <div className="skeleton" style={{ width: '16px', height: '20px', margin: '8px 0' }}></div>
        <div className="skeleton" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
      </div>
      
      {/* Post content skeleton */}
      <div className="post-content">
        {/* Metadata skeleton */}
        <div className="post-meta">
          <div className="skeleton" style={{ width: '100px', height: '16px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '150px', height: '16px', borderRadius: '4px', marginLeft: '16px' }}></div>
        </div>
        
        {/* Title skeleton */}
        <div className="skeleton" style={{ width: '85%', height: '24px', marginBottom: '12px', borderRadius: '4px' }}></div>
        
        {/* Content skeleton */}
        <div className="post-body">
          <div className="skeleton" style={{ width: '100%', height: '16px', marginBottom: '8px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '95%', height: '16px', marginBottom: '8px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '90%', height: '16px', marginBottom: '16px', borderRadius: '4px' }}></div>
        </div>
        
        {/* Image skeleton (random chance of showing) */}
        {Math.random() > 0.5 && (
          <div className="skeleton" style={{ width: '100%', height: '200px', marginBottom: '16px', borderRadius: '4px' }}></div>
        )}
        
        {/* Actions skeleton */}
        <div className="post-actions">
          <div className="skeleton" style={{ width: '100px', height: '24px', marginRight: '12px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '80px', height: '24px', marginRight: '12px', borderRadius: '4px' }}></div>
          <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: '4px' }}></div>
        </div>
      </div>
    </div>
  )
}

export default PostSkeleton 
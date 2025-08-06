import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../../collections/users';

interface UserAvatarProps {
  userId: string;
  username: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  userId, 
  username, 
  size = 'small',
  className = '' 
}) => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await getUserProfile(userId);
        setUserProfile(profile);
      } catch (error) {
        // Silent fail
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  const sizeClasses = {
    small: 'user-avatar-small',
    medium: 'user-avatar-medium', 
    large: 'user-avatar-large'
  };

  const avatarClass = `user-avatar ${sizeClasses[size]} ${className}`;

  if (isLoading) {
    return (
      <div className={`${avatarClass} user-avatar-loading`}></div>
    );
  }

  // Prioritize Appwrite avatarUrl over Google photoURL
  const avatarSrc = userProfile?.avatarUrl || userProfile?.photoURL;

  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={username}
        className={avatarClass}
      />
    );
  }

  // Fallback to initial letter
  const initial = (userProfile?.displayName || userProfile?.username || username || 'U').charAt(0).toUpperCase();

  return (
    <div className={`${avatarClass} user-avatar-placeholder`}>
      {initial}
    </div>
  );
};

export default UserAvatar; 
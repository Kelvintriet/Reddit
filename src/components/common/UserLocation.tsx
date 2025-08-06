import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../../collections/users';
import { getCurrentLocation, getCountryFlag } from '../../services/location';

interface UserLocationProps {
  userId: string;
  className?: string;
}

const UserLocation: React.FC<UserLocationProps> = ({ userId, className = '' }) => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch user profile to check location settings
        const profile = await getUserProfile(userId);
        setUserProfile(profile);

        // If user has location enabled, get current location
        if (profile?.showLocation !== false) { // Default to true if not set
          const location = await getCurrentLocation();
          setCurrentLocation(location);
        }
      } catch (error) {
        // Silent fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // Don't show anything if loading or user disabled location
  if (isLoading || !currentLocation || userProfile?.showLocation === false) {
    return null;
  }

  const flag = getCountryFlag(currentLocation.countryCode);

  return (
    <span className={`inline-flex items-center gap-1 text-sm text-gray-500 ${className}`}>
      <span>{flag}</span>
      <span>{currentLocation.country}</span>
    </span>
  );
};

export default UserLocation; 
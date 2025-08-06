interface LocationData {
  ip: string;
  success: boolean;
  type: string;
  continent: string;
  continent_code: string;
  country: string;
  country_code: string;
  country_flag: string;
  country_capital: string;
  country_phone: string;
  country_neighbours: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  asn: string;
  org: string;
  isp: string;
  timezone: string;
  timezone_name: string;
  timezone_dstOffset: number;
  timezone_gmtOffset: number;
  timezone_gmt: string;
  currency: string;
  currency_code: string;
  currency_symbol: string;
  currency_rates: number;
  currency_plural: string;
}

interface LocationCache {
  data: LocationData | null;
  lastRefreshDate: string; // YYYY-MM-DD format
  refreshCount: number;
  lastAutoRefreshDate: string; // Track auto-refresh separately
}

const DAILY_REFRESH_LIMIT = 15;
const STORAGE_KEY = 'reddit_location_cache';

let locationCache: LocationCache = {
  data: null,
  lastRefreshDate: '',
  refreshCount: 0,
  lastAutoRefreshDate: ''
};

// Load cache from localStorage
const loadLocationCache = (): LocationCache => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        data: parsed.data || null,
        lastRefreshDate: parsed.lastRefreshDate || '',
        refreshCount: parsed.refreshCount || 0,
        lastAutoRefreshDate: parsed.lastAutoRefreshDate || ''
      };
    }
  } catch (error) {
    // Silent fail
  }
  return { data: null, lastRefreshDate: '', refreshCount: 0, lastAutoRefreshDate: '' };
};

// Save cache to localStorage
const saveLocationCache = (cache: LocationCache) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    // Silent fail
  }
};

// Initialize cache
locationCache = loadLocationCache();

// Get today's date string
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Check if user can refresh location
export const canRefreshLocation = (): boolean => {
  const today = getTodayString();
  
  // Reset count if it's a new day
  if (locationCache.lastRefreshDate !== today) {
    locationCache.refreshCount = 0;
    locationCache.lastRefreshDate = today;
    saveLocationCache(locationCache);
  }
  
  return locationCache.refreshCount < DAILY_REFRESH_LIMIT;
};

// Get remaining refresh count
export const getRemainingRefreshCount = (): number => {
  const today = getTodayString();
  
  // Reset count if it's a new day
  if (locationCache.lastRefreshDate !== today) {
    return DAILY_REFRESH_LIMIT;
  }
  
  return Math.max(0, DAILY_REFRESH_LIMIT - locationCache.refreshCount);
};

// Get cached location without fetching new data
export const getCachedLocation = (): LocationData | null => {
  return locationCache.data;
};

// Refresh location data (with limit check)
export const refreshLocationData = async (): Promise<LocationData | null> => {
  if (!canRefreshLocation()) {
    throw new Error(`Bạn đã hết lượt refresh hôm nay. Còn lại: ${getRemainingRefreshCount()}/15`);
  }

  try {
    // Use ipwhois.app API
    const response = await fetch('https://ipwhois.app/json/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch location');
    }

    const data: LocationData = await response.json();
    
    if (data.success && data.country) {
      // Update cache
      const today = getTodayString();
      locationCache = {
        data: data,
        lastRefreshDate: today,
        refreshCount: locationCache.lastRefreshDate === today ? locationCache.refreshCount + 1 : 1,
        lastAutoRefreshDate: today
      };
      saveLocationCache(locationCache);
      
      return data;
    } else {
      throw new Error('Location service returned invalid data');
    }
  } catch (error) {
    console.error('Location API error:', error);
    throw error;
  }
};

// Legacy function for backward compatibility (now uses cache only)
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  return getCachedLocation();
};

// Auto-fetch location if cache is empty (for first time users)
export const getLocationWithAutoFetch = async (): Promise<LocationData | null> => {
  const cached = getCachedLocation();
  
  // Check if we need daily auto-refresh
  if (needsAutoRefresh()) {
    console.log('🔄 Daily auto-refresh location...');
    const autoRefreshResult = await performAutoRefresh();
    if (autoRefreshResult) {
      return autoRefreshResult;
    }
    // If auto-refresh failed, continue with existing logic
  }
  
  // If we have cached data, return it
  if (cached) {
    return cached;
  }
  
  // If no cached data and user can refresh, auto-fetch once
  if (canRefreshLocation()) {
    try {
      const result = await refreshLocationData();
      return result;
    } catch (error) {
      console.error('Auto-fetch failed:', error);
      // Silent fail on auto-fetch
      return null;
    }
  }
  
  return null;
};

export const clearLocationCache = () => {
  locationCache = { data: null, lastRefreshDate: '', refreshCount: 0, lastAutoRefreshDate: '' };
  localStorage.removeItem(STORAGE_KEY);
};

// Get current time for user's timezone
export const getCurrentTimeForLocation = (location: LocationData): string => {
  if (!location.timezone_gmtOffset) return '';
  
  // timezone_gmtOffset is in seconds, convert to milliseconds
  const offsetMs = location.timezone_gmtOffset * 1000;
  
  // Create current time with user's timezone offset
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const userTime = new Date(utc + offsetMs);
  
  return userTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Get country flag emoji
export const getCountryFlag = (countryCode: string): string => {
  const countryFlags: { [key: string]: string } = {
    'VN': '🇻🇳', 'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷',
    'JP': '🇯🇵', 'KR': '🇰🇷', 'CN': '🇨🇳', 'IN': '🇮🇳', 'BR': '🇧🇷',
    'CA': '🇨🇦', 'AU': '🇦🇺', 'RU': '🇷🇺', 'IT': '🇮🇹', 'ES': '🇪🇸',
    'NL': '🇳🇱', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮',
    'CH': '🇨🇭', 'AT': '🇦🇹', 'BE': '🇧🇪', 'IE': '🇮🇪', 'PT': '🇵🇹',
    'GR': '🇬🇷', 'PL': '🇵🇱', 'CZ': '🇨🇿', 'HU': '🇭🇺', 'RO': '🇷🇴',
    'BG': '🇧🇬', 'HR': '🇭🇷', 'SI': '🇸🇮', 'SK': '🇸🇰', 'LT': '🇱🇹',
    'LV': '🇱🇻', 'EE': '🇪🇪', 'MT': '🇲🇹', 'CY': '🇨🇾', 'LU': '🇱🇺',
    'MX': '🇲🇽', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪',
    'VE': '🇻🇪', 'UY': '🇺🇾', 'PY': '🇵🇾', 'BO': '🇧🇴', 'EC': '🇪🇨',
    'TH': '🇹🇭', 'MY': '🇲🇾', 'SG': '🇸🇬', 'ID': '🇮🇩', 'PH': '🇵🇭',
    'TW': '🇹🇼', 'HK': '🇭🇰', 'MO': '🇲🇴', 'BD': '🇧🇩', 'PK': '🇵🇰',
    'LK': '🇱🇰', 'NP': '🇳🇵', 'MM': '🇲🇲', 'KH': '🇰🇭', 'LA': '🇱🇦',
    'BN': '🇧🇳', 'MN': '🇲🇳', 'KZ': '🇰🇿', 'UZ': '🇺🇿', 'KG': '🇰🇬',
    'TJ': '🇹🇯', 'TM': '🇹🇲', 'AF': '🇦🇫', 'IR': '🇮🇷', 'IQ': '🇮🇶',
    'TR': '🇹🇷', 'SY': '🇸🇾', 'LB': '🇱🇧', 'JO': '🇯🇴', 'IL': '🇮🇱',
    'PS': '🇵🇸', 'SA': '🇸🇦', 'AE': '🇦🇪', 'QA': '🇶🇦', 'KW': '🇰🇼',
    'BH': '🇧🇭', 'OM': '🇴🇲', 'YE': '🇾🇪', 'EG': '🇪🇬', 'LY': '🇱🇾',
    'TN': '🇹🇳', 'DZ': '🇩🇿', 'MA': '🇲🇦', 'SD': '🇸🇩', 'SS': '🇸🇸',
    'ET': '🇪🇹', 'ER': '🇪🇷', 'DJ': '🇩🇯', 'SO': '🇸🇴', 'KE': '🇰🇪',
    'UG': '🇺🇬', 'TZ': '🇹🇿', 'RW': '🇷🇼', 'BI': '🇧🇮', 'MG': '🇲🇬',
    'MU': '🇲🇺', 'SC': '🇸🇨', 'KM': '🇰🇲', 'MZ': '🇲🇿', 'ZW': '🇿🇼',
    'ZM': '🇿🇲', 'MW': '🇲🇼', 'BW': '🇧🇼', 'NA': '🇳🇦', 'ZA': '🇿🇦',
    'LS': '🇱🇸', 'SZ': '🇸🇿', 'AO': '🇦🇴', 'CD': '🇨🇩', 'CG': '🇨🇬',
    'CF': '🇨🇫', 'TD': '🇹🇩', 'CM': '🇨🇲', 'GQ': '🇬🇶', 'GA': '🇬🇦',
    'ST': '🇸🇹', 'GH': '🇬🇭', 'TG': '🇹🇬', 'BJ': '🇧🇯', 'NE': '🇳🇪',
    'BF': '🇧🇫', 'ML': '🇲🇱', 'SN': '🇸🇳', 'GM': '🇬🇲', 'GW': '🇬🇼',
    'GN': '🇬🇳', 'SL': '🇸🇱', 'LR': '🇱🇷', 'CI': '🇨🇮', 'NZ': '🇳🇿'
  };
  
  return countryFlags[countryCode] || '🌍';
};

// Check if we need auto-refresh today
export const needsAutoRefresh = (): boolean => {
  const today = getTodayString();
  return locationCache.lastAutoRefreshDate !== today;
};

// Perform auto-refresh (doesn't count towards manual limit)
const performAutoRefresh = async (): Promise<LocationData | null> => {
  try {
    // Use ipwhois.app API
    const response = await fetch('https://ipwhois.app/json/');
    
    if (!response.ok) {
      throw new Error('Failed to fetch location');
    }

    const data: LocationData = await response.json();
    
    if (data.success && data.country) {
      // Update cache with auto-refresh (don't increment manual refresh count)
      const today = getTodayString();
      locationCache = {
        data: data,
        lastRefreshDate: locationCache.lastRefreshDate,
        refreshCount: locationCache.refreshCount,
        lastAutoRefreshDate: today
      };
      saveLocationCache(locationCache);
      
      console.log('✅ Auto-refresh completed:', data.country);
      return data;
    } else {
      throw new Error('Location service returned invalid data');
    }
  } catch (error) {
    console.error('❌ Auto-refresh failed:', error);
    // Silent fail on auto-refresh
    return null;
  }
}; 
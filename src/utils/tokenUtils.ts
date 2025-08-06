// Token generation utilities

// Generate a cryptographically secure random token
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Use crypto.getRandomValues if available (browser)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
};

// Generate a bot token with specific format: bot_[subreddit]_[random]
export const generateBotToken = (subredditName: string): string => {
  const prefix = 'bot';
  const subreddit = subredditName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = generateSecureToken(32);
  
  return `${prefix}_${subreddit}_${random}`;
};

// Validate token format
export const validateTokenFormat = (token: string): boolean => {
  // Bot tokens should be at least 40 characters and contain only alphanumeric characters and underscores
  return /^[a-zA-Z0-9_]{40,}$/.test(token);
};

// Extract subreddit name from bot token
export const extractSubredditFromToken = (token: string): string | null => {
  const parts = token.split('_');
  if (parts.length >= 3 && parts[0] === 'bot') {
    return parts[1];
  }
  return null;
};

// Generate API key for external integrations
export const generateAPIKey = (): string => {
  return 'rdt_' + generateSecureToken(48);
};

// Hash token for storage (one-way hash)
export const hashToken = async (token: string): Promise<string> => {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Simple fallback hash (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
};

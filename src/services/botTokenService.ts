// Bot Token Management Service
// Handles bot authentication, permissions, and API communication

import { generateSecureToken } from '../utils/tokenUtils';

export interface BotToken {
  id: string;
  botId: string;
  botName: string;
  subredditId: string;
  subredditName: string;
  token: string;
  permissions: BotPermission[];
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

export interface BotPermission {
  action: string;
  scope: 'subreddit' | 'user' | 'post' | 'comment';
  level: 'read' | 'write' | 'admin';
}

export interface BotAPIRequest {
  token: string;
  action: string;
  target?: string;
  data?: any;
  timestamp: number;
}

export interface BotAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

// Default bot permissions for different roles
const DEFAULT_PERMISSIONS = {
  moderator: [
    { action: 'remove_post', scope: 'subreddit', level: 'admin' },
    { action: 'remove_comment', scope: 'subreddit', level: 'admin' },
    { action: 'ban_user', scope: 'subreddit', level: 'admin' },
    { action: 'assign_flair', scope: 'subreddit', level: 'write' },
    { action: 'send_message', scope: 'user', level: 'write' },
    { action: 'pin_post', scope: 'subreddit', level: 'admin' },
    { action: 'lock_post', scope: 'subreddit', level: 'admin' },
    { action: 'approve_post', scope: 'subreddit', level: 'admin' },
    { action: 'view_reports', scope: 'subreddit', level: 'read' },
    { action: 'view_modlog', scope: 'subreddit', level: 'read' }
  ] as BotPermission[],
  
  assistant: [
    { action: 'send_message', scope: 'user', level: 'write' },
    { action: 'assign_flair', scope: 'subreddit', level: 'write' },
    { action: 'view_posts', scope: 'subreddit', level: 'read' },
    { action: 'view_comments', scope: 'subreddit', level: 'read' }
  ] as BotPermission[],
  
  analytics: [
    { action: 'view_posts', scope: 'subreddit', level: 'read' },
    { action: 'view_comments', scope: 'subreddit', level: 'read' },
    { action: 'view_users', scope: 'subreddit', level: 'read' },
    { action: 'view_stats', scope: 'subreddit', level: 'read' }
  ] as BotPermission[]
};

// In-memory storage (in production, use database)
let botTokens: BotToken[] = [];
let tokenUsage: Map<string, { count: number; lastReset: number }> = new Map();

// Generate a new bot token
export const generateBotToken = async (
  botId: string,
  botName: string,
  subredditId: string,
  subredditName: string,
  role: 'moderator' | 'assistant' | 'analytics' = 'assistant'
): Promise<BotToken> => {
  const token = generateSecureToken(64); // 64-character secure token
  
  const botToken: BotToken = {
    id: generateSecureToken(16),
    botId,
    botName: `Bot-${subredditName}-${botName}`,
    subredditId,
    subredditName,
    token,
    permissions: DEFAULT_PERMISSIONS[role],
    isActive: true,
    createdAt: new Date(),
    usageCount: 0,
    rateLimit: {
      requestsPerMinute: role === 'moderator' ? 60 : 30,
      requestsPerHour: role === 'moderator' ? 1000 : 500,
      requestsPerDay: role === 'moderator' ? 10000 : 5000
    }
  };

  botTokens.push(botToken);
  return botToken;
};

// Validate bot token and check permissions
export const validateBotToken = async (
  token: string,
  action: string,
  scope: string
): Promise<{ valid: boolean; botToken?: BotToken; error?: string }> => {
  const botToken = botTokens.find(bt => bt.token === token && bt.isActive);
  
  if (!botToken) {
    return { valid: false, error: 'Invalid or inactive bot token' };
  }

  // Check rate limits
  const rateLimitCheck = checkRateLimit(token, botToken.rateLimit);
  if (!rateLimitCheck.allowed) {
    return { valid: false, error: `Rate limit exceeded: ${rateLimitCheck.error}` };
  }

  // Check permissions
  const hasPermission = botToken.permissions.some(perm => 
    perm.action === action && 
    (perm.scope === scope || perm.scope === 'subreddit') &&
    (perm.level === 'admin' || perm.level === 'write' || action.startsWith('view_'))
  );

  if (!hasPermission) {
    return { valid: false, error: `Insufficient permissions for action: ${action}` };
  }

  // Update usage
  botToken.usageCount++;
  botToken.lastUsed = new Date();

  return { valid: true, botToken };
};

// Check rate limits
const checkRateLimit = (token: string, limits: BotToken['rateLimit']): { allowed: boolean; error?: string } => {
  const now = Date.now();
  const usage = tokenUsage.get(token) || { count: 0, lastReset: now };

  // Reset counter if it's been more than a minute
  if (now - usage.lastReset > 60000) {
    usage.count = 0;
    usage.lastReset = now;
  }

  // Check minute limit
  if (usage.count >= limits.requestsPerMinute) {
    return { allowed: false, error: 'Rate limit exceeded: too many requests per minute' };
  }

  usage.count++;
  tokenUsage.set(token, usage);
  return { allowed: true };
};

// Bot API endpoints
export const processBotAPIRequest = async (request: BotAPIRequest): Promise<BotAPIResponse> => {
  try {
    // Validate token and permissions
    const validation = await validateBotToken(request.token, request.action, 'subreddit');
    
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const botToken = validation.botToken!;

    // Process the action
    const result = await executeBotAction(request.action, request.target, request.data, botToken);

    return {
      success: true,
      data: result,
      rateLimit: {
        remaining: botToken.rateLimit.requestsPerMinute - (tokenUsage.get(request.token)?.count || 0),
        resetTime: Date.now() + 60000
      }
    };

  } catch (error) {
    console.error('Bot API request failed:', error);
    return {
      success: false,
      error: 'Internal server error'
    };
  }
};

// Execute bot actions
const executeBotAction = async (action: string, target?: string, data?: any, botToken?: BotToken): Promise<any> => {
  switch (action) {
    case 'send_message':
      return await sendMessageToUser(target!, data.message, botToken!);
    
    case 'remove_post':
      return await removePost(target!, data.reason, botToken!);
    
    case 'ban_user':
      return await banUser(target!, data.duration, data.reason, botToken!);
    
    case 'assign_flair':
      return await assignFlair(target!, data.flair, data.color, botToken!);
    
    case 'view_posts':
      return await getSubredditPosts(botToken!.subredditId);
    
    case 'view_stats':
      return await getSubredditStats(botToken!.subredditId);
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

// Bot action implementations
const sendMessageToUser = async (userId: string, message: string, botToken: BotToken): Promise<any> => {
  // Implementation for sending messages
  console.log(`Bot ${botToken.botName} sending message to ${userId}: ${message}`);
  return { messageId: generateSecureToken(16), sent: true };
};

const removePost = async (postId: string, reason: string, botToken: BotToken): Promise<any> => {
  // Implementation for removing posts
  console.log(`Bot ${botToken.botName} removing post ${postId}: ${reason}`);
  return { postId, removed: true, reason };
};

const banUser = async (userId: string, duration: string, reason: string, botToken: BotToken): Promise<any> => {
  // Implementation for banning users
  console.log(`Bot ${botToken.botName} banning user ${userId} for ${duration}: ${reason}`);
  return { userId, banned: true, duration, reason };
};

const assignFlair = async (targetId: string, flair: string, color: string, botToken: BotToken): Promise<any> => {
  // Implementation for assigning flair
  console.log(`Bot ${botToken.botName} assigning flair "${flair}" to ${targetId}`);
  return { targetId, flair, color, assigned: true };
};

const getSubredditPosts = async (subredditId: string): Promise<any> => {
  // Implementation for getting posts
  return { posts: [], count: 0 };
};

const getSubredditStats = async (subredditId: string): Promise<any> => {
  // Implementation for getting stats
  return { members: 0, posts: 0, comments: 0 };
};

// Get all tokens for a subreddit
export const getSubredditBotTokens = async (subredditId: string): Promise<BotToken[]> => {
  return botTokens.filter(token => token.subredditId === subredditId);
};

// Revoke a bot token
export const revokeBotToken = async (tokenId: string): Promise<boolean> => {
  const tokenIndex = botTokens.findIndex(token => token.id === tokenId);
  if (tokenIndex !== -1) {
    botTokens[tokenIndex].isActive = false;
    return true;
  }
  return false;
};

// Get bot token info (without exposing the actual token)
export const getBotTokenInfo = async (tokenId: string): Promise<Omit<BotToken, 'token'> | null> => {
  const token = botTokens.find(t => t.id === tokenId);
  if (!token) return null;
  
  const { token: _, ...tokenInfo } = token;
  return tokenInfo;
};

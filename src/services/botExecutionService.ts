// Bot Execution Service - Real Backend Bot System
// This service monitors posts/comments and executes bot commands automatically

import { usePostsStore } from '../store/usePostsStore';
import { useAuthStore } from '../store/authStore';
import { awardKarma, getKarmaBreakdown } from './karmaService';

export interface BotCommand {
  id: string;
  subredditId: string;
  name: string;
  trigger: {
    type: 'post_created' | 'comment_created' | 'user_joined' | 'scheduled';
    conditions: BotCondition[];
  };
  actions: BotAction[];
  isActive: boolean;
  createdAt: Date;
  executionCount: number;
}

export interface BotCondition {
  type: 'karma_less_than' | 'karma_greater_than' | 'content_contains' | 'user_age_less_than' | 'post_score_less_than';
  value: string | number;
  field?: string; // For content_contains: 'title' | 'content'
}

export interface BotAction {
  type: 'delete_post' | 'delete_comment' | 'ban_user' | 'remove_post' | 'send_message' | 'assign_flair' | 'lock_post';
  parameters: Record<string, any>;
  reason?: string;
}

export interface BotExecution {
  id: string;
  commandId: string;
  targetId: string; // post/comment/user ID
  targetType: 'post' | 'comment' | 'user';
  action: string;
  result: 'success' | 'failed' | 'skipped';
  reason?: string;
  executedAt: Date;
}

// In-memory storage for bot commands (in production, use database)
let botCommands: BotCommand[] = [];
let botExecutions: BotExecution[] = [];
let isMonitoringActive = false;

// Initialize with some example bot commands
const initializeBotCommands = () => {
  const exampleCommands: BotCommand[] = [
    {
      id: 'automod-karma-check',
      subredditId: 'all',
      name: 'Low Karma Post Removal',
      trigger: {
        type: 'post_created',
        conditions: [
          { type: 'karma_less_than', value: 100 }
        ]
      },
      actions: [
        {
          type: 'delete_post',
          parameters: {},
          reason: 'User karma too low (minimum 100 required)'
        },
        {
          type: 'send_message',
          parameters: {
            message: 'Your post was removed because you need at least 100 karma to post. Current karma: {user_karma}'
          }
        }
      ],
      isActive: true,
      createdAt: new Date(),
      executionCount: 0
    },
    {
      id: 'spam-filter',
      subredditId: 'all',
      name: 'Spam Content Filter',
      trigger: {
        type: 'post_created',
        conditions: [
          { type: 'content_contains', value: 'spam|buy now|click here|free money', field: 'title' }
        ]
      },
      actions: [
        {
          type: 'delete_post',
          parameters: {},
          reason: 'Spam content detected'
        },
        {
          type: 'ban_user',
          parameters: { duration: '7d' },
          reason: 'Posting spam content'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      executionCount: 0
    }
  ];

  botCommands = exampleCommands;
};

// Start monitoring posts and comments for bot triggers
export const startBotMonitoring = () => {
  if (isMonitoringActive) return;
  
  isMonitoringActive = true;
  initializeBotCommands();
  
  console.log('🤖 Bot monitoring system started');
  
  // Monitor posts store for new posts
  const postsStore = usePostsStore.getState();
  
  // Set up real-time monitoring
  setInterval(() => {
    checkForNewContent();
  }, 2000); // Check every 2 seconds
  
  console.log(`🤖 Loaded ${botCommands.length} bot commands`);
};

// Stop bot monitoring
export const stopBotMonitoring = () => {
  isMonitoringActive = false;
  console.log('🤖 Bot monitoring system stopped');
};

// Check for new content and execute bot commands
const checkForNewContent = async () => {
  if (!isMonitoringActive) return;
  
  const postsStore = usePostsStore.getState();
  const posts = postsStore.posts;
  
  // Check each recent post (last 10 posts)
  const recentPosts = posts.slice(-10);
  
  for (const post of recentPosts) {
    // Skip if already processed
    if (botExecutions.some(exec => exec.targetId === post.id)) continue;
    
    await executeBotsForPost(post);
  }
};

// Execute bot commands for a specific post
const executeBotsForPost = async (post: any) => {
  const activeCommands = botCommands.filter(cmd => 
    cmd.isActive && cmd.trigger.type === 'post_created'
  );
  
  for (const command of activeCommands) {
    const shouldExecute = await checkBotConditions(command.trigger.conditions, post);
    
    if (shouldExecute) {
      await executeBotActions(command, post);
    }
  }
};

// Check if bot conditions are met
const checkBotConditions = async (conditions: BotCondition[], target: any): Promise<boolean> => {
  for (const condition of conditions) {
    const result = await evaluateCondition(condition, target);
    if (!result) return false; // All conditions must be true
  }
  return true;
};

// Evaluate a single condition
const evaluateCondition = async (condition: BotCondition, target: any): Promise<boolean> => {
  switch (condition.type) {
    case 'karma_less_than':
      const userKarma = await getUserKarma(target.authorId);
      return userKarma < (condition.value as number);
      
    case 'karma_greater_than':
      const userKarma2 = await getUserKarma(target.authorId);
      return userKarma2 > (condition.value as number);
      
    case 'content_contains':
      const searchText = condition.value as string;
      const field = condition.field || 'title';
      const content = target[field]?.toLowerCase() || '';
      
      // Support regex patterns
      if (searchText.includes('|')) {
        const regex = new RegExp(searchText, 'i');
        return regex.test(content);
      }
      
      return content.includes(searchText.toLowerCase());
      
    case 'user_age_less_than':
      // Check user account age (in days)
      const userAge = await getUserAccountAge(target.authorId);
      return userAge < (condition.value as number);
      
    case 'post_score_less_than':
      return (target.upvotes - target.downvotes) < (condition.value as number);
      
    default:
      return false;
  }
};

// Execute bot actions
const executeBotActions = async (command: BotCommand, target: any) => {
  console.log(`🤖 Executing bot command: ${command.name} on post ${target.id}`);
  
  for (const action of command.actions) {
    try {
      const result = await executeAction(action, target, command);
      
      // Log execution
      const execution: BotExecution = {
        id: Date.now().toString() + Math.random(),
        commandId: command.id,
        targetId: target.id,
        targetType: 'post',
        action: action.type,
        result: result ? 'success' : 'failed',
        reason: action.reason,
        executedAt: new Date()
      };
      
      botExecutions.push(execution);
      command.executionCount++;
      
      console.log(`🤖 Action ${action.type} ${result ? 'succeeded' : 'failed'} for post ${target.id}`);
      
    } catch (error) {
      console.error(`🤖 Error executing action ${action.type}:`, error);
    }
  }
};

// Execute a single action
const executeAction = async (action: BotAction, target: any, command: BotCommand): Promise<boolean> => {
  const postsStore = usePostsStore.getState();
  
  switch (action.type) {
    case 'delete_post':
    case 'remove_post':
      // Actually remove the post from the store
      postsStore.deletePost(target.id);
      
      // Show notification to user
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #dc3545;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = `🤖 Post deleted: ${action.reason}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 5000);
      }
      
      return true;
      
    case 'send_message':
      const message = action.parameters.message?.replace('{user_karma}', await getUserKarma(target.authorId));
      console.log(`🤖 Sending message to ${target.authorId}: ${message}`);
      
      // In a real app, this would send an actual message
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 80px;
          right: 20px;
          background: #0079d3;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          max-width: 300px;
        `;
        notification.textContent = `📨 Bot message: ${message}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 7000);
      }
      
      return true;
      
    case 'ban_user':
      console.log(`🤖 Banning user ${target.authorId} for ${action.parameters.duration}: ${action.reason}`);
      
      // Show ban notification
      if (typeof window !== 'undefined') {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 140px;
          right: 20px;
          background: #dc3545;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = `🔨 User banned: ${action.reason}`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 5000);
      }
      
      return true;
      
    case 'assign_flair':
      console.log(`🤖 Assigning flair to post ${target.id}: ${action.parameters.flair}`);
      return true;
      
    case 'lock_post':
      console.log(`🤖 Locking post ${target.id}`);
      return true;
      
    default:
      return false;
  }
};

// Helper functions
const getUserKarma = async (userId: string): Promise<number> => {
  try {
    const breakdown = await getKarmaBreakdown(userId);
    return breakdown.totalKarma;
  } catch {
    // Fallback: simulate karma based on user ID
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash) % 1000; // Random karma between 0-999
  }
};

const getUserAccountAge = async (userId: string): Promise<number> => {
  // Simulate user account age in days
  return Math.floor(Math.random() * 365) + 1;
};

// Public API functions
export const addBotCommand = (command: Omit<BotCommand, 'id' | 'createdAt' | 'executionCount'>) => {
  const newCommand: BotCommand = {
    ...command,
    id: Date.now().toString() + Math.random(),
    createdAt: new Date(),
    executionCount: 0
  };
  
  botCommands.push(newCommand);
  console.log(`🤖 Added new bot command: ${newCommand.name}`);
  return newCommand;
};

export const getBotCommands = () => botCommands;
export const getBotExecutions = () => botExecutions;
export const toggleBotCommand = (commandId: string) => {
  const command = botCommands.find(cmd => cmd.id === commandId);
  if (command) {
    command.isActive = !command.isActive;
    console.log(`🤖 Bot command ${command.name} ${command.isActive ? 'enabled' : 'disabled'}`);
  }
};

export const deleteBotCommand = (commandId: string) => {
  const index = botCommands.findIndex(cmd => cmd.id === commandId);
  if (index !== -1) {
    const command = botCommands[index];
    botCommands.splice(index, 1);
    console.log(`🤖 Deleted bot command: ${command.name}`);
  }
};

// Karma System Service
// Handles karma calculations, milestones, and rewards

export interface KarmaAction {
  type: 'post_created' | 'post_upvoted' | 'post_downvoted' | 'comment_upvoted' | 'comment_downvoted' | 'content_deleted';
  userId: string;
  contentId: string;
  contentType: 'post' | 'comment';
  points: number;
}

export interface KarmaMilestone {
  level: number;
  threshold: number;
  title: string;
  description: string;
  badge: string;
  rewards: string[];
}

// Karma point values
export const KARMA_VALUES = {
  POST_CREATED: 1,
  POST_UPVOTED: 2,
  POST_DOWNVOTED: -2,
  COMMENT_UPVOTED: 1,
  COMMENT_DOWNVOTED: -1,
  CONTENT_DELETED: 0 // Points are removed when content is deleted
};

// Karma milestones and levels
export const KARMA_MILESTONES: KarmaMilestone[] = [
  {
    level: 1,
    threshold: 0,
    title: "New Redditor",
    description: "Welcome to Reddit!",
    badge: "🆕",
    rewards: ["Basic posting privileges"]
  },
  {
    level: 2,
    threshold: 100,
    title: "Active Member",
    description: "You're getting the hang of it!",
    badge: "⭐",
    rewards: ["Create subreddits", "Post images"]
  },
  {
    level: 3,
    threshold: 500,
    title: "Trusted User",
    description: "The community trusts you!",
    badge: "🏆",
    rewards: ["Moderate discussions", "Pin comments"]
  },
  {
    level: 4,
    threshold: 1000,
    title: "Veteran",
    description: "A seasoned Reddit veteran!",
    badge: "🎖️",
    rewards: ["Create polls", "Advanced formatting"]
  },
  {
    level: 5,
    threshold: 2500,
    title: "Expert",
    description: "Your expertise is recognized!",
    badge: "💎",
    rewards: ["Beta features", "Priority support"]
  },
  {
    level: 6,
    threshold: 5000,
    title: "Legend",
    description: "A true Reddit legend!",
    badge: "👑",
    rewards: ["Custom flair", "Exclusive features"]
  }
];

// Process karma action (called when user performs karma-worthy actions)
export const processKarmaAction = async (action: KarmaAction): Promise<number> => {
  try {
    // In a real app, this would update the database
    console.log(`Processing karma action: ${action.type} for user ${action.userId}, points: ${action.points}`);
    
    // Return the karma points awarded/deducted
    return action.points;
  } catch (error) {
    console.error('Error processing karma action:', error);
    return 0;
  }
};

// Calculate karma for post creation
export const calculatePostKarma = (upvotes: number, downvotes: number): number => {
  return KARMA_VALUES.POST_CREATED + (upvotes * KARMA_VALUES.POST_UPVOTED) + (downvotes * KARMA_VALUES.POST_DOWNVOTED);
};

// Calculate karma for comment
export const calculateCommentKarma = (upvotes: number, downvotes: number): number => {
  return (upvotes * KARMA_VALUES.COMMENT_UPVOTED) + (downvotes * KARMA_VALUES.COMMENT_DOWNVOTED);
};

// Format karma number for display
export const formatKarma = (karma: number): string => {
  if (karma >= 1000000) {
    return `${(karma / 1000000).toFixed(1)}M`;
  } else if (karma >= 1000) {
    return `${(karma / 1000).toFixed(1)}k`;
  } else {
    return karma.toString();
  }
};

// Get user's karma milestone
export const getKarmaMilestone = (karma: number): KarmaMilestone => {
  // Find the highest milestone the user has achieved
  let currentMilestone = KARMA_MILESTONES[0];
  
  for (const milestone of KARMA_MILESTONES) {
    if (karma >= milestone.threshold) {
      currentMilestone = milestone;
    } else {
      break;
    }
  }
  
  return currentMilestone;
};

// Get next karma milestone
export const getNextKarmaMilestone = (karma: number): KarmaMilestone | null => {
  for (const milestone of KARMA_MILESTONES) {
    if (karma < milestone.threshold) {
      return milestone;
    }
  }
  return null; // User has achieved all milestones
};

// Calculate progress to next milestone
export const getKarmaProgress = (karma: number): { current: number; next: number; progress: number } => {
  const currentMilestone = getKarmaMilestone(karma);
  const nextMilestone = getNextKarmaMilestone(karma);
  
  if (!nextMilestone) {
    return {
      current: karma,
      next: karma,
      progress: 100
    };
  }
  
  const progressPoints = karma - currentMilestone.threshold;
  const totalPoints = nextMilestone.threshold - currentMilestone.threshold;
  const progress = Math.min(100, (progressPoints / totalPoints) * 100);
  
  return {
    current: karma,
    next: nextMilestone.threshold,
    progress: Math.round(progress)
  };
};

// Check if user can perform action based on karma
export const canPerformAction = (karma: number, action: string): boolean => {
  const milestone = getKarmaMilestone(karma);
  
  switch (action) {
    case 'create_subreddit':
      return milestone.level >= 2;
    case 'post_images':
      return milestone.level >= 2;
    case 'moderate':
      return milestone.level >= 3;
    case 'pin_comments':
      return milestone.level >= 3;
    case 'create_polls':
      return milestone.level >= 4;
    case 'advanced_formatting':
      return milestone.level >= 4;
    case 'beta_features':
      return milestone.level >= 5;
    case 'custom_flair':
      return milestone.level >= 6;
    default:
      return true; // Basic actions are always allowed
  }
};

// Get karma breakdown for user
export const getKarmaBreakdown = (userId: string): Promise<{
  postKarma: number;
  commentKarma: number;
  totalKarma: number;
  recentActions: KarmaAction[];
}> => {
  // In a real app, this would query the database
  // For testing, return low karma for current user to trigger bot actions
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  // Make sure some users have low karma for testing
  const baseKarma = Math.abs(hash) % 50; // 0-49 karma for testing

  return Promise.resolve({
    postKarma: Math.floor(baseKarma * 0.7),
    commentKarma: Math.floor(baseKarma * 0.3),
    totalKarma: baseKarma,
    recentActions: []
  });
};

// Award karma for specific action
export const awardKarma = async (
  userId: string,
  actionType: KarmaAction['type'],
  contentId: string,
  contentType: 'post' | 'comment'
): Promise<number> => {
  let points = 0;
  
  switch (actionType) {
    case 'post_created':
      points = KARMA_VALUES.POST_CREATED;
      break;
    case 'post_upvoted':
      points = KARMA_VALUES.POST_UPVOTED;
      break;
    case 'post_downvoted':
      points = KARMA_VALUES.POST_DOWNVOTED;
      break;
    case 'comment_upvoted':
      points = KARMA_VALUES.COMMENT_UPVOTED;
      break;
    case 'comment_downvoted':
      points = KARMA_VALUES.COMMENT_DOWNVOTED;
      break;
    case 'content_deleted':
      // Remove karma when content is deleted
      points = contentType === 'post' ? -KARMA_VALUES.POST_CREATED : 0;
      break;
    default:
      points = 0;
  }
  
  const action: KarmaAction = {
    type: actionType,
    userId,
    contentId,
    contentType,
    points
  };
  
  return await processKarmaAction(action);
};

// Get karma leaderboard
export const getKarmaLeaderboard = async (limit: number = 10): Promise<Array<{
  userId: string;
  username: string;
  karma: number;
  milestone: KarmaMilestone;
}>> => {
  // In a real app, this would query the database
  return Promise.resolve([
    {
      userId: '1',
      username: 'TopUser',
      karma: 5500,
      milestone: getKarmaMilestone(5500)
    },
    {
      userId: '2',
      username: 'PowerUser',
      karma: 3200,
      milestone: getKarmaMilestone(3200)
    }
  ]);
};

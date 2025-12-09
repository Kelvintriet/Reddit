// Định nghĩa interface cho Post
export interface Post {
  id: string;
  title: string;
  content: string;
  contentType?: 'markdown' | 'html'; // Add content type field
  authorId: string;
  authorUsername: string;
  subreddit?: string;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  imageUrls?: string[];
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    downloadUrl: string;
  }>;
  tags?: string[];
  viewCount?: number;
  viewedBy?: string[];
  votes?: { [userId: string]: 'up' | 'down' };
  type?: 'text' | 'link' | 'image';
  url?: string;

  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  deleteReason?: string;

  // Edit history
  isEdited?: boolean;
  editedAt?: Date;
  editHistory?: Array<{
    editedAt: Date;
    previousContent: string;
    previousTitle: string;
    editReason?: string;
  }>;

  // Backup data for restoration
  originalData?: {
    upvotes: number;
    downvotes: number;
    commentCount: number;
    votes: { [userId: string]: 'up' | 'down' };
  };
}

// Định nghĩa interface cho Subreddit
export interface Subreddit {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  memberCount: number;
  members: string[];
  isOfficial?: boolean;
  rules?: string[];
  bannerUrl?: string;
  iconUrl?: string;
}

// Định nghĩa interface cho User
export interface User {
  id: string;
  displayName: string;
  email: string;
  username?: string;
  atName?: string; // @name format, unique, cannot be changed
  customUID?: string; // 9-character UID: XXX-YYY-ZZZ
  region?: string; // User's selected region
  regionCode?: string; // 3-character region code
  onboardingCompleted?: boolean; // Whether user completed onboarding
  createdAt: Date;
  karma: number;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  joinedSubreddits?: string[];
  savedPosts?: string[];
  isAdmin?: boolean;
  hideProfile?: boolean;
  hidePosts?: boolean;
  hideComments?: boolean;
  // Location settings
  showLocation?: boolean;
  currentLocation?: {
    country: string;
    countryCode: string;
    region: string;
    city: string;
  };
  language?: 'vi' | 'en';
  updatedAt?: Date;
}

// Định nghĩa interface cho Comment
export interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorUsername: string;
  postId: string;
  parentId?: string; // For nested comments
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  votes?: { [userId: string]: 'up' | 'down' };
  replies?: Comment[];
} 
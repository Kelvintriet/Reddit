// Export tất cả các module từ các file trong thư mục collections
export * from './posts';
export * from './comments';
export * from './subreddits';
export * from './users';

// Định nghĩa các collection name để sử dụng trong toàn bộ ứng dụng
export const COLLECTIONS = {
  POSTS: 'posts',
  COMMENTS: 'comments',
  SUBREDDITS: 'subreddits',
  USERS: 'users'
}; 
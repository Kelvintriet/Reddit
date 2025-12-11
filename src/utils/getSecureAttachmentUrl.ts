/**
 * Generate secure attachment URL that goes through our Koa.js proxy
 * This ensures attachments are only accessible if:
 * 1. User is authenticated
 * 2. User is not blocked
 * 3. Post is not deleted
 * 
 * @param fileId - Appwrite file ID
 * @param postId - Post ID (optional, for verification)
 * @returns Secure proxy URL
 */
export const getSecureAttachmentUrl = (fileId: string, postId?: string | null): string => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://server.reddit.koolname.asia';
  const baseUrl = `${backendUrl}/api/attachments/${fileId}`;

  if (postId) {
    return `${baseUrl}?postId=${postId}`;
  }

  return baseUrl;
};


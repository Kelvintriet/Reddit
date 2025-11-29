/**
 * Generate secure attachment URL that goes through our proxy
 * @param {string} fileId - Appwrite file ID
 * @param {string} postId - Post ID (optional, for verification)
 * @returns {string} Secure proxy URL
 */
export const getSecureAttachmentUrl = (fileId, postId = null) => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  const baseUrl = `${backendUrl}/api/attachments/${fileId}`;

  if (postId) {
    return `${baseUrl}?postId=${postId}`;
  }

  return baseUrl;
};


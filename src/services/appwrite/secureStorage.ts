import { getSecureAttachmentUrl } from '../../utils/getSecureAttachmentUrl';
import { auth } from '../../lib/firebase';

/**
 * Get secure attachment URL with authentication
 * This should be used instead of direct Appwrite URLs for attachments
 * 
 * @param fileId - Appwrite file ID
 * @param postId - Post ID (optional, for verification)
 * @returns Secure proxy URL
 */
export const getSecureFileUrl = (fileId: string, postId?: string | null): string => {
    // Use secure proxy URL
    return getSecureAttachmentUrl(fileId, postId);
};

/**
 * Get secure attachment URL with auth header
 * For use with fetch/axios that includes Authorization header
 */
export const getSecureFileUrlWithAuth = async (fileId: string, postId?: string | null): Promise<{ url: string; headers: HeadersInit }> => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error('User must be authenticated to access secure attachments');
    }

    // Get Firebase ID token
    const token = await currentUser.getIdToken();

    const url = getSecureAttachmentUrl(fileId, postId);
    const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`
    };

    return { url, headers };
};


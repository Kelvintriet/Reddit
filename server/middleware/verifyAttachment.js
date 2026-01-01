import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Initialize Firebase with client config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Middleware to verify attachment access
 * Checks if the post containing the attachment is deleted
 * Format: /api/attachments/:fileId?postId=xxx
 */
export const verifyAttachmentAccess = async (ctx, next) => {
  try {
    const fileId = ctx.params.fileId;
    const postId = ctx.query.postId;

    if (!fileId) {
      ctx.status = 400;
      ctx.body = { error: 'File ID is required' };
      return;
    }

    // If postId is provided, verify the post is not deleted
    if (postId) {
      // First check main posts collection
      let postRef = doc(db, 'posts', postId);
      let postSnap = await getDoc(postRef);

      // If not found, check deletedPosts collection
      if (!postSnap.exists()) {
        postRef = doc(db, 'deletedPosts', postId);
        postSnap = await getDoc(postRef);
      }

      if (postSnap.exists()) {
        const postData = postSnap.data();
        
        // Check if post is deleted
        if (postData.isDeleted === true) {
          ctx.status = 403;
          ctx.body = { error: 'Access denied: Post has been deleted' };
          return;
        }

        // Verify attachment belongs to this post
        const imageUrls = Array.isArray(postData.imageUrls) ? postData.imageUrls : [];
        const attachments = Array.isArray(postData.attachments) ? postData.attachments : [];
        
        // Check if fileId is in imageUrls or attachments
        let isInImageUrls = false;
        let isInAttachments = false;
        
        // Check imageUrls (array of URLs)
        for (const url of imageUrls) {
          if (typeof url === 'string') {
            // Extract fileId from Appwrite URL
            const match = url.match(/files\/([^\/\?]+)/);
            if (match && match[1] === fileId) {
              isInImageUrls = true;
              break;
            }
          }
        }

        // Check attachments (array of objects with url property)
        for (const att of attachments) {
          if (att && att.url) {
            // Extract fileId from attachment URL
            const match = att.url.match(/files\/([^\/\?]+)/);
            if (match && match[1] === fileId) {
              isInAttachments = true;
              break;
            }
          }
          // Also check if attachment.id matches fileId
          if (att && att.id === fileId) {
            isInAttachments = true;
            break;
          }
        }

        if (!isInImageUrls && !isInAttachments) {
          ctx.status = 403;
          ctx.body = { error: 'Access denied: Attachment does not belong to this post' };
          return;
        }
      } else {
        // Post not found - could be deleted or never existed
        // For now, we'll allow access if postId is not found
        // In production, you might want to add a fileIds index for faster lookup
        // This is a performance trade-off - checking all deleted posts would be slow
        // Consider adding a fileIds array field to posts for faster verification
      }
    }

    // Store fileId in context for proxy route
    ctx.state.fileId = fileId;
    await next();
  } catch (error) {
    console.error('Attachment verification error:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to verify attachment access' };
    return;
  }
};


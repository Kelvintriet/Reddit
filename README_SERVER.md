# Secure Attachment Server Setup

## Overview

This Koa.js backend server provides secure access to attachments stored in Appwrite, ensuring that:
- Only authenticated users can access attachments
- Blocked users are denied access
- Attachments from deleted posts cannot be accessed
- All requests are verified before proxying to Appwrite

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
FRONTEND_URL=http://localhost:3000
PORT=5000
FIREBASE_API_KEY=AIzaSyAq91-kUVQlXW3MhwpfRPmGP7e0nWAqGT0
FIREBASE_PROJECT_ID=xredread
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=68354a45003c063d0155
APPWRITE_BUCKET_ID=686a52c0001f6ee0e043
VITE_BACKEND_URL=http://localhost:5000
```

**Getting Firebase API Key:**
1. Go to Firebase Console > Project Settings > General
2. Copy the "Web API Key" (it's safe to expose in client-side code)
3. Set it as `FIREBASE_API_KEY` environment variable

### 3. Run the Server

```bash
# Development (with auto-reload)
npm run server:dev

# Production
npm run server
```

The server will start on `http://localhost:5000`

## API Usage

### Frontend Integration

Use the `SecureImage` component for images:

```tsx
import { SecureImage } from '../components/common/SecureImage';

<SecureImage 
  fileId="file-id-from-appwrite" 
  postId="post-id-for-verification"
  alt="Image description"
  className="post-image"
/>
```

Or use the utility function for custom implementations:

```tsx
import { getSecureAttachmentUrl } from '../utils/getSecureAttachmentUrl';
import { useAuthStore } from '../store';

const { user } = useAuthStore();

// Get secure URL
const secureUrl = getSecureAttachmentUrl(fileId, postId);

// Fetch with auth header
const response = await fetch(secureUrl, {
  headers: {
    'Authorization': `Bearer ${await user.getIdToken()}`
  }
});
```

## Security Features

### ✅ Authentication Required
All requests must include a valid Firebase ID token in the `Authorization` header.

### ✅ Blocked User Detection
Users with `isBlocked: true` in their user document are automatically denied access.

### ✅ Post Deletion Verification
- If `postId` is provided, the server verifies the post is not deleted
- Attachments from deleted posts return `403 Forbidden`
- Works for both `posts` and `deletedPosts` collections

### ✅ Attachment Ownership Verification
The server verifies that the requested fileId actually belongs to the specified post before allowing access.

## Middleware Flow

```
Request → verifyAuth → checkBlockedUser → verifyAttachmentAccess → proxyAttachment → Response
```

1. **verifyAuth**: Validates Firebase ID token
2. **checkBlockedUser**: Checks if user is blocked
3. **verifyAttachmentAccess**: Verifies post is not deleted and attachment belongs to post
4. **proxyAttachment**: Proxies request to Appwrite and streams response

## Error Responses

- `400 Bad Request`: Missing fileId or invalid request
- `401 Unauthorized`: No token or invalid token
- `403 Forbidden`: User blocked, post deleted, or attachment doesn't belong to post
- `500 Internal Server Error`: Server error

## Production Deployment

1. Set environment variables on your hosting platform
2. Ensure Firebase Admin SDK has proper credentials
3. Configure CORS for your frontend domain
4. Use HTTPS in production
5. Consider adding rate limiting for additional security

## Notes

- The server proxies files from Appwrite, so Appwrite URLs are never exposed directly
- Files are streamed to prevent memory issues with large files
- Caching headers are set for optimal performance
- All authentication is handled server-side for maximum security


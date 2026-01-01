# Secure Attachment Server

Koa.js backend server for secure attachment access with authentication and post deletion verification.

## Features

- Firebase authentication verification
- Blocked user detection
- Post deletion verification
- Secure attachment proxy
- Prevents access to attachments from deleted posts

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
FRONTEND_URL=http://localhost:3000
PORT=5000
FIREBASE_API_KEY=AIzaSyAq91-kUVQlXW3MhwpfRPmGP7e0nWAqGT0
FIREBASE_PROJECT_ID=xredread
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=68354a45003c063d0155
APPWRITE_BUCKET_ID=686a52c0001f6ee0e043
```

### 3. Get Firebase API Key

1. Go to Firebase Console > Project Settings > General
2. Copy the "Web API Key" (it's safe to expose - same as client-side)
3. Set it as `FIREBASE_API_KEY` environment variable

### 4. Run the Server

```bash
# Development (with auto-reload)
npm run server:dev

# Production
npm run server
```

## API Endpoints

### GET `/api/attachments/:fileId?postId=xxx`

Securely proxy attachment requests.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Query Parameters:**
- `fileId` (required): Appwrite file ID
- `postId` (optional): Post ID for verification

**Response:**
- `200`: File stream
- `401`: Unauthorized (no/invalid token)
- `403`: Forbidden (user blocked, post deleted, or attachment doesn't belong to post)
- `500`: Server error

### GET `/health`

Health check endpoint.

## Middleware Chain

1. **verifyAuth**: Verifies Firebase ID token
2. **checkBlockedUser**: Checks if user is blocked
3. **verifyAttachmentAccess**: Verifies post is not deleted and attachment belongs to post
4. **proxyAttachment**: Proxies request to Appwrite

## Security Features

- Authentication required for all attachment requests
- Blocks access for blocked users
- Prevents access to attachments from deleted posts
- Verifies attachment belongs to the specified post
- Secure token-based authentication

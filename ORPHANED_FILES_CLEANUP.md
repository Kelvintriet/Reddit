# Orphaned Files Cleanup System

## Overview

This system automatically detects and deletes files that were uploaded but never attached to a post (when users leave without completing post creation).

## How It Works

### 1. **File Upload Tracking**
- When a file is uploaded via `uploadFile()` or `uploadMultipleFiles()`, it's automatically registered in Firestore `orphanedFiles` collection
- Each record contains:
  - `fileId`: Appwrite file ID
  - `userId`: User who uploaded the file
  - `uploadedAt`: Timestamp when file was uploaded
  - `attachedToPost`: `null` initially, set to post ID when post is created

### 2. **Post Creation**
- When a post is created with attachments, `markFilesAsAttached()` is called
- This updates all file records to mark them as attached to the post
- Files marked as attached will NOT be deleted

### 3. **Cleanup Process**
- Backend server has a cleanup endpoint: `POST /api/cleanup/orphaned-files`
- Finds all files that:
  - Have `attachedToPost == null` (not attached to any post)
  - Are older than 30 minutes (`ORPHAN_TIMEOUT_MINUTES`)
- Deletes these files from:
  1. Appwrite storage (the actual file)
  2. Firestore `orphanedFiles` collection (the tracking record)

## Usage

### Manual Cleanup
```bash
# Run cleanup script
npm run cleanup

# Or call the API endpoint directly
curl -X POST http://localhost:5000/api/cleanup/orphaned-files
```

### Automated Cleanup (Cron Job)
Set up a cron job to run cleanup every hour:

```bash
# Add to crontab (runs every hour)
0 * * * * cd /path/to/reddit-clone && npm run cleanup
```

Or use a service like:
- **GitHub Actions** (for GitHub-hosted projects)
- **Vercel Cron Jobs** (if deployed on Vercel)
- **Cloud Scheduler** (Google Cloud)
- **AWS EventBridge** (AWS)

## Configuration

### Environment Variables
```env
# Appwrite API Key (for deleting files)
APPWRITE_API_KEY=your-appwrite-api-key

# Other existing vars...
FIREBASE_API_KEY=...
FIREBASE_PROJECT_ID=...
APPWRITE_ENDPOINT=...
APPWRITE_PROJECT_ID=...
APPWRITE_BUCKET_ID=...
```

### Timeout Configuration
Default: 30 minutes (`ORPHAN_TIMEOUT_MINUTES`)

To change, update:
- `src/services/appwrite/orphanedFiles.ts` (frontend constant)
- `server/routes/cleanup.js` (backend constant)

## Files Modified

1. **`src/services/appwrite/storage.ts`**
   - `uploadFile()` now accepts `userId` parameter
   - Registers files as orphaned after upload

2. **`src/services/appwrite/orphanedFiles.ts`** (NEW)
   - `registerOrphanedFile()` - Registers uploaded files
   - `markFilesAsAttached()` - Marks files as attached to post
   - `getOrphanedFiles()` - Gets orphaned files for cleanup

3. **`src/components/post/FileUpload.tsx`**
   - Now accepts `userId` prop
   - Passes userId to upload functions

4. **`src/pages/CreatePost.tsx`**
   - Passes `user.uid` to FileUpload component

5. **`src/collections/posts.ts`**
   - `createPost()` now marks files as attached after post creation

6. **`server/routes/cleanup.js`** (NEW)
   - Cleanup endpoint that deletes orphaned files

7. **`server/index.js`**
   - Added cleanup route

## Firestore Collection Structure

### `orphanedFiles` Collection
```typescript
{
  fileId: string;           // Appwrite file ID
  userId: string;          // User who uploaded
  uploadedAt: Timestamp;   // When uploaded
  attachedToPost: string | null;  // Post ID if attached, null if orphaned
  attachedAt?: Timestamp;  // When attached (if attached)
}
```

## Notes

- Files are tracked immediately upon upload
- If user completes post creation, files are marked as attached
- If user leaves without creating post, files remain orphaned
- Cleanup job runs periodically to delete orphaned files older than 30 minutes
- Non-critical errors are logged but don't break the flow
- Appwrite API key may be required for file deletion (check Appwrite docs)


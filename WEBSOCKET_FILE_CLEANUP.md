# WebSocket-Based File Cleanup System

## Overview

Real-time file cleanup system using WebSockets to detect when users leave during post submission and automatically delete orphaned files.

## How It Works

### 1. **WebSocket Connection**
- When user opens CreatePost page (new post, not edit), WebSocket connects to backend
- Connection URL: `ws://localhost:5000/ws/file-cleanup`
- Session is registered with userId and any existing uploaded files

### 2. **File Upload Tracking**
- When files are uploaded, they're tracked via WebSocket
- Server maintains session with list of fileIds
- Each session tracks: `{ userId, fileIds: [], postSubmitted: false }`

### 3. **Post Submission**
- When post is successfully created, frontend sends `post_submitted` message
- Server marks session as `postSubmitted: true`
- Files will NOT be deleted when user disconnects

### 4. **User Disconnection**
- When WebSocket closes (user leaves page, closes tab, navigates away):
  - Server checks if `postSubmitted === false`
  - If false AND files exist, deletes all tracked files from Appwrite
  - Files are deleted immediately, not waiting for timeout

## Architecture

### Backend (`server/websocket/fileCleanup.js`)
- WebSocket server on `/ws/file-cleanup`
- Tracks active sessions in memory
- Deletes files on disconnect if post not submitted
- Cleans up stale sessions (older than 1 hour)

### Frontend (`src/services/websocket/fileCleanup.ts`)
- WebSocket client class
- Auto-reconnects on disconnect
- Heartbeat ping every 30 seconds
- Tracks files and notifies on post submission

### Integration (`src/pages/CreatePost.tsx`)
- Connects WebSocket on mount (new posts only)
- Tracks files when uploaded
- Notifies server on post submission
- Disconnects on unmount

## Message Types

### Client → Server
- `register`: Register session with userId and fileIds
- `file_uploaded`: Add file to tracking
- `post_submitted`: Mark post as submitted (keep files)
- `file_removed`: Remove file from tracking
- `ping`: Heartbeat

### Server → Client
- `connected`: Connection established
- `registered`: Session registered
- `ack`: Acknowledgment
- `pong`: Heartbeat response

## Benefits

✅ **Real-time cleanup**: Files deleted immediately when user leaves
✅ **No timeouts needed**: Instant detection of abandonment
✅ **Efficient**: Only tracks active sessions
✅ **Reliable**: WebSocket ensures connection state is known
✅ **Automatic**: No manual cleanup needed

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Start server:**
```bash
npm run server:dev
```

3. **WebSocket will automatically:**
- Connect when CreatePost page loads
- Track uploaded files
- Delete files if user leaves without submitting

## Notes

- WebSocket only tracks NEW posts, not edits
- Files are deleted from Appwrite storage immediately on disconnect
- Session cleanup runs every 5 minutes for stale sessions
- Heartbeat keeps connection alive (ping every 30 seconds)
- Auto-reconnect attempts up to 5 times with exponential backoff


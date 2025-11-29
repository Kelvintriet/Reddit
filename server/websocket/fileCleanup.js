import { WebSocketServer } from 'ws';
import { deleteAppwriteFile } from '../utils/deleteAppwriteFile.js';

// Store active sessions: userId -> { ws, fileIds: [], postSubmitted: false }
const activeSessions = new Map();

/**
 * Initialize WebSocket server for file cleanup tracking
 */
export const initializeFileCleanupWebSocket = (server) => {
  try {
    const wss = new WebSocketServer({ 
      server,
      path: '/ws/file-cleanup'
    });

    console.log('✅ WebSocket server initialized on path: /ws/file-cleanup');

    wss.on('connection', (ws, req) => {
      let userId = null;
      let sessionId = null;

      console.log('🔌 New WebSocket connection for file cleanup');
      console.log('📍 Request URL:', req.url);
      console.log('📍 Request headers:', req.headers);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'register':
            // Register user session with uploaded files
            userId = data.userId;
            sessionId = data.sessionId || `${userId}-${Date.now()}`;
            
            activeSessions.set(sessionId, {
              ws,
              userId,
              fileIds: data.fileIds || [],
              postSubmitted: false,
              connectedAt: new Date()
            });
            
            console.log(`📝 Registered session ${sessionId} for user ${userId} with ${data.fileIds?.length || 0} files`);
            
            ws.send(JSON.stringify({
              type: 'registered',
              sessionId
            }));
            break;

          case 'file_uploaded':
            // Add file to session tracking
            if (sessionId && activeSessions.has(sessionId)) {
              const session = activeSessions.get(sessionId);
              if (!session.fileIds.includes(data.fileId)) {
                session.fileIds.push(data.fileId);
                console.log(`📎 Added file ${data.fileId} to session ${sessionId}`);
              }
            }
            break;

          case 'post_submitted':
            // Mark post as submitted - don't delete files
            if (sessionId && activeSessions.has(sessionId)) {
              const session = activeSessions.get(sessionId);
              session.postSubmitted = true;
              console.log(`✅ Post submitted for session ${sessionId}, files will be kept`);
              
              ws.send(JSON.stringify({
                type: 'ack',
                message: 'Post submitted, files will be kept'
              }));
            }
            break;

          case 'file_removed':
            // Remove file from tracking
            if (sessionId && activeSessions.has(sessionId)) {
              const session = activeSessions.get(sessionId);
              session.fileIds = session.fileIds.filter(id => id !== data.fileId);
              console.log(`🗑️ Removed file ${data.fileId} from session ${sessionId}`);
            }
            break;

          case 'ping':
            // Keep-alive ping
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (sessionId && activeSessions.has(sessionId)) {
        const session = activeSessions.get(sessionId);
        
        // If post was not submitted, delete orphaned files
        if (!session.postSubmitted && session.fileIds.length > 0) {
          console.log(`⚠️ User ${userId} disconnected without submitting post. Cleaning up ${session.fileIds.length} files...`);
          
          // Delete files asynchronously
          const deletePromises = session.fileIds.map(async (fileId) => {
            try {
              await deleteAppwriteFile(fileId);
              console.log(`✅ Deleted orphaned file: ${fileId}`);
              return { success: true, fileId };
            } catch (error) {
              console.error(`❌ Failed to delete file ${fileId}:`, error.message);
              return { success: false, fileId, error: error.message };
            }
          });
          
          // Wait for all deletions to complete
          await Promise.all(deletePromises);
        }
        
        activeSessions.delete(sessionId);
        console.log(`🔌 Session ${sessionId} closed`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send initial connection message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'File cleanup WebSocket connected'
    }));
  });

  // Cleanup stale sessions (older than 1 hour)
  setInterval(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    for (const [sessionId, session] of activeSessions.entries()) {
      if (session.connectedAt < oneHourAgo) {
        console.log(`🧹 Cleaning up stale session: ${sessionId}`);
        if (session.ws.readyState === 1) { // OPEN
          session.ws.close();
        }
        activeSessions.delete(sessionId);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

    wss.on('error', (error) => {
      console.error('❌ WebSocket server error:', error);
    });

    console.log('✅ File cleanup WebSocket server initialized');
    return wss;
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket server:', error);
    throw error;
  }
};


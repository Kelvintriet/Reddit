/**
 * WebSocket client for file cleanup tracking
 * Tracks uploaded files and notifies server when post is submitted
 */

export class FileCleanupWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  public userId: string | null = null; // Made public for comparison in getFileCleanupWebSocket
  private fileIds: string[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const backendUrl = (import.meta.env.VITE_BACKEND_URL || 'https://server.reddit.koolname.asia').replace('localhost', '127.0.0.1');
      const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws/file-cleanup';

      console.log('🔗 Connecting to WebSocket:', wsUrl);

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔌 File cleanup WebSocket connected to:', wsUrl);
          this.reconnectAttempts = 0;

          // Register session with current fileIds
          this.sessionId = `${this.userId}-${Date.now()}`;
          this.send({
            type: 'register',
            userId: this.userId,
            sessionId: this.sessionId,
            fileIds: [...this.fileIds] // Send copy of current fileIds
          });

          // Start heartbeat
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'registered') {
              this.sessionId = data.sessionId;
              console.log('✅ Session registered:', this.sessionId);
            } else if (data.type === 'pong') {
              // Heartbeat response
            }
          } catch (error) {
            console.error('WebSocket message parse error:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 File cleanup WebSocket closed');
          this.stopHeartbeat();

          // Attempt to reconnect if not intentional
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              console.log(`🔄 Reconnecting... (attempt ${this.reconnectAttempts})`);
              this.connect().catch(console.error);
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Track uploaded file
   */
  trackFile(fileId: string): void {
    if (!this.fileIds.includes(fileId)) {
      this.fileIds.push(fileId);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'file_uploaded',
          fileId
        });
      }
    }
  }

  /**
   * Notify server that post was submitted
   */
  notifyPostSubmitted(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'post_submitted'
      });
      console.log('✅ Notified server: post submitted');
    }
  }

  /**
   * Remove file from tracking
   */
  removeFile(fileId: string): void {
    this.fileIds = this.fileIds.filter(id => id !== fileId);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'file_removed',
        fileId
      });
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.fileIds = [];
  }

  /**
   * Send message to server
   */
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance per user
let instance: FileCleanupWebSocket | null = null;

export const getFileCleanupWebSocket = (userId: string): FileCleanupWebSocket => {
  if (!instance || instance.userId !== userId) {
    if (instance) {
      instance.disconnect();
    }
    instance = new FileCleanupWebSocket(userId);
  }
  return instance;
};


import axios from 'axios';

// Support both VITE_ prefixed (shared .env) and non-prefixed env vars
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || 'https://sfo.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || '692b884000178a170988';
const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID || process.env.VITE_APPWRITE_STORAGE_BUCKET_ID || '692b896c002fa0a3fc4b';

/**
 * Proxy route to securely serve attachments from Appwrite
 * Only serves if verification middleware passes
 */
export const proxyAttachment = async (ctx) => {
  try {
    const fileId = ctx.state.fileId;

    if (!fileId) {
      ctx.status = 400;
      ctx.body = { error: 'File ID is required' };
      return;
    }

    // Construct Appwrite file view URL
    const appwriteUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;

    // Fetch file from Appwrite
    const response = await axios.get(appwriteUrl, {
      responseType: 'stream',
      validateStatus: (status) => status === 200
    });

    // Set appropriate headers
    ctx.set('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    ctx.set('Content-Length', response.headers['content-length'] || '');
    ctx.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Set filename if available
    if (response.headers['content-disposition']) {
      ctx.set('Content-Disposition', response.headers['content-disposition']);
    }

    ctx.status = 200;
    ctx.body = response.data; // Stream the file
  } catch (error) {
    console.error('Proxy attachment error:', error);

    if (error.response) {
      ctx.status = error.response.status || 500;
      ctx.body = { error: 'Failed to fetch attachment' };
    } else {
      ctx.status = 500;
      ctx.body = { error: 'Internal server error' };
    }
  }
};


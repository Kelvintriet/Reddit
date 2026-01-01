import axios from 'axios';

// Support both VITE_ prefixed (shared .env) and non-prefixed env vars
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID || process.env.VITE_APPWRITE_STORAGE_BUCKET_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

/**
 * Delete file from Appwrite storage
 */
export const deleteAppwriteFile = async (fileId) => {
  try {
    const deleteUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}?project=${APPWRITE_PROJECT_ID}`;

    const headers = {
      'X-Appwrite-Project': APPWRITE_PROJECT_ID
    };

    if (APPWRITE_API_KEY) {
      headers['X-Appwrite-Key'] = APPWRITE_API_KEY;
    }

    await axios.delete(deleteUrl, { headers });
    console.log(`✅ Deleted file from Appwrite: ${fileId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete file ${fileId}:`, error.response?.data || error.message);
    throw error;
  }
};


import axios from 'axios';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '68354a45003c063d0155';
const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID || '686a52c0001f6ee0e043';
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


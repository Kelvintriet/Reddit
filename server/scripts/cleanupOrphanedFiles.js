/**
 * Standalone script to cleanup orphaned files
 * Can be run via cron job: node server/scripts/cleanupOrphanedFiles.js
 */

import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function runCleanup() {
  try {
    console.log('🧹 Starting orphaned files cleanup...');
    const response = await axios.post(`${BACKEND_URL}/api/cleanup/orphaned-files`);
    console.log('✅ Cleanup completed:', response.data);
  } catch (error) {
    console.error('❌ Cleanup failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runCleanup();


import { Client, Account, Storage, Databases } from 'appwrite'

// Khởi tạo Client Appwrite
const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '68354a45003c063d0155')

// Khởi tạo các services
export const account = new Account(client)
export const storage = new Storage(client)
export const databases = new Databases(client)

// Constants cho storage
export const STORAGE_BUCKET_ID = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID || '686a52c0001f6ee0e043'

// Debug logging
console.log('🔧 Appwrite Configuration:', {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID || '68354a45003c063d0155',
  bucketId: STORAGE_BUCKET_ID
})

// Helper function để kiểm tra lỗi Appwrite và trả về message phù hợp
export const handleAppwriteError = (error: any): string => {
  console.error('Appwrite error:', error)
  
  if (error.message) {
    return error.message
  }
  
  if (error.response?.message) {
    return error.response.message
  }
  
  return 'Đã xảy ra lỗi khi kết nối với Appwrite.'
}

export default client 
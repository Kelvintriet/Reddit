import { Client, Storage, ID } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '68354a45003c063d0155')

const storage = new Storage(client)

const bucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID || '686a52c0001f6ee0e043'

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
]

export const SUPPORTED_VIDEO_TYPES = [
  'video/mp4',
  'video/avi',
  'video/mov',
  'video/wmv',
  'video/flv',
  'video/webm',
  'video/mkv',
  'video/3gp',
  'video/m4v',
  'video/quicktime'
]

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
]

export const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
  ...SUPPORTED_DOCUMENT_TYPES
]

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB for avatars

export interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  url: string
  preview?: string
  downloadUrl: string
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const isImageFile = (type: string): boolean => {
  return SUPPORTED_IMAGE_TYPES.includes(type)
}

export const isVideoFile = (type: string): boolean => {
  return SUPPORTED_VIDEO_TYPES.includes(type)
}

export const isGifFile = (type: string): boolean => {
  return type === 'image/gif'
}

export const isPreviewableFile = (type: string): boolean => {
  return isImageFile(type) || isVideoFile(type)
}

export const isDangerousFile = (type: string): boolean => {
  const safeTypes = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES, 'application/pdf', 'text/plain', 'text/csv']
  return !safeTypes.includes(type)
}

export const getFileIcon = (type: string): string => {
  if (isImageFile(type)) return 'image'
  if (isVideoFile(type)) return 'video'
  if (type === 'application/pdf') return 'pdf'
  if (type.startsWith('text/')) return 'text'
  if (type.includes('word')) return 'word'
  if (type.includes('excel') || type.includes('sheet')) return 'excel'
  if (type.includes('powerpoint') || type.includes('presentation')) return 'powerpoint'
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'archive'
  return 'file'
}

const handleAppwriteError = (error: any): string => {
  if (error.code === 413) {
    return 'File quá lớn. Vui lòng chọn file nhỏ hơn 10MB.'
  }
  if (error.code === 400) {
    return 'File không hợp lệ hoặc bị hỏng.'
  }
  if (error.code === 401) {
    return 'Không có quyền truy cập. Vui lòng đăng nhập lại.'
  }
  if (error.code === 429) {
    return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
  }
  return error.message || 'Đã xảy ra lỗi không xác định.'
}

export const uploadFile = async (file: File): Promise<UploadedFile> => {
  try {
    console.log('📤 Starting file upload:', { name: file.name, size: file.size, type: file.type })
    
    const fileId = ID.unique()
    const response = await storage.createFile(
      bucketId,
      fileId,
      file
    )
    
    console.log('✅ File uploaded to Appwrite:', response)
    
    // Sử dụng URL khác nhau cho video và image
    const viewUrl = isVideoFile(file.type) 
      ? getVideoStreamUrl(response.$id)
      : getFileViewUrl(response.$id)
    const downloadUrl = getFileDownloadUrl(response.$id)
    
    const uploadedFile: UploadedFile = {
      id: response.$id,
      name: response.name,
      type: file.type,
      size: response.sizeOriginal,
      url: viewUrl,
      preview: isPreviewableFile(file.type) ? viewUrl : undefined,
      downloadUrl: downloadUrl
    }
    
    console.log('📁 Created UploadedFile object:', uploadedFile)
    return uploadedFile
  } catch (error) {
    console.error('❌ Upload failed:', error)
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const uploadAvatar = async (file: File): Promise<UploadedFile> => {
  try {
    if (file.size > MAX_AVATAR_SIZE) {
      throw new Error(`Avatar file quá lớn. Kích thước tối đa là ${formatFileSize(MAX_AVATAR_SIZE)}.`)
    }
    
    if (!isImageFile(file.type)) {
      throw new Error('Avatar chỉ hỗ trợ file ảnh (JPEG, PNG, WebP, GIF).')
    }
    
    console.log('🖼️ Starting avatar upload:', { name: file.name, size: file.size, type: file.type })
    
    const fileId = ID.unique()
    const response = await storage.createFile(
      bucketId,
      fileId,
      file
    )
    
    console.log('✅ Avatar uploaded to Appwrite:', response)
    
    const viewUrl = getFileViewUrl(response.$id)
    const downloadUrl = getFileDownloadUrl(response.$id)
    
    const uploadedFile: UploadedFile = {
      id: response.$id,
      name: response.name,
      type: file.type,
      size: response.sizeOriginal,
      url: viewUrl,
      preview: viewUrl,
      downloadUrl: downloadUrl
    }
    
    console.log('🖼️ Created avatar UploadedFile object:', uploadedFile)
    return uploadedFile
  } catch (error) {
    console.error('❌ Avatar upload failed:', error)
    throw new Error(`Avatar upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export const uploadMultipleFiles = async (files: File[]): Promise<UploadedFile[]> => {
  try {
    console.log('📤 Starting multiple file upload:', files.length, 'files')
    
    const uploadPromises = files.map(file => uploadFile(file))
    const results = await Promise.all(uploadPromises)
    
    console.log('✅ Multiple files uploaded successfully:', results.length)
    return results
  } catch (error) {
    console.error('❌ Multiple upload failed:', error)
    throw new Error(handleAppwriteError(error))
  }
}

export const deleteFile = async (fileId: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting file:', fileId)
    await storage.deleteFile(bucketId, fileId)
    console.log('✅ File deleted successfully')
  } catch (error) {
    console.error('❌ Delete failed:', error)
    throw new Error(handleAppwriteError(error))
  }
}

export const getFile = async (fileId: string) => {
  try {
    return await storage.getFile(bucketId, fileId)
  } catch (error) {
    throw new Error(handleAppwriteError(error))
  }
}

export const getFileDownloadUrl = (fileId: string): string => {
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '68354a45003c063d0155'
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/download?project=${projectId}`
}

export const getFileViewUrl = (fileId: string): string => {
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '68354a45003c063d0155'
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
  
  // Sử dụng view URL thay vì preview vì preview chỉ dành cho paid plan
  const url = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`
  console.log('🔗 Generated view URL:', url)
  return url
}

export const getVideoStreamUrl = (fileId: string): string => {
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '68354a45003c063d0155'
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
  
  // Sử dụng view URL bình thường cho video - không cần mode=admin
  const url = `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`
  console.log('🎬 Generated video stream URL:', url)
  return url
}

export const getImagePreviewUrl = (fileId: string): string => {
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '68354a45003c063d0155'
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
  
  // Sử dụng view URL thay vì preview
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`
}

export const createThumbnail = (fileId: string): string => {
  const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '68354a45003c063d0155'
  const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1'
  
  // Sử dụng view URL thay vì preview
  return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${projectId}`
}
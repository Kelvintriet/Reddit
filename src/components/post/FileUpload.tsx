import React, { useState, useRef, useCallback } from 'react'
import { uploadFile, uploadMultipleFiles, deleteFile, ALL_SUPPORTED_TYPES, MAX_FILE_SIZE, formatFileSize, isImageFile, isVideoFile, isDangerousFile, getFileIcon } from '../../services/appwrite/storage'
import type { UploadedFile } from '../../services/appwrite/storage'
import { useLanguageStore } from '../../store/useLanguageStore'
import { translations } from '../../constants/translations'

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  onFileRemoved: (fileId: string) => void
  uploadedFiles: UploadedFile[]
  maxFiles?: number
  acceptedTypes?: string[]
  multiple?: boolean
  disabled?: boolean
  userId?: string // User ID for orphaned file tracking
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  onFileRemoved,
  uploadedFiles,
  maxFiles = 5,
  acceptedTypes = ALL_SUPPORTED_TYPES,
  multiple = true,
  disabled = false,
  userId
}) => {
  const { language } = useLanguageStore()
  const t = (key: keyof typeof translations.vi) => translations[language][key]

  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingFiles, setDeletingFiles] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" quá lớn. Kích thước tối đa là ${formatFileSize(MAX_FILE_SIZE)}.`
    }
    
    // Check if file is dangerous/executable
    if (isDangerousFile(file.type, file.name)) {
      return `File "${file.name}" không được phép upload. Các file thực thi (.exe, .bat, .sh, v.v.) bị cấm vì lý do bảo mật.`
    }
    
    if (!acceptedTypes.includes(file.type)) {
      return `File "${file.name}" không được hỗ trợ. Chỉ hỗ trợ: ảnh, video, PDF, Word, Excel, PowerPoint, và file nén.`
    }
    
    return null
  }

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return
    
    const fileArray = Array.from(files)
    const remainingSlots = maxFiles - uploadedFiles.length
    
    console.log('📂 Files selected:', {
      fileCount: fileArray.length,
      remainingSlots,
      files: fileArray.map(f => ({ name: f.name, size: f.size, type: f.type }))
    })
    
    if (fileArray.length > remainingSlots) {
      setError(`Chỉ có thể upload tối đa ${maxFiles} file. Còn lại ${remainingSlots} slot.`)
      return
    }

    // Validate files
    for (const file of fileArray) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setError(null)
    setIsUploading(true)

    try {
      console.log('🚀 Starting upload process...')
      let uploadedFiles: UploadedFile[]
      
      if (multiple && fileArray.length > 1) {
        // Upload multiple files
        console.log('📤 Uploading multiple files...')
        uploadedFiles = await uploadMultipleFiles(fileArray, userId)
      } else {
        // Upload single file
        console.log('📤 Uploading single file...')
        const uploadedFile = await uploadFile(fileArray[0], userId)
        uploadedFiles = [uploadedFile]
      }

      console.log('✅ Upload completed successfully:', uploadedFiles)
      onFilesUploaded(uploadedFiles)
    } catch (error) {
      console.error('❌ Upload failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Lỗi khi upload file'
      setError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }, [disabled, maxFiles, uploadedFiles.length, acceptedTypes, multiple, onFilesUploaded, userId])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [disabled, handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFiles])

  const handleRemoveFile = async (file: UploadedFile) => {
    try {
      console.log('🗑️ Starting file deletion:', file.id)
      console.log('🗑️ File details:', file)
      setDeletingFiles(prev => new Set([...prev, file.id]))
      
      await deleteFile(file.id)
      console.log('✅ File deleted from Appwrite:', file.id)
      
      onFileRemoved(file.id)
      console.log('✅ File removed from parent component:', file.id)
      setError(null)
    } catch (error) {
      console.error('❌ Delete error:', error)
      setError(error instanceof Error ? error.message : 'Lỗi khi xóa file')
    } finally {
      setDeletingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(file.id)
        return newSet
      })
    }
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const renderFilePreview = (file: UploadedFile) => {
    if (isImageFile(file.type)) {
      return (
        <div className="file-preview">
          <img 
            src={file.preview || file.url} 
            alt={file.name}
            onError={(e) => {
              console.error('Failed to load preview:', file.preview || file.url)
              e.currentTarget.style.display = 'none'
              e.currentTarget.parentElement?.classList.add('preview-error')
            }}
          />
          {deletingFiles.has(file.id) && (
            <div className="file-deleting-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      )
    } else if (isVideoFile(file.type)) {
      return (
        <div className="file-preview">
          <video 
            src={file.preview || file.url} 
            controls={false}
            muted
            preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              console.error('Failed to load video preview:', file.preview || file.url)
              e.currentTarget.style.display = 'none'
              e.currentTarget.parentElement?.classList.add('preview-error')
            }}
          />
          {deletingFiles.has(file.id) && (
            <div className="file-deleting-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div className="file-icon">
          {renderFileIcon(file.type)}
          {deletingFiles.has(file.id) && (
            <div className="file-deleting-overlay">
              <div className="loading-spinner"></div>
            </div>
          )}
        </div>
      )
    }
  }

  const renderFileIcon = (type: string) => {
    const iconType = getFileIcon(type)
    
    switch (iconType) {
      case 'video':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        )
      case 'pdf':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            <path d="M9,13H16V14H9V13M9,16H14V17H9V16"/>
          </svg>
        )
      case 'text':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            <path d="M8,12H16V13H8V12M8,15H13V16H8V15"/>
          </svg>
        )
      case 'word':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            <path d="M8,12L10,17L12,12L14,17L16,12"/>
          </svg>
        )
      case 'excel':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            <path d="M8,12L12,16M12,12L8,16M16,12V16"/>
          </svg>
        )
      case 'powerpoint':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            <path d="M8,12H12V16H8V12M8,12V10H12"/>
          </svg>
        )
      case 'archive':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="21,8 21,21 3,21 3,8"/>
            <rect x="1" y="3" width="22" height="5"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
          </svg>
        )
    }
  }

  return (
    <div className="file-upload-container">
      {/* Upload Area */}
      <div
        className={`file-upload-area ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        
        <div className="upload-content">
          {isUploading ? (
            <div className="upload-loading">
              <div className="loading-spinner"></div>
              <p>{t('uploading')}</p>
            </div>
          ) : (
            <>
              <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <p className="upload-text">
                {isDragging ? t('dragDropFile') : t('dragDropFile')}
              </p>
              <p className="upload-subtext">
                {t('supportImageVideo')} • 
                {t('maxFileSize')} • 
                {t('filesRemaining').replace('{count}', (maxFiles - uploadedFiles.length).toString())}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="upload-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="uploaded-files">
          <h4>{t('uploadedFiles')} ({uploadedFiles.length}/{maxFiles})</h4>
          <div className="files-grid">
            {uploadedFiles.map((file) => (
              <div key={file.id} className={`file-item ${deletingFiles.has(file.id) ? 'deleting' : ''}`}>
                {renderFilePreview(file)}
                
                <div className="file-info">
                  <p className="file-name" title={file.name}>
                    {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                  </p>
                  <p className="file-size">{formatFileSize(file.size)}</p>
                  {isDangerousFile(file.type, file.name) && (
                    <p className="file-warning">⚠️ File có thể nguy hiểm</p>
                  )}
                </div>
                
                <button
                  className="remove-file-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('🖱️ Delete button clicked for file:', file.id)
                    handleRemoveFile(file)
                  }}
                  title={t('removeFile')}
                  disabled={deletingFiles.has(file.id)}
                >
                  {deletingFiles.has(file.id) ? (
                    <div className="loading-spinner-small"></div>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19,6V20A2,2 0 0,1 17,22H7A2,2 0 0,1 5,20V6M8,6V4A2,2 0 0,1 10,2H14A2,2 0 0,1 16,4V6"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload 
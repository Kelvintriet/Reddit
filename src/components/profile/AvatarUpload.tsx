import React, { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { uploadAvatar, SUPPORTED_IMAGE_TYPES, MAX_AVATAR_SIZE, formatFileSize } from '../../services/appwrite/storage'
import type { UploadedFile } from '../../services/appwrite/storage'

interface AvatarUploadProps {
  currentAvatar?: string
  onAvatarChange: (avatarUrl: string) => void
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onAvatarChange,
  size = 'medium',
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    small: 'w-12 h-12',
    medium: 'w-20 h-20',
    large: 'w-32 h-32'
  }

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_AVATAR_SIZE) {
      return `File quá lớn. Kích thước tối đa là ${formatFileSize(MAX_AVATAR_SIZE)}.`
    }
    
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      return 'Chỉ hỗ trợ file ảnh (JPEG, PNG, WebP, GIF).'
    }
    
    return null
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsUploading(true)

    try {
      // Create preview
      const preview = URL.createObjectURL(file)
      setPreviewUrl(preview)

      // Upload to Appwrite
      const uploadedFile: UploadedFile = await uploadAvatar(file)
      
      // Update avatar
      onAvatarChange(uploadedFile.url)
      
      // Clean up preview
      URL.revokeObjectURL(preview)
      setPreviewUrl(null)
    } catch (error) {
      console.error('Avatar upload failed:', error)
      setError(error instanceof Error ? error.message : 'Lỗi khi upload avatar')
      
      // Clean up preview on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    } finally {
      setIsUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <div className="avatar-upload-container">
      <div className="avatar-upload-wrapper">
        <div className={`avatar-upload ${sizeClasses[size]} ${disabled ? 'disabled' : ''}`}>
          {/* Current Avatar or Preview */}
          <div className="avatar-display">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Avatar preview"
                className="avatar-image"
              />
            ) : currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Current avatar"
                className="avatar-image"
              />
            ) : (
              <div className="avatar-placeholder">
                <Camera className="avatar-placeholder-icon" />
              </div>
            )}
          </div>

          {/* Upload Overlay */}
          <div className="avatar-overlay" onClick={openFileDialog}>
            {isUploading ? (
              <Loader2 className="avatar-overlay-icon spinning" />
            ) : (
              <Upload className="avatar-overlay-icon" />
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_IMAGE_TYPES.join(',')}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            disabled={disabled || isUploading}
          />
        </div>

        {/* Upload Text */}
        <div className="avatar-upload-text">
          <p className="avatar-upload-label">
            {isUploading ? 'Đang upload...' : 'Thay đổi avatar'}
          </p>
          <p className="avatar-upload-hint">
            Tối đa {formatFileSize(MAX_AVATAR_SIZE)} • JPG, PNG, WebP, GIF
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="avatar-upload-error">
          <span>{error}</span>
          <button onClick={clearError} className="error-close-btn">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default AvatarUpload 
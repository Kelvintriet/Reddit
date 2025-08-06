import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { updateUserProfile, getUserProfile } from '../collections/users'
import { getCurrentLocation, getCountryFlag, getCurrentTimeForLocation, refreshLocationData, getRemainingRefreshCount, canRefreshLocation, getLocationWithAutoFetch } from '../services/location'
import { uploadAvatar } from '../services/appwrite/storage'

const Settings = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form states
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [hideProfile, setHideProfile] = useState(false)
  const [hidePosts, setHidePosts] = useState(false)
  const [hideComments, setHideComments] = useState(false)
  const [showLocation, setShowLocation] = useState(true)
  const [currentLocation, setCurrentLocation] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const [remainingRefresh, setRemainingRefresh] = useState(15)
  
  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  
  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    
    // Load user data
    const loadUserData = async () => {
      try {
        const userProfile = await getUserProfile(user.uid)
        if (userProfile) {
          setDisplayName(userProfile.displayName || '')
          setUsername(userProfile.username || '')
          setBio(userProfile.bio || '')
          setHideProfile(userProfile.hideProfile || false)
          setHidePosts(userProfile.hidePosts || false)
          setHideComments(userProfile.hideComments || false)
          setShowLocation(userProfile.showLocation !== false)
          setAvatarUrl(userProfile.avatarUrl || '')
        }
        
        // Load cached location (auto-fetch lần đầu nếu cần)
        const location = await getLocationWithAutoFetch()
        setCurrentLocation(location)
        
        // Update remaining refresh count
        setRemainingRefresh(getRemainingRefreshCount())
      } catch (error) {
        // Silent error handling
      }
    }
    
    loadUserData()
  }, [user, navigate])
  
  const handleRefreshLocation = async () => {
    if (!canRefreshLocation()) {
      setRefreshError(`Bạn đã hết lượt refresh hôm nay. Còn lại: ${getRemainingRefreshCount()}/15`)
      return
    }
    
    setIsRefreshing(true)
    setRefreshError('')
    
    try {
      const newLocation = await refreshLocationData()
      setCurrentLocation(newLocation)
      setRemainingRefresh(getRemainingRefreshCount())
      
      if (newLocation) {
        setSuccess('Vị trí đã được cập nhật thành công!')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error: any) {
      setRefreshError(error.message || 'Không thể cập nhật vị trí')
    } finally {
      setIsRefreshing(false)
    }
  }
  
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Vui lòng chọn file ảnh (JPG, PNG, GIF, WebP)')
      return
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Kích thước file không được vượt quá 5MB')
      return
    }
    
    setAvatarUploading(true)
    setAvatarError('')
    
    try {
      const uploadedFile = await uploadAvatar(file, user.uid)
      setAvatarUrl(uploadedFile.url)
      
      // Update user profile with new avatar URL
      await updateUserProfile(user.uid, {
        avatarUrl: uploadedFile.url
      })
      
      setSuccess('Avatar đã được cập nhật thành công!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Avatar upload error:', error)
      setAvatarError(error.message || 'Có lỗi xảy ra khi upload avatar')
    } finally {
      setAvatarUploading(false)
    }
  }
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    
    try {
      await updateUserProfile(user!.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        hideProfile,
        hidePosts,
        hideComments,
        showLocation
      })
      
      setSuccess('Cài đặt đã được lưu thành công!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message || 'Có lỗi xảy ra khi lưu cài đặt')
    } finally {
      setLoading(false)
    }
  }
  
  if (!user) {
    return <div>Đang tải...</div>
  }
  
  return (
    <div className="container settings-container">
      <div className="settings-header">
        <h1>Cài đặt tài khoản</h1>
        <p>Quản lý thông tin cá nhân và quyền riêng tư của bạn</p>
      </div>
      
      <form onSubmit={handleSave} className="settings-form">
        {/* Profile Information */}
        <div className="settings-section">
          <h2>Thông tin cá nhân</h2>
          
          {/* Avatar Upload */}
          <div className="form-group">
            <label>Avatar</label>
            <div className="avatar-upload-container" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              border: '2px dashed var(--color-neutral-border)',
              borderRadius: '12px',
              backgroundColor: 'var(--color-neutral-background-weak)'
            }}>
              <div className="current-avatar" style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: 'var(--color-neutral-border-weak)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                color: 'var(--color-neutral-content-weak)'
              }}>
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span>{(displayName || user?.displayName || 'U')[0].toUpperCase()}</span>
                )}
              </div>
              
              <div className="avatar-upload-info" style={{ flex: 1 }}>
                <div style={{ marginBottom: '8px' }}>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={avatarUploading}
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="avatar-upload"
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      backgroundColor: avatarUploading ? '#ccc' : 'var(--color-reddit-orange)',
                      color: 'white',
                      borderRadius: '6px',
                      cursor: avatarUploading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {avatarUploading ? 'Đang upload...' : 'Chọn ảnh mới'}
                  </label>
                </div>
                
                <div style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
                  <p>• Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)</p>
                  <p>• Kích thước tối đa: 5MB</p>
                  <p>• Khuyến nghị: Ảnh vuông 200x200px</p>
                </div>
                
                {avatarError && (
                  <div style={{
                    color: '#dc2626',
                    fontSize: '12px',
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#fee2e2',
                    borderRadius: '4px',
                    border: '1px solid #fecaca'
                  }}>
                    {avatarError}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="displayName">Tên hiển thị</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nhập tên hiển thị của bạn"
              maxLength={50}
            />
            <small>Tên này sẽ hiển thị trên bài viết và bình luận của bạn</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="username">Tên người dùng</label>
            <input
              type="text"
              id="username"
              value={username}
              placeholder="Tên người dùng không thể thay đổi"
              maxLength={20}
              readOnly
              disabled
              style={{ 
                backgroundColor: 'var(--color-neutral-border-weak)', 
                color: 'var(--color-neutral-content-weak)',
                cursor: 'not-allowed'
              }}
            />
            <small>Tên người dùng không thể thay đổi sau khi tạo tài khoản</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="bio">Giới thiệu bản thân</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Viết vài dòng về bản thân..."
              maxLength={200}
              rows={4}
            />
            <small>{bio.length}/200 ký tự</small>
          </div>
        </div>
        
        {/* Location Settings */}
        <div className="settings-section">
          <h2>Vị trí</h2>
          
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
              />
              <span className="checkmark"></span>
              Hiển thị vị trí hiện tại
            </label>
            <small>Vị trí của bạn sẽ hiển thị bên cạnh tên trong bài viết và bình luận</small>
          </div>
          
          {currentLocation && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label>Vị trí hiện tại</label>
                <button
                  type="button"
                  onClick={handleRefreshLocation}
                  disabled={isRefreshing || !canRefreshLocation()}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    backgroundColor: isRefreshing ? '#ccc' : 'var(--color-reddit-orange)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isRefreshing || !canRefreshLocation() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isRefreshing ? (
                    <>⟳ Đang cập nhật...</>
                  ) : (
                    <>🔄 Refresh ({remainingRefresh}/15)</>
                  )}
                </button>
              </div>
              
              {refreshError && (
                <div style={{
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '4px',
                  border: '1px solid #fecaca'
                }}>
                  {refreshError}
                </div>
              )}
              
              <div style={{ 
                padding: '12px 16px', 
                backgroundColor: 'var(--color-neutral-background-weak)', 
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>
                    {getCountryFlag(currentLocation.country_code)}
                  </span>
                  <span style={{ fontWeight: '600' }}>{currentLocation.country}</span>
                  <span style={{ 
                    backgroundColor: 'var(--color-reddit-orange)', 
                    color: 'white', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {currentLocation.country_code}
                  </span>
                  <span style={{ 
                    backgroundColor: 'var(--color-neutral-border)', 
                    color: 'var(--color-neutral-content)', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {currentLocation.continent_code}
                  </span>
                </div>
                
                {(currentLocation.region || currentLocation.city) && (
                  <div style={{ 
                    color: 'var(--color-neutral-content-weak)', 
                    fontSize: '0.9rem',
                    paddingLeft: '32px'
                  }}>
                    {currentLocation.region && currentLocation.city 
                      ? `${currentLocation.region}, ${currentLocation.city}`
                      : currentLocation.region || currentLocation.city
                    }
                  </div>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  paddingLeft: '32px',
                  color: 'var(--color-neutral-content-weak)',
                  fontSize: '0.85rem'
                }}>
                  <span>🕐</span>
                  <span>{getCurrentTimeForLocation(currentLocation)}</span>
                  <span>•</span>
                  <span>{currentLocation.timezone}</span>
                  <span>•</span>
                  <span>{currentLocation.isp}</span>
                </div>
              </div>
              <small>Vị trí được xác định tự động dựa trên địa chỉ IP của bạn. Bạn có {remainingRefresh} lượt refresh còn lại hôm nay.</small>
            </div>
          )}
        </div>
        
        {/* Privacy Settings */}
        <div className="settings-section">
          <h2>Quyền riêng tư</h2>
          
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={hideProfile}
                onChange={(e) => setHideProfile(e.target.checked)}
              />
              <span className="checkmark"></span>
              Ẩn hồ sơ cá nhân
            </label>
            <small>Người khác sẽ không thể xem trang hồ sơ của bạn</small>
          </div>
          
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={hidePosts}
                onChange={(e) => setHidePosts(e.target.checked)}
              />
              <span className="checkmark"></span>
              Ẩn bài viết
            </label>
            <small>Bài viết của bạn sẽ không hiển thị trong hồ sơ công khai</small>
          </div>
          
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={hideComments}
                onChange={(e) => setHideComments(e.target.checked)}
              />
              <span className="checkmark"></span>
              Ẩn bình luận
            </label>
            <small>Bình luận của bạn sẽ không hiển thị trong hồ sơ công khai</small>
          </div>
        </div>
        
        {/* Messages */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}
        
        {/* Actions */}
        <div className="settings-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Settings 
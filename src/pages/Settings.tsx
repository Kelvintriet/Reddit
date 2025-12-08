import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store'
import { useLanguageStore } from '../store/useLanguageStore'
import { updateUserProfile, getUserProfile, searchUsersByPartialName } from '../collections/users'
import { getCountryFlag, getCurrentTimeForLocation, refreshLocationData, getRemainingRefreshCount, canRefreshLocation, getLocationWithAutoFetch } from '../services/location'
import { uploadAvatar } from '../services/appwrite/storage'

const Settings = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { setLanguage, t } = useLanguageStore()
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
  const [selectedLanguage, setSelectedLanguage] = useState<'vi' | 'en'>('vi')

  // Inbox privacy settings
  const [allowMessageSearch, setAllowMessageSearch] = useState(true)
  const [allowMessagesFrom, setAllowMessagesFrom] = useState<'everyone' | 'specific' | 'nobody'>('everyone')
  const [allowedMessageUsers, setAllowedMessageUsers] = useState<string[]>([])
  const [userInputValue, setUserInputValue] = useState('')
  const [userSuggestions, setUserSuggestions] = useState<any[]>([])
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
          setAllowMessageSearch(userProfile.allowMessageSearch !== false)
          setAllowMessagesFrom(userProfile.allowMessagesFrom || 'everyone')
          setAllowedMessageUsers(userProfile.allowedMessageUsers || [])
          setSelectedLanguage(userProfile.language || 'vi')
          setLanguage(userProfile.language || 'vi')
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
      const uploadedFile = await uploadAvatar(file)
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

  // Handle user input change for whitelist
  const handleUserInputChange = async (value: string) => {
    setUserInputValue(value)

    if (value.trim().length < 2) {
      setUserSuggestions([])
      return
    }

    try {
      const results = await searchUsersByPartialName(value.trim(), 5)
      setUserSuggestions(results)
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  // Add user to whitelist
  const handleAddUser = (userId: string, _username: string) => {
    if (!allowedMessageUsers.includes(userId)) {
      setAllowedMessageUsers([...allowedMessageUsers, userId])
    }
    setUserInputValue('')
    setUserSuggestions([])
  }

  // Remove user from whitelist
  const handleRemoveUser = (userId: string) => {
    setAllowedMessageUsers(allowedMessageUsers.filter(id => id !== userId))
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
        showLocation,
        allowMessageSearch,
        allowMessagesFrom,
        allowedMessageUsers,
        language: selectedLanguage
      })

      setLanguage(selectedLanguage)
      setSuccess(t('success'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      setError(error.message || t('error'))
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
        <h1>{t('accountSettings')}</h1>
        <p>{t('manageInfo')}</p>
      </div>

      <form onSubmit={handleSave} className="settings-form">
        {/* Language Settings */}
        <div className="settings-section">
          <h2>{t('language')}</h2>
          <div className="form-group">
            <label>{t('languageDesc')}</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as 'vi' | 'en')}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--color-neutral-border)',
                width: '100%',
                maxWidth: '300px',
                backgroundColor: 'var(--color-neutral-background)',
                color: 'var(--color-neutral-content)'
              }}
            >
              <option value="vi">{t('vietnamese')}</option>
              <option value="en">{t('english')}</option>
            </select>
          </div>
        </div>

        {/* Profile Information */}
        <div className="settings-section">
          <h2>{t('personalInfo')}</h2>

          {/* Avatar Upload */}
          <div className="form-group">
            <label>{t('avatar')}</label>
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
                    {avatarUploading ? t('uploading') : t('chooseNewImage')}
                  </label>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
                  <p>• {t('imageRequirements')}</p>
                  <p>• {t('maxSize')}</p>
                  <p>• {t('recommendation')}</p>
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
            <label htmlFor="displayName">{t('displayName')}</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('enterDisplayName')}
              maxLength={50}
            />
            <small>{t('displayNameDesc')}</small>
          </div>

          <div className="form-group">
            <label htmlFor="username">{t('username')}</label>
            <input
              type="text"
              id="username"
              value={username}
              placeholder={t('usernameDesc')}
              maxLength={20}
              readOnly
              disabled
              style={{
                backgroundColor: 'var(--color-neutral-border-weak)',
                color: 'var(--color-neutral-content-weak)',
                cursor: 'not-allowed'
              }}
            />
            <small>{t('usernameDesc')}</small>
          </div>

          <div className="form-group">
            <label htmlFor="bio">{t('bio')}</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('enterBio')}
              maxLength={200}
              rows={4}
            />
            <small>{bio.length}/200 ký tự</small>
          </div>
        </div>

        {/* Location Settings */}
        <div className="settings-section">
          <h2>{t('location')}</h2>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={showLocation}
                onChange={(e) => setShowLocation(e.target.checked)}
              />
              <span className="checkmark"></span>
              {t('showLocation')}
            </label>
            <small>{t('locationDesc')}</small>
          </div>

          {currentLocation && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label>{t('currentLocation')}</label>
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
                    <>⟳ {t('refreshing')}</>
                  ) : (
                    <>🔄 {t('refresh')} ({remainingRefresh}/15)</>
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
              <small>{t('locationAuto')} {t('refresh')} ({remainingRefresh}/15)</small>
            </div>
          )}
        </div>

        {/* Privacy Settings */}
        <div className="settings-section">
          <h2>{t('privacy')}</h2>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={hideProfile}
                onChange={(e) => setHideProfile(e.target.checked)}
              />
              <span className="checkmark"></span>
              {t('hideProfile')}
            </label>
            <small>{t('hideProfileDesc')}</small>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={hidePosts}
                onChange={(e) => setHidePosts(e.target.checked)}
              />
              <span className="checkmark"></span>
              {t('hidePosts')}
            </label>
            <small>{t('hidePostsDesc')}</small>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={hideComments}
                onChange={(e) => setHideComments(e.target.checked)}
              />
              <span className="checkmark"></span>
              {t('hideComments')}
            </label>
            <small>{t('hideCommentsDesc')}</small>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={allowMessageSearch}
                onChange={(e) => setAllowMessageSearch(e.target.checked)}
              />
              <span className="checkmark"></span>
              {t('allowSearch')}
            </label>
            <small>{t('allowSearchDesc')}</small>
          </div>

          <div className="form-group">
            <label>{t('whoCanMessage')}</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name="allowMessagesFrom"
                  value="everyone"
                  checked={allowMessagesFrom === 'everyone'}
                  onChange={(e) => setAllowMessagesFrom(e.target.value as 'everyone' | 'specific' | 'nobody')}
                />
                {t('everyone')}
              </label>
              <label>
                <input
                  type="radio"
                  name="allowMessagesFrom"
                  value="specific"
                  checked={allowMessagesFrom === 'specific'}
                  onChange={(e) => setAllowMessagesFrom(e.target.value as 'everyone' | 'specific' | 'nobody')}
                />
                {t('specificPeople')}
              </label>
              <label>
                <input
                  type="radio"
                  name="allowMessagesFrom"
                  value="nobody"
                  checked={allowMessagesFrom === 'nobody'}
                  onChange={(e) => setAllowMessagesFrom(e.target.value as 'everyone' | 'specific' | 'nobody')}
                />
                {t('noOne')}
              </label>
            </div>
            <small>{t('messageControl')}</small>

            {allowMessagesFrom === 'specific' && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--color-neutral-background-weak)', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  {t('allowedUsersList')}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={userInputValue}
                    onChange={(e) => handleUserInputChange(e.target.value)}
                    placeholder={t('searchUserPlaceholder')}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-neutral-border)',
                      fontSize: '14px'
                    }}
                  />
                  {userSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid var(--color-neutral-border)',
                      borderRadius: '4px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {userSuggestions.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => handleAddUser(user.id, user.username || user.displayName)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--color-neutral-border-weak)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-neutral-background-weak)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <div style={{ fontWeight: 500 }}>@{user.atName || user.username || user.displayName}</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
                            u/{user.username || user.displayName} • ID: {user.customUID}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {allowedMessageUsers.length > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {allowedMessageUsers.map((userId) => (
                      <div
                        key={userId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          backgroundColor: 'var(--color-primary)',
                          color: 'white',
                          borderRadius: '16px',
                          fontSize: '13px'
                        }}
                      >
                        <span>{userId}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveUser(userId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <small style={{ display: 'block', marginTop: '8px', color: 'var(--color-neutral-content-weak)' }}>
                  {t('allowedUsersNote')}
                </small>
              </div>
            )}
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
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? t('saving') : t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Settings 
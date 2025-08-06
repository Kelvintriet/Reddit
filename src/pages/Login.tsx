import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const { signIn, signInWithGoogle, error, isLoading, clearError } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Lấy đường dẫn redirect từ query params (nếu có)
  const from = new URLSearchParams(location.search).get('redirect') || '/'
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      return
    }
    
    try {
      clearError()
      await signIn(email, password)
      navigate(from)
    } catch (err) {
      // Error handled by store
    }
  }

  const handleGoogleLogin = async () => {
    try {
      clearError()
      await signInWithGoogle()
      navigate(from)
    } catch (err) {
      // Error handled by store
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      navigate('/')
    }
  }

  const handleClose = () => {
    navigate('/')
  }
  
  return (
    <div className="auth-page">
    <div className="auth-modal-backdrop" onClick={handleBackdropClick}>
      <div className="auth-modal">
        <button className="auth-modal-close" onClick={handleClose}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="auth-modal-header">
          <h1 className="auth-modal-title">Log In</h1>
          <p className="auth-modal-subtitle">
            By continuing, you agree to our <a href="#" className="auth-link">User Agreement</a> and acknowledge that you understand the <a href="#" className="auth-link">Privacy Policy</a>.
          </p>
        </div>
        
        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {/* Social Login Buttons */}
        <div className="auth-social-buttons">
          <button className="auth-social-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
            Continue With Phone Number
          </button>
          
          <button 
            className="auth-social-button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isLoading ? 'Connecting...' : 'Continue with Google'}
          </button>
          
          <button className="auth-social-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
            </svg>
            Continue With Apple
          </button>
        </div>

        <div className="auth-divider">
          <span>OR</span>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="Email or username *"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="auth-form-group">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="Password *"
              disabled={isLoading}
              required
            />
          </div>

          <div className="auth-forgot-password">
            <Link to="/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>
          
          <button
            type="submit"
            className="auth-submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
        
        <div className="auth-footer">
          <span>New to Reddit? </span>
          <Link to="/register" className="auth-link">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login 
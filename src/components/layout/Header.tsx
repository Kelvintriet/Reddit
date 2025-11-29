import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useThemeStore } from '../../store';
import { useMessagesStore } from '../../store/useMessagesStore';
import AuthModal from '../auth/AuthModal';

const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'signup' | null>(null);
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { unreadCount, subscribeToMessages, unsubscribeFromMessages } = useMessagesStore();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Kiểm tra hash URL để hiển thị modal đăng nhập/đăng ký
  useEffect(() => {
    if (location.hash === '#login') {
      setShowAuthModal('login');
    } else if (location.hash === '#signup') {
      setShowAuthModal('signup');
    } else {
      setShowAuthModal(null);
    }
  }, [location.hash]);

  // Subscribe to messages
  useEffect(() => {
    if (user) {
      subscribeToMessages(user.uid);
    } else {
      unsubscribeFromMessages();
    }

    return () => {
      unsubscribeFromMessages();
    };
  }, [user, subscribeToMessages, unsubscribeFromMessages]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogin = () => {
    // Thêm hash vào URL hiện tại
    navigate(`${location.pathname}#login`);
  };

  const handleSignup = () => {
    // Thêm hash vào URL hiện tại
    navigate(`${location.pathname}#signup`);
  };

  const handleCloseAuthModal = () => {
    // Xóa hash khỏi URL
    navigate(location.pathname);
  };

  return (
    <>
      <header className="reddit-header">
        <div className="reddit-header-container">
          {/* Logo với thiết kế mới */}
          <Link to="/home" className="reddit-logo">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Reddit head */}
              <circle cx="16" cy="16" r="15" fill="#FF4500" />

              {/* Eyes */}
              <circle cx="11" cy="12" r="2.5" fill="white" />
              <circle cx="21" cy="12" r="2.5" fill="white" />
              <circle cx="11" cy="12" r="1.2" fill="#FF4500" />
              <circle cx="21" cy="12" r="1.2" fill="#FF4500" />

              {/* Mouth */}
              <path d="M8 20c0 4.4 3.6 6 8 6s8-1.6 8-6" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />

              {/* Antenna */}
              <circle cx="16" cy="4" r="1.5" fill="white" />
              <line x1="16" y1="5.5" x2="16" y2="8" stroke="white" strokeWidth="1.5" />
            </svg>
            <span>reddit</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="reddit-search">
            <div className="reddit-search-container">
              <svg className="reddit-search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Tìm kiếm trên Reddit"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="reddit-search-input"
              />
            </div>
          </form>

          {/* Navigation */}
          <nav className="reddit-nav">
            {/* Quick Links */}
            <div className="reddit-quick-links">
              <Link to="/home" className="reddit-quick-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.1L1 12h3v9h6v-6h4v6h6v-9h3L12 2.1z" />
                </svg>
                Trang chủ
              </Link>
              <Link to="/subexplore" className="reddit-quick-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                </svg>
                Khám phá
              </Link>
            </div>

            {/* Theme Toggle */}
            <button
              className="reddit-nav-icon"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-neutral-content)', padding: '8px' }}
            >
              {theme === 'light' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="5" fill="currentColor"/>
                  <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </button>

            {user ? (
              // Authenticated Navigation
              <div className="reddit-nav-auth">
                {/* Create Button */}
                <Link to="/submit" className="reddit-create-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Tạo
                </Link>

                {/* Messages / Inbox */}
                <Link to="/inbox" className="reddit-nav-icon" title="Hộp thư">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="reddit-notification-badge">{unreadCount}</span>
                  )}
                </Link>

                {/* User Menu */}
                <div className="reddit-user-menu" ref={menuRef}>
                  <button
                    className="reddit-user-button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                  >
                    <div className="reddit-user-avatar">
                      {user.avatarUrl || user.photoURL ? (
                        <img src={user.avatarUrl || user.photoURL || undefined} alt={user.username || user.displayName || 'User'} />
                      ) : (
                        <div className="reddit-user-avatar-placeholder">
                          {((user.username || user.displayName || 'U') + '').charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="reddit-user-info">
                      <span className="reddit-username">
                        {user.atName ? `@${user.atName}` : user.username || user.displayName || 'Người dùng'}
                      </span>
                      <span className="reddit-karma">
                        {user.customUID ? `ID: ${user.customUID}` : `${user.karma || 0} karma`}
                      </span>
                    </div>
                    <svg className="reddit-dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="reddit-user-dropdown">
                      <div className="reddit-dropdown-section">
                        <button
                          className="reddit-dropdown-item"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate(`/u/${user.uid}`);
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                          Xem hồ sơ
                        </button>
                        <button
                          className="reddit-dropdown-item"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate('/settings');
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
                          </svg>
                          Cài đặt
                        </button>
                      </div>
                      <hr className="reddit-dropdown-divider" />
                      <div className="reddit-dropdown-section">
                        <button
                          className="reddit-dropdown-item reddit-logout-btn"
                          onClick={() => {
                            setShowUserMenu(false);
                            handleLogout();
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                          </svg>
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Guest Navigation
              <div className="reddit-nav-guest">
                <button
                  onClick={handleLogin}
                  className="reddit-btn reddit-btn-outline"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={handleSignup}
                  className="reddit-btn reddit-btn-filled"
                >
                  Đăng ký
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Auth Modal */}
      {showAuthModal === 'login' && (
        <AuthModal mode="login" onClose={handleCloseAuthModal} />
      )}
      {showAuthModal === 'signup' && (
        <AuthModal mode="signup" onClose={handleCloseAuthModal} />
      )}
    </>
  );
};

export default Header; 
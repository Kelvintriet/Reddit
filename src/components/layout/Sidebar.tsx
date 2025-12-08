import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import JoinedCommunities from '../sidebar/JoinedCommunities';
import { useLanguageStore } from '../../store/useLanguageStore';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const subreddit = location.pathname.split('/')[2];
  const { t } = useLanguageStore();
  
  return (
    <aside className="sidebar">
      {/* Main Navigation */}
      <div className="sidebar-section">
        <h3>{t('topics')}</h3>
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/home" className={`nav-link ${pathname === '/home' ? 'active' : ''}`}>
              <span className="nav-icon-sidebar">🏠</span>
              <span>{t('home')}</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/r/popular" className={`nav-link ${subreddit === 'popular' ? 'active' : ''}`}>
              <span className="nav-icon-sidebar">🔥</span>
              <span>{t('popular')}</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/r/trending" className={`nav-link ${subreddit === 'trending' ? 'active' : ''}`}>
              <span className="nav-icon-sidebar">📈</span>
              <span>{t('trending')}</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/answers" 
              className={`nav-link ${pathname === '/answers' ? 'active' : ''}`}
            >
              <svg className="nav-icon-sidebar" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="currentColor"/>
                <circle cx="10" cy="7" r="1" fill="currentColor"/>
                <path d="M10 9v4h1v-4h-1z" fill="currentColor"/>
              </svg>
              {t('answers')}
              <span style={{
                backgroundColor: '#FF4500',
                color: 'white',
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '12px',
                marginLeft: 'auto'
              }}>BETA</span>
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/subexplore" 
              className={`nav-link ${pathname === '/subexplore' ? 'active' : ''}`}
            >
              <svg className="nav-icon-sidebar" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="currentColor"/>
                <path d="M12.5 7.5L8 10l2.5 4.5 4.5-2.5L12.5 7.5z" fill="currentColor"/>
              </svg>
              {t('explore')}
            </Link>
          </li>
          <li className="nav-item">
            <Link 
              to="/all" 
              className={`nav-link ${pathname === '/all' ? 'active' : ''}`}
            >
              <svg className="nav-icon-sidebar" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 2h16v16H2V2zm2 2v12h12V4H4z" fill="currentColor"/>
                <path d="M6 6h8v2H6V6zm0 3h8v2H6V9zm0 3h6v2H6v-2z" fill="currentColor"/>
              </svg>
              {t('all')}
          </Link>
        </li>
      </ul>
      </div>

      {/* Communities */}
      <div className="sidebar-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <h3>{t('communities')}</h3>
        </div>
        <Link to="/create-community" className="nav-link">
          <svg className="nav-icon-sidebar" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm4 9h-3v3H9v-3H6V9h3V6h2v3h3v2z" fill="currentColor"/>
          </svg>
          {t('createCommunity')}
        </Link>
      </div>

      {/* Joined Communities */}
      <JoinedCommunities />

      {/* Resources */}
      <div className="sidebar-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <h3>{t('resources')}</h3>
        </div>
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/about" className="nav-link">
              <svg className="nav-icon-sidebar" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="currentColor"/>
                <circle cx="10" cy="7" r="1" fill="currentColor"/>
                <path d="M10 9v4h1v-4h-1z" fill="currentColor"/>
              </svg>
              {t('about')}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/advertise" className="nav-link">
              <svg className="nav-icon-sidebar" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z" fill="currentColor"/>
              </svg>
              {t('advertise')}
            </Link>
          </li>
          <li className="nav-item">
            <Link to="/help" className="nav-link">
              <svg className="nav-icon-sidebar" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 14c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z" fill="currentColor"/>
                <path d="M10 6c-1.1 0-2 .9-2 2h1c0-.6.4-1 1-1s1 .4 1 1c0 1-1.5 1.3-1.5 2.5h1c0-.8 1.5-1.2 1.5-2.5 0-1.1-.9-2-2-2z" fill="currentColor"/>
                <circle cx="10" cy="14" r="1" fill="currentColor"/>
              </svg>
              {t('help')}
            </Link>
          </li>
        </ul>
      </div>
      
      {/* Utility Section */}
      <div className="sidebar-section">
        <h3>{t('tools')}</h3>
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/rdeletepost" className={`nav-link ${pathname === '/rdeletepost' ? 'active' : ''}`}>
              <svg className="nav-icon-sidebar" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" 
                      fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {t('recentlyDeleted')}
            </Link>
          </li>
        </ul>
      </div>
      
      {/* Footer */}
      <div style={{
        padding: 'var(--space-lg) 0',
        borderTop: '1px solid var(--color-neutral-border)',
        marginTop: 'var(--space-xl)',
        fontSize: 'var(--font-size-small)',
        color: 'var(--color-neutral-content-weak)',
        lineHeight: '1.4'
      }}>
        <div style={{ marginBottom: 'var(--space-sm)' }}>
          <Link to="/rules" style={{ marginRight: 'var(--space-sm)' }}>{t('rules')}</Link>
          <Link to="/privacy" style={{ marginRight: 'var(--space-sm)' }}>{t('privacy')}</Link>
          <Link to="/user-agreement">{t('userAgreement')}</Link>
        </div>
        <div>
          {t('copyright')}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 
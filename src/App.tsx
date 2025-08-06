import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store'
import { Layout } from './components'
import { useBotMonitoring } from './hooks/useBotMonitoring'
import CreateSubredditForm from './components/subreddit/CreateSubredditForm'
import OnboardingModal from './components/onboarding/OnboardingModal'
import { Home, Login, Register, PostDetail, CreatePost, Profile, Subreddits, SubredditDetail, Popular, Trending, NotFound, SubExplore, Settings, Search } from './pages'
import RecentlyDeleted from './pages/RecentlyDeleted'
import SubredditSettings from './pages/SubredditSettings'
import Inbox from './pages/Inbox'
import ComposeMessage from './pages/ComposeMessage'
import MessageDetail from './pages/MessageDetail'
import Conversation from './pages/Conversation'
import BotDocumentation from './pages/BotDocumentation'

function App() {
  const { isInitialized, initializeAuth, showOnboarding, user, completeOnboarding } = useAuthStore()

  // Start bot monitoring system
  useBotMonitoring()

  // Initialize auth when app starts
  useEffect(() => {
    const unsubscribe = initializeAuth()
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [initializeAuth])

  // Show loading spinner while initializing auth
  if (!isInitialized) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-spinner">
          <svg width="40" height="40" viewBox="0 0 50 50">
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="#FF4500"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="31.416"
              strokeDashoffset="31.416"
              style={{
                animation: 'dash 2s ease-in-out infinite'
              }}
            />
          </svg>
        </div>
        <p className="auth-loading-text">Loading Reddit...</p>
      </div>
    )
  }

  return (
    <>
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/" element={<Layout />}>
          <Route path="home" element={<Home />} />
            <Route path="r/popular" element={<Popular />} />
            <Route path="r/trending" element={<Trending />} />
            <Route path="r/:subreddit" element={<SubredditDetail />} />
            <Route path="r/:subreddit/edit" element={<SubredditSettings />} />
          <Route path="r/:subreddit/post/:postId" element={<PostDetail />} />
          <Route path="post/:postId" element={<PostDetail />} />
          <Route path="u/:userId" element={<Profile />} />
          <Route path="u/:userId/post/:postId" element={<PostDetail />} />
          <Route path="submit" element={<CreatePost />} />
          <Route path="edit-post/:postId/:token" element={<CreatePost />} />
          <Route path="r/:subreddit/submit" element={<CreatePost />} />
          <Route path="create-community" element={<CreateSubredditForm />} />
          <Route path="communities" element={<Subreddits />} />
          <Route path="explore" element={<Navigate to="/subexplore" replace />} />
          <Route path="subexplore" element={<SubExplore />} />
            <Route path="settings" element={<Settings />} />
            <Route path="search" element={<Search />} />
            <Route path="rdeletepost" element={<RecentlyDeleted />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="compose" element={<ComposeMessage />} />
            <Route path="message/:messageId" element={<MessageDetail />} />
            <Route path="conversation/:userId" element={<Conversation />} />
            <Route path="document/subreddit/bot-code" element={<BotDocumentation />} />
            <Route path="document/subreddit/bot-code/:topic/:page" element={<BotDocumentation />} />
            <Route path="404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recently-deleted" element={<RecentlyDeleted />} />
      </Routes>
    </Router>

      {/* Onboarding Modal - Only show for authenticated users who haven't completed onboarding */}
      {user && showOnboarding && (
        <OnboardingModal 
          onComplete={completeOnboarding}
        />
      )}
    </>
  )
}

export default App

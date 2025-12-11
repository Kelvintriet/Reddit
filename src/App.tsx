import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useAuthStore, useThemeStore } from './store'
import { Layout } from './components'
import { CaptchaGate, CaptchaVerificationModal } from './components/auth/CaptchaVerification'

// Lazy load heavy components for faster initial load
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const CreatePost = lazy(() => import('./pages/CreatePost'))
const Profile = lazy(() => import('./pages/Profile'))
const Subreddits = lazy(() => import('./pages/Subreddits'))
const SubredditDetail = lazy(() => import('./pages/SubredditDetail'))
const Popular = lazy(() => import('./pages/Popular'))
const Trending = lazy(() => import('./pages/Trending'))
const NotFound = lazy(() => import('./pages/NotFound'))
const SubExplore = lazy(() => import('./pages/SubExplore'))
const Settings = lazy(() => import('./pages/Settings'))
const Search = lazy(() => import('./pages/Search'))
const RecentlyDeleted = lazy(() => import('./pages/RecentlyDeleted'))
const SubredditSettings = lazy(() => import('./pages/SubredditSettings'))
const Inbox = lazy(() => import('./pages/Inbox'))
const Changelog = lazy(() => import('./pages/Changelog'))
const ChangelogCreate = lazy(() => import('./pages/ChangelogCreate'))
const Feedback = lazy(() => import('./pages/Feedback'))
const FeedbackPostDetail = lazy(() => import('./pages/FeedbackPostDetail'))
const Notifications = lazy(() => import('./pages/Notifications'))
const CreateSubredditForm = lazy(() => import('./components/subreddit/CreateSubredditForm'))
const OnboardingModal = lazy(() => import('./components/onboarding/OnboardingModal'))

// Simple loading fallback
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#888' }}>
    loading...
  </div>
)

function App() {
  const { initializeAuth, showOnboarding, user, completeOnboarding } = useAuthStore()
  const { theme } = useThemeStore()

  // Apply theme to document body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Initialize auth in background - don't block render
  useEffect(() => {
    const unsubscribe = initializeAuth()
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [initializeAuth])

  return (
    <CaptchaGate>
      <Router>
        <Suspense fallback={<PageLoader />}>
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
              <Route path="notifications" element={<Notifications />} />
              <Route path="changelog" element={<Changelog />} />
              <Route path="changelog/create" element={<ChangelogCreate />} />
              <Route path="r/feedback" element={<Feedback />} />
              <Route path="r/feedback/post/:postId" element={<FeedbackPostDetail />} />
              <Route path="404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/recently-deleted" element={<RecentlyDeleted />} />
          </Routes>
        </Suspense>

        {/* Hidden iframe to keep server alive */}
        <iframe
          src="https://server.reddit.koolname.asia"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
            border: 'none'
          }}
          title="Server keepalive"
          aria-hidden="true"
        />
      </Router>

      {/* CAPTCHA Verification Modal */}
      <CaptchaVerificationModal />

      {/* Onboarding Modal - Only show for authenticated users who haven't completed onboarding */}
      {user && showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal onComplete={completeOnboarding} />
        </Suspense>
      )}
    </CaptchaGate>
  )
}

export default App

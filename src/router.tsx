import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'

// Lazy loading các components
const Layout = lazy(() => import('./components/Layout'))
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const PostDetail = lazy(() => import('./pages/PostDetail'))
const CreatePost = lazy(() => import('./pages/CreatePost'))
const Profile = lazy(() => import('./pages/Profile'))
const Subreddits = lazy(() => import('./pages/Subreddits'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Loading Fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
)

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore()
  
  if (isLoading) {
    return <LoadingFallback />
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

// Router Configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <Layout />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'login',
        element: <Login />
      },
      {
        path: 'register',
        element: <Register />
      },
      {
        path: 'post/:id',
        element: <PostDetail />
      },
      {
        path: 'create-post',
        element: (
          <ProtectedRoute>
            <CreatePost />
          </ProtectedRoute>
        )
      },
      {
        path: 'u/:id',
        element: <Profile />
      },
      {
        path: 'subreddits',
        element: <Subreddits />
      },
      {
        path: 'r/:subreddit',
        element: <Home />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  }
])

// Router Component
export const Router = () => {
  return <RouterProvider router={router} />
}

export default Router 
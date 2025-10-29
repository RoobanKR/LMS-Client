'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { toast } from "react-toastify"
import { showSuccessToast } from '@/components/ui/toastUtils'

interface JwtPayload {
  exp: number;
  iat: number;
  id?: string;
  [key: string]: any;
}

function AuthWrapper({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, verifyToken, clearToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/']

  useEffect(() => {
    // Show welcome toast only once after login
    const showWelcomeToast = localStorage.getItem("showWelcomeToast")
    if (showWelcomeToast) {
      const userData = JSON.parse(localStorage.getItem("userData") || "{}")
      showSuccessToast(`Welcome back, ${userData.firstName || "Admin"}!`)
      localStorage.removeItem("showWelcomeToast")
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Skip auth check for public routes
        if (publicRoutes.includes(pathname)) {
          setIsLoading(false)
          return
        }

        const isValid = await verifyToken()
        
        if (!isValid) {
          // Clear any stale auth data
          clearToken()
          router.push('/login')
          return
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Auth check failed:', error)
        clearToken()
        router.push('/login')
      }
    }

    checkAuth()
  }, [pathname, verifyToken, clearToken, router])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // For protected routes, ensure user is authenticated
  if (!publicRoutes.includes(pathname) && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return <>{children}</>
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 15 minutes - longer cache time
        staleTime: 15 * 60 * 1000,
        // Keep data in cache for 30 minutes
        gcTime: 30 * 60 * 1000,
        // Retry failed requests once
        retry: 1,
        // Don't refetch on window focus to prevent unnecessary requests
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect unless data is stale
        refetchOnReconnect: false,
        // Don't refetch on mount if data exists and is fresh
        refetchOnMount: false,
        // Enable background refetch while data is stale
        refetchInterval: false, // We handle this manually
      },
      mutations: {
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthWrapper>
        {children}
      </AuthWrapper>
      {/* {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )} */}
    </QueryClientProvider>
  )
}
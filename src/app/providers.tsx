'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { toast } from "react-toastify"
import { showSuccessToast } from '@/components/ui/toastUtils'
import { Settings2 } from 'lucide-react'

interface Permission {
  permissionName: string;
  permissionKey: string;
  permissionFunctionality: string[];
  icon: string;
  color: string;
  description: string;
  isActive: boolean;
  order: number;
  _id: string;
}

import { getCurrentUser } from '../apiServices/tokenVerify'

// Access Restricted Component
function AccessRestricted() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mb-6">
            <div className="relative mx-auto w-48 h-48">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-4 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full"></div>
              <div className="absolute inset-8 flex items-center justify-center">
                <Settings2 className="h-16 w-16 text-gray-600" />
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-3">Access Restricted</h3>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
            Please contact your administrator for access.
          </p>

          <div className="space-y-4">
            <button
              onClick={() => window.history.back()}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go Back
            </button>

            <button
              onClick={() => window.location.href = '/lms/pages/admindashboard'}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help? Contact support at{" "}
              <a href="mailto:support@smartcliff.com" className="text-blue-600 hover:underline">
                support@smartcliff.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Fetch and update user permissions from API
const fetchAndUpdateUserPermissions = async (): Promise<boolean> => {
  try {
    const response = await getCurrentUser();

    if (response && response.user) {
      const userData = response.user;

      const existingUserDataStr = localStorage.getItem("smartcliff_userData");
      let existingUserData = existingUserDataStr ? JSON.parse(existingUserDataStr) : {};

      const updatedUserData = {
        ...existingUserData,
        ...userData,
        permissions: userData.permissions || existingUserData.permissions || []
      };

      localStorage.setItem("smartcliff_userData", JSON.stringify(updatedUserData));

      if (userData.role) {
        localStorage.setItem("smartcliff_originalRole", userData.role.originalRole || '');
        localStorage.setItem("smartcliff_roleValue", userData.role.roleValue || '');
      }

      console.log("User permissions updated successfully");
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return false;
  }
};

const getCurrentUserPermissions = (): Permission[] => {
  try {
    const userDataStr = localStorage.getItem("smartcliff_userData")
    if (!userDataStr) return []
    const userData = JSON.parse(userDataStr)
    return userData.permissions || []
  } catch (error) {
    console.error("Error parsing user permissions:", error)
    return []
  }
}

const getActivePermissionKeys = (): string[] => {
  const permissions = getCurrentUserPermissions()
  return permissions
    .filter(permission => permission.isActive)
    .map(permission => permission.permissionKey.toLowerCase())
}

const generateRoutePatterns = (permissionKey: string): string[] => {
  const key = permissionKey.toLowerCase()
  const patterns = [
    `/lms/pages/${key}`,
    `/lms/pages/${key}/*`,
    `/lms/pages/${key.replace(/management$/, '')}`,
    `/lms/pages/${key.replace(/management$/, '')}/*`,
    `/lms/pages/${key}s`,
    `/lms/pages/${key}s/*`,
  ]
  return [...new Set(patterns)]
}

const checkPermissionForPath = (path: string, permissionKey: string): boolean => {
  const patterns = generateRoutePatterns(permissionKey)
  const cleanPath = path.split('?')[0]

  for (const pattern of patterns) {
    if (pattern === cleanPath) return true

    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*').replace(/\//g, '\\/')
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(cleanPath)) return true
    }

    if (pattern.endsWith('/*')) {
      const basePath = pattern.replace('/*', '')
      if (cleanPath.startsWith(basePath)) return true
    }
  }

  return false
}

const hasPermissionForRoute = (pathname: string): { hasAccess: boolean; requiredPermission?: string } => {
  const publicRoutes = ['/login', '/lms/pages/login', '/register', '/forgot-password', '/']
  if (publicRoutes.includes(pathname)) return { hasAccess: true }

  const userRole = localStorage.getItem("smartcliff_originalRole") || ''
  const isStudent = userRole.toLowerCase().includes('student')

  if (pathname.startsWith('/lms/pages/studentdashboard')) {
    return { hasAccess: isStudent, requiredPermission: 'studentdashboard' }
  }

  if (pathname === '/lms/pages/admindashboard') {
    return { hasAccess: !isStudent, requiredPermission: 'admindashboard' }
  }

  // ── Allow the live-mcq route for all authenticated users ─────────────────
  if (pathname.includes('/courses/live-mcq/')) {
    return { hasAccess: true }
  }

  const permissionKeys = getActivePermissionKeys()

  if (permissionKeys.length === 0) return { hasAccess: false }

  for (const permissionKey of permissionKeys) {
    if (checkPermissionForPath(pathname, permissionKey)) {
      return { hasAccess: true, requiredPermission: permissionKey }
    }
  }

  const pathSegments = pathname.split('/').filter(seg => seg)
  if (pathSegments.length >= 3 && pathSegments[0] === 'lms' && pathSegments[1] === 'pages') {
    const basePermission = pathSegments[2]

    if (permissionKeys.includes(basePermission.toLowerCase())) {
      return { hasAccess: true, requiredPermission: basePermission }
    }

    const withManagement = `${basePermission}management`.toLowerCase()
    if (permissionKeys.includes(withManagement)) {
      return { hasAccess: true, requiredPermission: withManagement }
    }

    if (basePermission.endsWith('s')) {
      const singular = basePermission.slice(0, -1).toLowerCase()
      if (permissionKeys.includes(singular)) {
        return { hasAccess: true, requiredPermission: singular }
      }
    }

    if (basePermission === 'coursestructure' && permissionKeys.includes('coursemanagement')) {
      return { hasAccess: true, requiredPermission: 'coursemanagement' }
    }
  }

  return {
    hasAccess: false,
    requiredPermission: pathSegments.length >= 3 ? pathSegments[2] : 'unknown'
  }
}

// ── Helper: redirect to login and preserve the current URL ───────────────────
const redirectToLogin = (router: ReturnType<typeof useRouter>) => {
  const encoded = encodeURIComponent(window.location.href)
  router.push(`/login?redirect=${encoded}`)
}

function AuthWrapper({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, verifyToken, clearToken } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [requiredPermission, setRequiredPermission] = useState<string>('')
  const [permissionsRefreshed, setPermissionsRefreshed] = useState(false)

  // Show welcome toast only once after login
  useEffect(() => {
    const showWelcomeToast = localStorage.getItem("showWelcomeToast")
    if (showWelcomeToast) {
      const userData = JSON.parse(localStorage.getItem("smartcliff_userData") || "{}")
      showSuccessToast(`Welcome back, ${userData.firstName || "User"}!`)
      localStorage.removeItem("showWelcomeToast")
    }
  }, [])

  // Fetch and update permissions on mount
  useEffect(() => {
    const refreshPermissions = async () => {
      if (!permissionsRefreshed) {
        try {
          const success = await fetchAndUpdateUserPermissions()
          if (success) {
            setPermissionsRefreshed(true)
            console.log("Permissions refreshed from API")
          }
        } catch (error) {
          console.error("Failed to refresh permissions:", error)
        }
      }
    }

    const publicRoutes = ['/login', '/lms/pages/login', '/register', '/forgot-password', '/']
    if (!publicRoutes.includes(pathname)) {
      refreshPermissions()
    }
  }, [pathname, permissionsRefreshed])

  useEffect(() => {
    const checkAuthAndPermissions = async () => {
      setAccessDenied(false)

      try {
        const publicRoutes = ['/login', '/lms/pages/login', '/register', '/forgot-password', '/']
        if (publicRoutes.includes(pathname)) {
          setIsLoading(false)
          return
        }

        // ── No token → go to login and KEEP the current URL as ?redirect= ──
        const smartcliffToken = localStorage.getItem("smartcliff_token")
        if (!smartcliffToken) {
          clearAuthData()
          redirectToLogin(router)   // ← FIXED (was router.push('/login'))
          return
        }

        // ── Invalid token → same thing ────────────────────────────────────
        const isValid = await verifyToken()
        if (!isValid) {
          clearAuthData()
          redirectToLogin(router)   // ← FIXED (was router.push('/login'))
          return
        }

        // Check permission for current route
        const { hasAccess, requiredPermission: reqPermission } = hasPermissionForRoute(pathname)

        if (!hasAccess) {
          console.warn(`Permission denied for route: ${pathname}`)
          setRequiredPermission(reqPermission || '')
          setAccessDenied(true)
          setIsLoading(false)
          return
        }

        const originalRole = localStorage.getItem("smartcliff_originalRole") || ''
        const roleValue = localStorage.getItem("smartcliff_roleValue") || ''
        const userRole = originalRole.toLowerCase() || roleValue.toLowerCase()

        if (pathname.startsWith('/lms/pages')) {
          const isStudent = userRole.includes('student')
          const isOnStudentDashboard = pathname.includes('studentdashboard')
          const isOnAdminDashboard = pathname.includes('admindashboard')

          if (isStudent && isOnAdminDashboard) {
            router.push('/lms/pages/studentdashboard')
            return
          }

          if (!isStudent && isOnStudentDashboard) {
            router.push('/lms/pages/admindashboard')
            return
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Auth/permission check failed:', error)
        clearAuthData()
        redirectToLogin(router)     // ← FIXED (was router.push('/login'))
      }
    }

    checkAuthAndPermissions()
  }, [pathname, verifyToken, clearToken, router, permissionsRefreshed])

  const clearAuthData = () => {
    clearToken()
    localStorage.removeItem("smartcliff_token")
    localStorage.removeItem("smartcliff_originalRole")
    localStorage.removeItem("smartcliff_roleValue")
    localStorage.removeItem("smartcliff_userData")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (accessDenied) {
    return <AccessRestricted />
  }

  if (!['/login', '/lms/pages/login', '/register', '/forgot-password', '/'].includes(pathname) && !isAuthenticated) {
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
        staleTime: 15 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        refetchInterval: false,
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
    </QueryClientProvider>
  )
}
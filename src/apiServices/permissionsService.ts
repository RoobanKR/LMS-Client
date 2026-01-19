import axios from 'axios';

const API_BASE_URL = 'http://localhost:5533';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartcliff_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('smartcliff_token');
      localStorage.removeItem('smartcliff_userId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Interfaces
export interface UserPermission {
  _id: string;
  permissionName: string;
  permissionKey: string;
  permissionFunctionality: string[];
  icon: string;
  color: string;
  description: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionsResponse {
  success: boolean;
  message?: string;
  data?: {
    permissions: UserPermission[];
  };
}

export interface PermissionsCache {
  userId: string;
  permissions: UserPermission[];
  timestamp: number;
  version: number;
}

// Cache configuration
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const CACHE_VERSION = 1;
let permissionsCache: Map<string, PermissionsCache> = new Map();

// Generate cache key
const getCacheKey = (userId: string): string => `permissions_${userId}`;

// Get from cache
const getFromCache = (userId: string): UserPermission[] | null => {
  const cacheKey = getCacheKey(userId);
  const cached = permissionsCache.get(cacheKey);
  
  if (!cached) return null;
  
  // Check if cache is expired
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    permissionsCache.delete(cacheKey);
    return null;
  }
  
  return cached.permissions;
};

// Save to cache
const saveToCache = (userId: string, permissions: UserPermission[]): void => {
  const cacheKey = getCacheKey(userId);
  permissionsCache.set(cacheKey, {
    userId,
    permissions,
    timestamp: Date.now(),
    version: CACHE_VERSION,
  });
  
  // Clean up old cache entries (keep only last 5 users)
  if (permissionsCache.size > 5) {
    const oldestKey = Array.from(permissionsCache.keys())[0];
    permissionsCache.delete(oldestKey);
  }
};

// Clear specific user cache
export const clearUserPermissionCache = (userId?: string): void => {
  if (userId) {
    const cacheKey = getCacheKey(userId);
    permissionsCache.delete(cacheKey);
  } else {
    permissionsCache.clear();
  }
};

// Main API function to fetch user permissions
export const fetchUserPermissions = async (userId: string): Promise<UserPermission[]> => {
  try {
    // Check cache first
    const cachedPermissions = getFromCache(userId);
    if (cachedPermissions) {
      return cachedPermissions;
    }

    // Fetch from API
    const response = await apiClient.get<PermissionsResponse>(
      `/user/get-permission/${userId}`
    );

    if (response.data.success && response.data.data?.permissions) {
      const permissions = response.data.data.permissions;
      
      // Filter only active permissions
      const activePermissions = permissions.filter(permission => permission.isActive);
      
      // Sort by order
      activePermissions.sort((a, b) => a.order - b.order);
      
      // Save to cache
      saveToCache(userId, activePermissions);
      
      return activePermissions;
    }
    
    throw new Error(response.data.message || 'Failed to fetch permissions');
    
  } catch (error: any) {
    console.error('Error fetching user permissions:', error);
    
    // Return empty array if it's a 404 or specific errors
    if (error.response?.status === 404) {
      console.warn(`User ${userId} permissions not found`);
      return [];
    }
    
    throw error;
  }
};

// Alternative: Get permissions with fallback
export const getUserPermissionsWithFallback = async (
  userId: string, 
  fallbackPermissions: UserPermission[] = []
): Promise<UserPermission[]> => {
  try {
    return await fetchUserPermissions(userId);
  } catch (error) {
    console.warn('Using fallback permissions due to API error');
    return fallbackPermissions;
  }
};

// Check specific permission
export const hasPermission = (
  permissions: UserPermission[],
  permissionKey: string,
  functionality?: string
): boolean => {
  const permission = permissions.find(p => 
    p.permissionKey === permissionKey && p.isActive
  );
  
  if (!permission) return false;
  
  if (functionality) {
    const trimmedFunctionality = functionality.trim();
    return permission.permissionFunctionality.some(func => 
      func.trim() === trimmedFunctionality
    );
  }
  
  return true;
};

// Get specific permission
export const getPermission = (
  permissions: UserPermission[],
  permissionKey: string
): UserPermission | undefined => {
  return permissions.find(p => 
    p.permissionKey === permissionKey && p.isActive
  );
};

// Permission keys for React Query
export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: (filters: any) => [...permissionKeys.lists(), { filters }] as const,
  details: () => [...permissionKeys.all, 'detail'] as const,
  detail: (userId: string) => [...permissionKeys.details(), userId] as const,
  user: (userId: string) => [...permissionKeys.all, 'user', userId] as const,
};
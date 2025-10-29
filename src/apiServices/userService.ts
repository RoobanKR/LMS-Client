// userService.ts - Enhanced with better caching and real-time updates

import axios from 'axios';

const API_BASE_URL = 'http://localhost:5533';

// Configure axios instance with auth token
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  // No longer need to get token from localStorage here
  return config;
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // No longer need to remove token from localStorage here
    return Promise.reject(error);
  }
);

// Enhanced caching with version tracking
let usersCache: any = null;
let cacheTimestamp: number = 0;
let cacheVersion: number = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const BACKGROUND_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

// Store for tracking data changes
let lastDataHash: string = '';
let backgroundRefreshTimer: NodeJS.Timeout | null = null;

// Helper function to create a simple hash of data
const createDataHash = (data: any): string => {
  return JSON.stringify(data).length.toString() + data.length.toString();
};

// Start background refresh for live updates
const startBackgroundRefresh = (institutionId: string, token: string) => {
  if (backgroundRefreshTimer) {
    clearInterval(backgroundRefreshTimer);
  }

  backgroundRefreshTimer = setInterval(async () => {
    try {
      // Only do background refresh if we have cached data
      if (usersCache) {
        const response = await apiClient.get(`/getAll/userAccess/${institutionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const newUsers = response.data.Users;
        const newHash = createDataHash(newUsers);

        // If data changed, update cache and increment version
        if (newHash !== lastDataHash) {
          usersCache = newUsers;
          cacheTimestamp = Date.now();
          cacheVersion++;
          lastDataHash = newHash;

          // Trigger a custom event to notify components
          window.dispatchEvent(new CustomEvent('usersDataUpdated', {
            detail: { users: newUsers, version: cacheVersion }
          }));
        }
      }
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }, BACKGROUND_REFRESH_INTERVAL);
};

// Stop background refresh
const stopBackgroundRefresh = () => {
  if (backgroundRefreshTimer) {
    clearInterval(backgroundRefreshTimer);
    backgroundRefreshTimer = null;
  }
};

// Enhanced fetchUsers function
export const fetchUsers = async (institutionId: string, token: string, forceRefresh = false) => {
  const now = Date.now();

  // Return cached data if it's still valid and not forcing refresh
  if (!forceRefresh && usersCache && (now - cacheTimestamp) < CACHE_DURATION) {
    // Start background refresh if not already running
    if (!backgroundRefreshTimer) {
      startBackgroundRefresh(institutionId, token);
    }
    return { users: usersCache, version: cacheVersion, fromCache: true };
  }

  try {
    const response = await apiClient.get(`/getAll/userAccess/${institutionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const users = response.data.Users;
    const newHash = createDataHash(users);

    // Update cache
    usersCache = users;
    cacheTimestamp = now;
    lastDataHash = newHash;

    // If this is initial load or force refresh, increment version
    if (forceRefresh || !cacheVersion) {
      cacheVersion++;
    }

    // Start background refresh
    startBackgroundRefresh(institutionId, token);

    return { users, version: cacheVersion, fromCache: false };
  } catch (error) {
    // If we have cached data and the request fails, return cached data
    if (usersCache) {
      console.warn('Using cached data due to API error:', error);
      return { users: usersCache, version: cacheVersion, fromCache: true };
    }
    throw error;
  }
};

// Function to invalidate users cache
export const invalidateUsersCache = () => {
  usersCache = null;
  cacheTimestamp = 0;
  cacheVersion = 0;
  lastDataHash = '';
  stopBackgroundRefresh();
};


// Enhanced addUser function
export const addUser = async (userData: any, token: string) => {
  const formattedUserData = {
    ...userData,
    permission: {
      courseManagement: {
        create: false,
        edit: false,
        delete: false,
        report: false,
      },
      userManagement: {
        create: false,
        edit: false,
        delete: false,
        report: false,
      },
      testAccess: {
        create: false,
        edit: false,
        delete: false,
        report: false,
      },
    }
  };

  try {
    const response = await apiClient.post(
      '/add/users',
      formattedUserData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return response.data;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, userData: any, token: string) => {
  try {
    const response = await apiClient.put(
      `/update/users/${userId}`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return response.data;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string, token: string) => {
  try {
    const response = await apiClient.delete(
      `/delete/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

// Cleanup function for component unmount
export const cleanup = () => {
  stopBackgroundRefresh();
};

// Get cache info
export const getCacheInfo = () => ({
  hasCache: !!usersCache,
  cacheAge: usersCache ? Date.now() - cacheTimestamp : 0,
  version: cacheVersion
});

export const toggleUserStatus = async (userId: string, status?: 'active' | 'inactive', token?: string) => {
  try {
    const authToken = token ;
    if (!authToken) {
      throw new Error('Authentication token not found');
    }

    const response = await apiClient.put(
      `/user/status/${userId}`,
      status ? { status } : {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateUsersCache();

    return response.data;
  } catch (error) {
    console.error('Error toggling user status:', error);
    throw error;
  }
};
import axios from 'axios';

const API_BASE_URL = 'https://lms-server-ym1q.onrender.com';

// Configure axios instance with auth token
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Enhanced caching with version tracking
let rolesCache: any = null;
let cacheTimestamp: number = 0;
let cacheVersion: number = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const BACKGROUND_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

// Store for tracking data changes
let lastDataHash: string = '';
let backgroundRefreshTimer: NodeJS.Timeout | null = null;

// Helper function to create a simple hash of data


// Start background refresh for live updates
const startBackgroundRefresh = (token: string) => {
  if (backgroundRefreshTimer) {
    clearInterval(backgroundRefreshTimer);
  }

  backgroundRefreshTimer = setInterval(async () => {
    try {
      // Only do background refresh if we have cached data
      if (rolesCache) {
        const response = await apiClient.get(`/roles/getAll`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        // FIXED: Properly extract roles from backend response
        const newRoles = response.data?.getAllRoles || response.data?.Roles || response.data?.roles || [];
        const newHash = createDataHash(newRoles);

        // If data changed, update cache and increment version
        if (newHash !== lastDataHash) {
          rolesCache = newRoles;
          cacheTimestamp = Date.now();
          cacheVersion++;
          lastDataHash = newHash;

          // Trigger a custom event to notify components
          window.dispatchEvent(new CustomEvent('RolesDataUpdated', {
            detail: { roles: newRoles, version: cacheVersion }
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

// Enhanced fetchRoles function - FIXED: Return proper structure
// Helper function to create a simple hash of data - FIXED
const createDataHash = (data: any): string => {
  // Add null/undefined check
  if (!data) {
    return '0';
  }
  return JSON.stringify(data).length.toString() + (Array.isArray(data) ? data.length.toString() : '0');
};

// Enhanced fetchRoles function - FIXED: Properly extract getAllRoles
export const fetchRoles = async (token: string, forceRefresh = false) => {
  const now = Date.now();

  // Return cached data if it's still valid and not forcing refresh
  if (!forceRefresh && rolesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    // Start background refresh if not already running
    if (!backgroundRefreshTimer) {
      startBackgroundRefresh(token);
    }
    return { roles: rolesCache, version: cacheVersion, fromCache: true };
  }

  try {
    const response = await apiClient.get(`/roles/getAll`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    // Check all possible locations for roles data
    const roles = response.data?.getAllRoles || 
                  response.data?.Roles || 
                  response.data?.roles || 
                  response.data || 
                  [];
                  
       
    const newHash = createDataHash(roles);

    // Update cache
    rolesCache = roles;
    cacheTimestamp = now;
    lastDataHash = newHash;

    // If this is initial load or force refresh, increment version
    if (forceRefresh || !cacheVersion) {
      cacheVersion++;
    }

    // Start background refresh
    startBackgroundRefresh(token);

    return { roles, version: cacheVersion, fromCache: false };
  } catch (error) {
    console.error('Error fetching roles:', error);
    // If we have cached data and the request fails, return cached data
    if (rolesCache) {
      console.warn('Using cached data due to API error:', error);
      return { roles: rolesCache, version: cacheVersion, fromCache: true };
    }
    throw error;
  }
};

// Function to invalidate roles cache
export const invalidateRolesCache = () => {
  rolesCache = null;
  cacheTimestamp = 0;
  cacheVersion = 0;
  lastDataHash = '';
  stopBackgroundRefresh();
};

export const addRoles = async (roleData: any, token: string) => {
  const formattedRoleData = {
    ...roleData,
  };

  try {
    const response = await apiClient.post(
      '/roles/create',
      formattedRoleData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateRolesCache();

    return response.data;
  } catch (error) {
    console.error('Error adding role:', error);
    throw error;
  }
};

export const updateRole = async (roleId: string, roleData: any, token: string) => {
  try {
    const response = await apiClient.put(
      `/roles/update/${roleId}`,
      roleData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateRolesCache();

    return response.data;
  } catch (error) {
    console.error('Error updating role:', error);
    throw error;
  }
};

export const deleteRole = async (roleId: string, token: string) => {
  try {
    const response = await apiClient.delete(
      `/roles/delete/${roleId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    // Invalidate cache to force fresh data on next request
    invalidateRolesCache();

    return response.data;
  } catch (error) {
    console.error('Error deleting role:', error);
    throw error;
  }
};

// Cleanup function for component unmount
export const cleanup = () => {
  stopBackgroundRefresh();
};

// Get cache info
export const getCacheInfo = () => ({
  hasCache: !!rolesCache,
  cacheAge: rolesCache ? Date.now() - cacheTimestamp : 0,
  version: cacheVersion
});
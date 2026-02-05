// clientService.ts - Enhanced with caching and real-time updates
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
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
        }
        return Promise.reject(error);
    }
);

// Enhanced caching with version tracking
let clientsCache: any = null;
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
const startBackgroundRefresh = () => {
    if (backgroundRefreshTimer) {
        clearInterval(backgroundRefreshTimer);
    }

    backgroundRefreshTimer = setInterval(async () => {
        try {
            // Only do background refresh if we have cached data
            if (clientsCache) {
                const response = await apiClient.get('/getAll/client');
                const newClients = response.data.clients;
                const newHash = createDataHash(newClients);

                // If data changed, update cache and increment version
                if (newHash !== lastDataHash) {
                    clientsCache = newClients;
                    cacheTimestamp = Date.now();
                    cacheVersion++;
                    lastDataHash = newHash;

                    // Trigger a custom event to notify components
                    window.dispatchEvent(new CustomEvent('clientsDataUpdated', {
                        detail: { clients: newClients, version: cacheVersion }
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

// Enhanced fetchClients function
export const fetchClients = async (token: string, forceRefresh = false) => {
    const now = Date.now();

    // Return cached data if it's still valid and not forcing refresh
    if (!forceRefresh && clientsCache && (now - cacheTimestamp) < CACHE_DURATION) {
        // Start background refresh if not already running
        if (!backgroundRefreshTimer) {
            startBackgroundRefresh();
        }
        return { clients: clientsCache, version: cacheVersion, fromCache: true };
    }

    try {
        const response = await apiClient.get('/clients/getAll', {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        });
        const clients = response.data.data;
        const newHash = createDataHash(clients);

        // Update cache
        clientsCache = clients;
        cacheTimestamp = now;
        lastDataHash = newHash;

        // If this is initial load or force refresh, increment version
        if (forceRefresh || !cacheVersion) {
            cacheVersion++;
        }

        // Start background refresh
        startBackgroundRefresh();

        return { clients, version: cacheVersion, fromCache: false };
    } catch (error) {
        // If we have cached data and the request fails, return cached data
        if (clientsCache) {
            console.warn('Using cached data due to API error:', error);
            return { clients: clientsCache, version: cacheVersion, fromCache: true };
        }
        throw error;
    }
};

// Function to invalidate clients cache
export const invalidateClientsCache = () => {
    clientsCache = null;
    cacheTimestamp = 0;
    cacheVersion = 0;
    lastDataHash = '';
    stopBackgroundRefresh();
};

export const createClient = async (clientData: any, token: string) => {
    try {
        const response = await apiClient.post(
            '/clients/create',
            clientData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        );

        // Invalidate cache to force fresh data on next request
        invalidateClientsCache();

        return response.data;
    } catch (error) {
        console.error('Error creating client:', error);
        throw error;
    }
};

export const updateClient = async (clientId: string, clientData: any, token: string) => {
    try {
        const response = await apiClient.put(
            `/clients/update/${clientId}`,
            clientData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        );

        // Invalidate cache to force fresh data on next request
        invalidateClientsCache();

        return response.data;
    } catch (error) {
        console.error('Error updating client:', error);
        throw error;
    }
};

export const deleteClient = async (clientId: string, token: string) => {
    try {
        const response = await apiClient.delete(
            `/clients/delete/${clientId}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        );

        // Invalidate cache to force fresh data on next request
        invalidateClientsCache();

        return response.data;
    } catch (error) {
        console.error('Error deleting client:', error);
        throw error;
    }
};

export const getClientById = async (clientId: string, token: string) => {
    try {
        const response = await apiClient.get(`/clients/getById/${clientId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        });
        return response.data.client;
    } catch (error) {
        console.error('Error fetching client:', error);
        throw error;
    }
};

// Cleanup function for component unmount
export const cleanup = () => {
    stopBackgroundRefresh();
};

// Get cache info
export const getCacheInfo = () => ({
    hasCache: !!clientsCache,
    cacheAge: clientsCache ? Date.now() - cacheTimestamp : 0,
    version: cacheVersion
});


export const toggleClientStatus = async (clientId: string, token: string) => {
    try {
        const response = await apiClient.put(
            `/clients/toggle-status/${clientId}`,
            {}, // Empty body since all data comes from params and auth
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            }
        );

        // Invalidate cache to ensure fresh data on next request
        invalidateClientsCache();

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error: any) {
        console.error('Error toggling client status:', error);

        // Return structured error response similar to backend
        return {
            success: false,
            message: error.response?.data?.message || 'Error toggling client status',
            error: error.response?.data?.error || error.message
        };
    }
};
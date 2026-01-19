// categoryService.ts - Enhanced with better caching and real-time updates

import axios from "axios";

const API_BASE_URL = "http://localhost:5533";

// Configure axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("smartcliff_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("smartcliff_token");
    }
    return Promise.reject(error);
  }
);

// Enhanced caching with version tracking
let categoriesCache: any = null;
let cacheTimestamp: number = 0;
let cacheVersion: number = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const BACKGROUND_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

// Store for tracking data changes
let lastDataHash: string = "";
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
      if (categoriesCache) {
        const response = await apiClient.get("/categories/getAll");
        const newCategories = response.data.data; // Adjust based on your API response structure
        const newHash = createDataHash(newCategories);

        // If data changed, update cache and increment version
        if (newHash !== lastDataHash) {
          categoriesCache = newCategories;
          cacheTimestamp = Date.now();
          cacheVersion++;
          lastDataHash = newHash;

          // Trigger a custom event to notify components
          window.dispatchEvent(
            new CustomEvent("categoriesDataUpdated", {
              detail: { categories: newCategories, version: cacheVersion },
            })
          );
        }
      }
    } catch (error) {
      console.warn("Background refresh failed:", error);
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

// Enhanced fetchCategories function
export const fetchCategories = async (forceRefresh = false) => {
  const now = Date.now();

  // Return cached data if it's still valid and not forcing refresh
  if (
    !forceRefresh &&
    categoriesCache &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    // Start background refresh if not already running
    if (!backgroundRefreshTimer) {
      startBackgroundRefresh();
    }
    return {
      categories: categoriesCache,
      version: cacheVersion,
      fromCache: true,
    };
  }

  try {
    const response = await apiClient.get("/categories/getAll");
    const categories = response.data.data; // Adjust based on your API response structure
    const newHash = createDataHash(categories);

    // Update cache
    categoriesCache = categories;
    cacheTimestamp = now;
    lastDataHash = newHash;

    // If this is initial load or force refresh, increment version
    if (forceRefresh || !cacheVersion) {
      cacheVersion++;
    }

    // Start background refresh
    startBackgroundRefresh();

    return { categories, version: cacheVersion, fromCache: false };
  } catch (error) {
    // If we have cached data and the request fails, return cached data
    if (categoriesCache) {
      console.warn("Using cached data due to API error:", error);
      return {
        categories: categoriesCache,
        version: cacheVersion,
        fromCache: true,
      };
    }
    throw error;
  }
};

// Function to invalidate categories cache
export const invalidateCategoriesCache = () => {
  categoriesCache = null;
  cacheTimestamp = 0;
  cacheVersion = 0;
  lastDataHash = "";
  stopBackgroundRefresh();
};

// Category Service
export const categoryService = {
  createCategory: async (categoryData: {
    categoryName: string;
    categoryDescription?: string;
    categoryCode?: string;
    isActive?: boolean;
    courseNames?: string[];
  }) => {
    try {
      const response = await apiClient.post("/categories/create", categoryData);
      invalidateCategoriesCache();
      return response.data;
    } catch (error) {
      console.error("Error creating category:", error);
      throw error;
    }
  },

  getAllCategories: async () => {
    const { categories } = await fetchCategories();
    return { data: categories };
  },

  getCategoryById: async (categoryId: string) => {
    try {
      if (categoriesCache) {
        const cachedCategory = categoriesCache.find(
          (cat: any) => cat._id === categoryId
        );
        if (cachedCategory) {
          return { data: cachedCategory };
        }
      }

      const response = await apiClient.get(`/categories/getById/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching category:", error);
      throw error;
    }
  },

  updateCategory: async (
    categoryId: string,
    updateData: {
      categoryName?: string;
      categoryDescription?: string;
      categoryCode?: string;
      isActive?: boolean;
      courseNames?: string[];
    }
  ) => {
    try {
      const response = await apiClient.put(
        `/categories/update/${categoryId}`,
        updateData
      );
      invalidateCategoriesCache();
      return response.data;
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  },

  deleteCategory: async (categoryId: string) => {
    try {
      const response = await apiClient.delete(
        `/categories/delete/${categoryId}`
      );
      invalidateCategoriesCache();
      return response.data;
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  },
};

// Cleanup function for component unmount
export const cleanupCategories = () => {
  stopBackgroundRefresh();
};

// Get cache info
export const getCategoriesCacheInfo = () => ({
  hasCache: !!categoriesCache,
  cacheAge: categoriesCache ? Date.now() - cacheTimestamp : 0,
  version: cacheVersion,
});

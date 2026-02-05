// addModule.ts - API service for creating modules and fetching module data
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5533';

// Configure axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Interface for module data
export interface CreateModuleData {
    courseId: string;
    institutionId: string;
    moduleName: string;
    description: string;
    level: string;
}

// Interface for module response data
export interface ModuleData {
    _id: any;
    id: string;
    courseId: string;
    institutionId: string;
    moduleName: string;
    description: string;
    level: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
}

// Interface for API response when creating module
export interface CreateModuleResponse {
    success: boolean;
    message: string;
    data: ModuleData;
}

// Interface for API response when fetching modules
export interface GetModulesResponse {
    success: boolean;
    message: string;
    data: ModuleData[];
}

// Function to create a new module
export const createModule = async (moduleData: CreateModuleData, authToken: string): Promise<CreateModuleResponse> => {
    try {
        const response = await apiClient.post('/create', moduleData, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.message || 'Failed to create module';
            throw new Error(errorMessage);
        }
        throw new Error('Network error occurred');
    }
};

// Function to get modules by course ID
export const getModulesByCourse = async (courseId: string, authToken: string): Promise<GetModulesResponse> => {
    try {
        const response = await apiClient.get(`/course/${courseId}`, {
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.message || 'Failed to fetch modules';
            throw new Error(errorMessage);
        }
        throw new Error('Network error occurred');
    }
};

// Function to validate if user is authenticated (checks if token exists)
export const isAuthenticated = (token: string | null): boolean => {
    return !!token;
};

// Helper function to get auth token from localStorage
export const getAuthToken = (): string | null => {
    return localStorage.getItem('smartcliff_token');
};

// Helper function to format date
export const formatDate = (dateString: string): string => {
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid Date';
    }
};

// Helper function to get level badge color
export const getLevelBadgeColor = (level: string): string => {
    const levelLower = level.toLowerCase();
    if (levelLower.includes('beginner') || levelLower.includes('basic')) {
        return 'bg-green-100 text-green-700 border-green-200';
    }
    if (levelLower.includes('intermediate') || levelLower.includes('medium')) {
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
    if (levelLower.includes('advanced') || levelLower.includes('expert')) {
        return 'bg-red-100 text-red-700 border-red-200';
    }
    return 'bg-blue-100 text-blue-700 border-blue-200';
};
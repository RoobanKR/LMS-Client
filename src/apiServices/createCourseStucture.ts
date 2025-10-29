// courseStructureService.ts - React Query version
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

// Get current token
const getCurrentToken = () => {
    return localStorage.getItem('smartcliff_token');
};

// Add request interceptor
apiClient.interceptors.request.use((config) => {
    const token = getCurrentToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('smartcliff_token');
        }
        return Promise.reject(error);
    }
);

// Basic fetch functions (no caching logic here - React Query will handle that)
export const fetchAllCourseStructures = async (): Promise<any> => {
    const response = await apiClient.get('/courses-structure/getAll');
    return response.data.data;
};

export const fetchCourseStructureById = async (courseId: string): Promise<any> => {
    const response = await apiClient.get(`/courses-structure/getById/${courseId}`);
    return response.data;
};

export const createCourseStructure = async (courseData: any): Promise<any> => {
    const formData = new FormData();

    // Append all fields to formData
    Object.keys(courseData).forEach(key => {
        if (key === 'courseImage') {
            // Skip for now, handle separately
        } else if (Array.isArray(courseData[key])) {
            // For arrays, append each element individually with same key
            courseData[key].forEach((item: string) => {
                formData.append(key, item);
            });
        } else {
            formData.append(key, courseData[key]);
        }
    });

    // Append image file if it exists
    if (courseData.courseImage) {
        formData.append('courseImage', courseData.courseImage);
    }

    const response = await apiClient.post(
        '/courses-structure/create',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        }
    );

    return response.data;
};

export const updateCourseStructure = async (courseId: string, courseData: any): Promise<any> => {
    const formData = new FormData();

    // Append all fields to formData
    Object.keys(courseData).forEach(key => {
        if (key === 'courseImage') {
            // Skip for now, handle separately
        } else if (Array.isArray(courseData[key])) {
            // For arrays, append each element individually with same key
            courseData[key].forEach((item: string) => {
                formData.append(key, item);
            });
        } else {
            formData.append(key, courseData[key]);
        }
    });

    // Append image file if it exists
    if (courseData.courseImage) {
        formData.append('courseImage', courseData.courseImage);
    }

    // Append removeImage flag if needed
    if (courseData.removeImage) {
        formData.append('removeImage', 'true');
    }

    const response = await apiClient.put(
        `/courses-structure/update/${courseId}`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        }
    );

    return response.data;
};

export const deleteCourseStructure = async (courseId: string): Promise<any> => {
    const response = await apiClient.delete(
        `/courses-structure/delete/${courseId}`
    );
    return response.data;
};

// WebSocket connection for real-time updates
let socket: WebSocket | null = null;

export const setupCourseStructuresWebSocket = (
    onUpdate: (updatedCourse: any) => void,
    onDelete: (deletedCourseId: string) => void,
    onCreate: (newCourse: any) => void
) => {
    if (socket) return socket;

    const token = getCurrentToken();
    if (!token) {
        throw new Error('No authentication token available');
    }

    socket = new WebSocket(`ws://localhost:5533/courses-structure/updates?token=${token}`);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'course_structure_updated':
                onUpdate(data.course);
                break;
            case 'course_structure_deleted':
                onDelete(data.courseId);
                break;
            case 'course_structure_created':
                onCreate(data.course);
                break;
        }
    };

    socket.onclose = () => {
        console.log('Course structures WebSocket disconnected');
        socket = null;
    };

    return socket;
};

export const closeCourseStructuresWebSocket = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
};

// React Query API configuration
export const courseStructureApi = {
    getAll: () => ({
        queryKey: ['courseStructures'],
        queryFn: fetchAllCourseStructures,
        staleTime: 1000 * 30, // 30 seconds - data becomes stale after this time
        refetchInterval: 1000 * 30, // 30 seconds - auto refetch interval
        refetchIntervalInBackground: true, // Continue refetching when tab is not active
        refetchOnWindowFocus: false, // Don't refetch on window focus (since we're polling)
    }),
    getById: (courseId: string) => ({
        queryKey: ['courseStructure', courseId],
        queryFn: () => fetchCourseStructureById(courseId),
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 30, // 30 seconds
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: false,
    }),
    create: () => ({
        mutationFn: createCourseStructure,
    }),
    update: (courseId: string) => ({
        mutationFn: (data: any) => updateCourseStructure(courseId, data),
    }),
    delete: (courseId: string) => ({
        mutationFn: () => deleteCourseStructure(courseId),
    }),
};
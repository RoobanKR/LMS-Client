// courseStructureService.ts - Updated version
import axios from 'axios';

const API_BASE_URL = 'https://lms-server-ym1q.onrender.com';

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

const objectToFormData = (obj: any, formData: FormData = new FormData(), parentKey?: string): FormData => {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const formKey = parentKey ? `${parentKey}[${key}]` : key;
      
      if (value === null || value === undefined) {
        continue;
      }
      
      // Handle File objects
      if (value instanceof File) {
        formData.append(formKey, value);
        continue;
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        if (value.length === 0) {
          formData.append(formKey, '');
        } else {
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null && !(item instanceof File)) {
              objectToFormData(item, formData, `${formKey}[${index}]`);
            } else {
              formData.append(`${formKey}[${index}]`, String(item));
            }
          });
        }
        continue;
      }
      
      // Handle nested objects
      if (typeof value === 'object' && value !== null) {
        // For empty objects, send empty string
        if (Object.keys(value).length === 0) {
          formData.append(formKey, '');
        } else {
          objectToFormData(value, formData, formKey);
        }
        continue;
      }
      
      // Handle primitive values
      formData.append(formKey, String(value));
    }
  }
  return formData;
};

// Helper to convert resourcesType to proper format
const formatResourcesType = (resourcesType: any) => {
    if (!resourcesType) return { iDo: [], weDo: [], youDo: [] };
    
    return {
        iDo: resourcesType.iDo || [],
        weDo: resourcesType.weDo || [],
        youDo: resourcesType.youDo || []
    };
};

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
  
  const preparedData = {
    clientName: courseData.clientName,
    serviceType: courseData.serviceType,
    serviceModal: courseData.serviceModal,
    category: courseData.category,
    courseCode: courseData.courseCode,
    courseName: courseData.courseName,
    courseDescription: courseData.courseDescription || '',
    courseDuration: courseData.courseDuration || '',
    courseLevel: courseData.courseLevel,
    I_Do: courseData.I_Do || [],
    We_Do: courseData.We_Do || [],
    You_Do: courseData.You_Do || [],
    aiChatGlobal: courseData.aiChatGlobal || false,
    courseHierarchy: courseData.courseHierarchy || [],
    resourcesType: courseData.resourcesType,
    testConfiguration: courseData.testConfiguration, // Add this line
    createdBy: courseData.createdBy,
    institution: courseData.institution
  };
  
  // Convert to FormData
  objectToFormData(preparedData, formData);
  
  // Handle image separately
  if (courseData.courseImage && courseData.courseImage instanceof File) {
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
    
    // Format resourcesType properly
    const formattedData = {
        ...courseData,
        resourcesType: formatResourcesType(courseData.resourcesType)
    };
    
    // Convert the entire formattedData object to FormData
    objectToFormData(formattedData, formData);

    // Ensure courseImage is properly handled if it's a File object
    if (courseData.courseImage && courseData.courseImage instanceof File) {
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
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 30,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: false,
    }),
    getById: (courseId: string) => ({
        queryKey: ['courseStructure', courseId],
        queryFn: () => fetchCourseStructureById(courseId),
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 30,
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
// pedagogyStructureService.ts - React Query version
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5533';

// Type definitions
interface PedagogyActivityItem {
    type: string;
    duration: number;
    _id?: any;
}

interface PedagogyStructure {
    _id: string;
    institution: string;
    I_Do: PedagogyActivityItem[];
    We_Do: PedagogyActivityItem[];
    You_Do: PedagogyActivityItem[];
    createdAt: Date;
    createdBy?: string;
    updatedAt: Date;
    updatedBy?: string;
}

interface PedagogyStructureCreateData {
    I_Do?: PedagogyActivityItem[];
    We_Do?: PedagogyActivityItem[];
    You_Do?: PedagogyActivityItem[];
    createdBy?: string;
}

interface PedagogyStructureUpdateData {
    I_Do?: PedagogyActivityItem[];
    We_Do?: PedagogyActivityItem[];
    You_Do?: PedagogyActivityItem[];
    updatedBy?: string;
}

interface ArrayElementUpdateData {
    section: 'I_Do' | 'We_Do' | 'You_Do';
    // elementId: string;
    index: number;
    newValue: PedagogyActivityItem;
}

interface ArrayElementDeleteData {
    section: 'I_Do' | 'We_Do' | 'You_Do';
    index: number;
}

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

// Basic fetch functions
export const fetchAllPedagogyStructures = async (): Promise<PedagogyStructure[]> => {
    const response = await apiClient.get('/dynamic/pedagogy/getAll');
    return response.data.data || [];
};

export const fetchPedagogyStructureById = async (id: string): Promise<PedagogyStructure> => {
    const response = await apiClient.get(`/dynamic/pedagogy/getById/${id}`);
    return response.data.data;
};

export const createPedagogyStructure = async (pedagogyStructureData: PedagogyStructureCreateData): Promise<PedagogyStructure> => {
    const response = await apiClient.post('/dynamic/pedagogy/create', pedagogyStructureData);
    return response.data.data;
};

export const updatePedagogyStructureArrayElement = async (
    id: string,
    updateData: ArrayElementUpdateData
): Promise<PedagogyStructure> => {
    const response = await apiClient.put(`/dynamic/pedagogy/update/${id}`, updateData);
    return response.data.data;
};

export const deletePedagogyStructureArrayElement = async (
    id: string,
    deleteData: ArrayElementDeleteData
): Promise<PedagogyStructure> => {
    const response = await apiClient.delete(`/dynamic/pedagogy/delete/${id}`, {
        data: deleteData
    });
    return response.data.data;
};

// WebSocket connection for real-time updates
let socket: WebSocket | null = null;

export const setupPedagogyStructuresWebSocket = (
    onUpdate: (updatedPedagogyStructure: PedagogyStructure) => void,
    onDelete: (deletedPedagogyStructureId: string) => void,
    onCreate: (newPedagogyStructure: PedagogyStructure) => void
) => {
    if (socket) return socket;

    const token = getCurrentToken();
    if (!token) {
        throw new Error('No authentication token available');
    }

    socket = new WebSocket(`ws://localhost:5533/dynamic/pedagogy/updates?token=${token}`);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'pedagogy_structure_updated':
                onUpdate(data.pedagogyStructure);
                break;
            case 'pedagogy_structure_deleted':
                onDelete(data.pedagogyStructureId);
                break;
            case 'pedagogy_structure_created':
                onCreate(data.pedagogyStructure);
                break;
        }
    };

    socket.onclose = () => {
        console.log('Pedagogy structures WebSocket disconnected');
        socket = null;
    };

    return socket;
};

export const closePedagogyStructuresWebSocket = () => {
    if (socket) {
        socket.close();
        socket = null;
    }
};

// React Query API configuration
export const pedagogyStructureApi = {
    getAll: () => ({
        queryKey: ['pedagogyStructures'],
        queryFn: fetchAllPedagogyStructures,
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 30, // 30 seconds
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: false,
    }),
    getById: (id: string) => ({
        queryKey: ['pedagogyStructure', id],
        queryFn: () => fetchPedagogyStructureById(id),
        staleTime: 1000 * 30, // 30 seconds
        refetchInterval: 1000 * 30, // 30 seconds
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: false,
    }),
    create: () => ({
        mutationFn: createPedagogyStructure,
    }),
    updateArrayElement: (id: string) => ({
        mutationFn: (data: ArrayElementUpdateData) => updatePedagogyStructureArrayElement(id, data),
    }),
    deleteArrayElement: (id: string) => ({
        mutationFn: (data: ArrayElementDeleteData) => deletePedagogyStructureArrayElement(id, data),
    }),
};
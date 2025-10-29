// src/apiServices/addmoduleandall/addSubmodule.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5533';

interface CreateSubModuleData {
  name: string;
  description: string;
  level: string;
  duration: string;
  resources: string[];
  learningObjectives: string[];
  courseId: string;
  moduleId: string;
  hierarchyType: string;
  parentModuleName: string;
}

interface SubModuleResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    name: string;
    description: string;
    level: string;
    duration: string;
    resources: string[];
    learningObjectives: string[];
    courseId: string;
    moduleId: string;
    hierarchyType: string;
    parentModuleName: string;
    createdAt: string;
    updatedAt: string;
  };
}

export const createSubModule = async (subModuleData: CreateSubModuleData, authToken: string): Promise<SubModuleResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/create`, subModuleData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || 'Failed to create submodule';
      throw new Error(errorMessage);
    }
    throw new Error('Network error occurred');
  }
};
import axios from 'axios';
import { Question, QuestionBankResponse, ApiResponse } from './type/question';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5533';

const questionBankApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
questionBankApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartcliff_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Clean payload for simple question format (Programming & Simple MCQ)
const cleanSimpleQuestionPayload = (question: Partial<Question>): Partial<Question> => {
  const { questionType } = question;
  
  const baseFields = {
    questionCategory: question.questionCategory || '',
    questionType: questionType as 'MCQ' | 'Programming',
    isActive: question.isActive ?? true,
  };

  if (questionType === 'MCQ') {
    return {
      ...baseFields,
      questionTitle: question.questionTitle || '',
      options: question.options || [],
      correctAnswer: question.correctAnswer || '',
    };
  } else if (questionType === 'Programming') {
    const cleanedQuestion: Partial<Question> = {
      ...baseFields,
      title: question.title || '',
      description: question.description || '',
      difficulty: question.difficulty || 'Medium',
      sampleInput: question.sampleInput || '',
      sampleOutput: question.sampleOutput || '',
      score: question.score || 0,
    };

    if (question.constraints && question.constraints.length > 0) {
      cleanedQuestion.constraints = question.constraints.filter(c => c.trim() !== '');
    }

    if (question.hints && question.hints.length > 0) {
      cleanedQuestion.hints = question.hints.filter(h => h.hintText?.trim() !== '');
    }

    if (question.testCases && question.testCases.length > 0) {
      cleanedQuestion.testCases = question.testCases.filter(t => 
        t.input?.trim() !== '' || t.expectedOutput?.trim() !== ''
      );
    }

    if (question.solutions && 
        (question.solutions.startedCode?.trim() !== '' || 
         question.solutions.functionName?.trim() !== '')) {
      cleanedQuestion.solutions = question.solutions;
    }

    if (question.timeLimit) {
      cleanedQuestion.timeLimit = question.timeLimit;
    }

    if (question.memoryLimit) {
      cleanedQuestion.memoryLimit = question.memoryLimit;
    }

    return cleanedQuestion;
  }

  return baseFields;
};

export const questionBankService = {
  // Get all questions with filters
  getAllQuestions: async (filters?: {
    questionType?: string;
    category?: string;
    difficulty?: string;
    isActive?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const token = localStorage.getItem("smartcliff_token");
    const response = await questionBankApi.get<QuestionBankResponse>(
      `/getAll/question-bank`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      }
    );
    return response.data;
  },

  // Get single question by ID
  getQuestionById: async (id: string) => {
    const token = localStorage.getItem("smartcliff_token");
    const response = await questionBankApi.get<ApiResponse<Question>>(
      `/getById/question-bank/${id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      }
    );
    return response.data;
  },

  // ✅ NEW: Create MCQ question with FormData (Rich Editor)
  createMCQQuestionWithImages: async (formData: FormData) => {
    try {
      const token = localStorage.getItem("smartcliff_token");
      
      console.log('📤 Sending MCQ FormData to backend...');
      
      const response = await axios.post(
        `${API_BASE_URL}/create/question-bank`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          timeout: 60000, // 60 seconds for image uploads
        }
      );
      
      console.log('✅ MCQ question created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating MCQ question with images:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  },

  // ✅ NEW: Update MCQ question with FormData (Rich Editor)
  updateMCQQuestionWithImages: async (id: string, formData: FormData) => {
    try {
      const token = localStorage.getItem("smartcliff_token");
      
      console.log(`📤 Updating MCQ question ${id} with FormData...`);
      
      const response = await axios.put(
        `${API_BASE_URL}/update/question-bank/${id}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          },
          timeout: 60000,
        }
      );
      
      console.log('✅ MCQ question updated successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating MCQ question with images:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  },

  // ✅ Create question (Handles both simple JSON and FormData)
  createQuestion: async (question: Partial<Question> | FormData) => {
    // Check if it's FormData (coming from MCQFields)
    if (question instanceof FormData) {
      return questionBankService.createMCQQuestionWithImages(question);
    }
    
    // Otherwise, it's a simple JSON payload (Programming or Simple MCQ)
    const token = localStorage.getItem("smartcliff_token");
    
    // Clean the payload before sending
    const cleanedQuestion = cleanSimpleQuestionPayload(question);
    
    console.log('📤 Sending simple question payload:', cleanedQuestion);
    
    const response = await questionBankApi.post<ApiResponse<Question>>(
      '/create/question-bank',
      cleanedQuestion,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      }
    );
    return response.data;
  },

  // ✅ Update question (Handles both simple JSON and FormData)
  updateQuestion: async (id: string, question: Partial<Question> | FormData) => {
    // Check if it's FormData (coming from MCQFields)
    if (question instanceof FormData) {
      return questionBankService.updateMCQQuestionWithImages(id, question);
    }
    
    // Otherwise, it's a simple JSON payload
    const token = localStorage.getItem("smartcliff_token");
    
    // Clean the payload before sending
    const cleanedQuestion = cleanSimpleQuestionPayload(question);
    
    console.log(`📤 Updating question ${id} with simple payload:`, cleanedQuestion);
    
    const response = await questionBankApi.put<ApiResponse<Question>>(
      `/update/question-bank/${id}`,
      cleanedQuestion,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      }
    );
    return response.data;
  },

  // Toggle question status
  toggleQuestionStatus: async (id: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem("smartcliff_token");
      
      const response = await questionBankApi.put<ApiResponse<Question>>(
        `/toggle-status/question-bank/${id}`,
        { isActive },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error in toggleQuestionStatus:', error.response?.data || error.message);
      throw error;
    }
  },

  // Delete question (soft delete)
  deleteQuestion: async (id: string) => {
    const token = localStorage.getItem("smartcliff_token");
    const response = await questionBankApi.delete<ApiResponse<void>>(
      `/deletes/question-bank/${id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      }
    );
    return response.data;
  },
};
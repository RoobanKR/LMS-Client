import axios from 'axios';

const BASE_URL = 'http://localhost:5533';

// Interfaces
export interface HintData {
  hintText: string;
  pointsDeduction: number;
  isPublic: boolean;
  sequence: number;
}

export interface TestCaseData {
  input: string;
  expectedOutput: string;
  isSample: boolean;
  isHidden: boolean;
  points?: number;
  explanation?: string;
  sequence: number;
}

export interface MCQQuestionData {
  questionType: 'mcq';
  mcqQuestion: {
    questionTitle: string;
    options: string[];
    correctAnswer: string;
  };
  isActive: boolean;
  sequence: number;
}

export interface ProgrammingQuestionData {
  questionType: 'programming';
  programmingQuestion: {
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    sampleInput?: string;
    sampleOutput?: string;
    constraints: string[];
    hints: HintData[];
    testCases: TestCaseData[];
    solutions: {
      startedCode: string;
      functionName: string;
      language: string;
    };
    timeLimit: number;
    memoryLimit: number;
    isActive: boolean;
    sequence: number;
  };
  isActive: boolean;
  sequence: number;
}

export type QuestionData = MCQQuestionData | ProgrammingQuestionData;

export interface QuestionResponse {
  success: boolean;
  message: Array<{ key: string; value: string }>;
  data: {
    question: any;
    questionId: string;
  };
}

export const questionApi = {
  // Add a new question

 
  addQuestion: async (
  entityType: 'modules' | 'submodules' | 'topics' | 'subtopics',
  entityId: string,
  exerciseId: string,
  questionData: any, // Can be single question object or array of questions
  tabType: string,
  subcategory: string
): Promise<any> => {
  try {
    const url = `${BASE_URL}/question-add/${entityType}/${entityId}/exercise/${exerciseId}`;
 
    console.log('📤 Original questionData:', JSON.stringify(questionData, null, 2));
   
    // Check if we have multiple questions (from MCQ form)
    const isMultipleQuestions = Array.isArray(questionData);
   
    let payload: any = {
      tabType,
      subcategory
    };
 
    if (isMultipleQuestions) {
      // MULTIPLE QUESTIONS (From MCQQuestionForm)
      // The MCQ form sends array directly
      payload.questionsData = questionData.map((q, index) => ({
        questionType: q.questionType || 'mcq',
        isActive: q.isActive !== undefined ? q.isActive : true,
        sequence: q.sequence || index,
        questionTitle: q.questionTitle || q.title || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer || '',
        score: q.score || 10
      }));
     
      console.log('📤 MCQ Payload (multiple questions):', JSON.stringify(payload, null, 2));
 
    } else {
      // SINGLE QUESTION (From ProgrammingQuestionForm or FrontendQuestionForm)
      // Check what type of question data we have
      const questionType = questionData.questionType || 'programming';
     
      // Set common fields
      payload.isActive = questionData.isActive !== undefined ? questionData.isActive : true;
      payload.sequence = questionData.sequence || 0;
      payload.questionType = questionType;
     
      if (questionType === 'mcq') {
        // SINGLE MCQ QUESTION (if sent from other forms)
        payload.questionTitle = questionData.questionTitle || questionData.title || '';
        payload.options = Array.isArray(questionData.options) ? questionData.options : [];
        payload.correctAnswer = questionData.correctAnswer || '';
        if (questionData.score) payload.score = questionData.score;
       
        console.log('📤 Single MCQ Payload:', JSON.stringify(payload, null, 2));
       
      } else if (questionType === 'programming') {
        // PROGRAMMING QUESTION (from ProgrammingQuestionForm)
        // The form sends data directly, not nested in programmingQuestion
        payload.title = questionData.title || '';
        payload.description = questionData.description || '';
        payload.difficulty = questionData.difficulty || 'medium';
        payload.score = questionData.score || questionData.points || 10;
        payload.sampleInput = questionData.sampleInput || '';
        payload.sampleOutput = questionData.sampleOutput || '';
        payload.timeLimit = questionData.timeLimit || 2000;
        payload.memoryLimit = questionData.memoryLimit || 256;
       
        // Optional arrays - only include if they exist and have content
        if (questionData.constraints && Array.isArray(questionData.constraints) && questionData.constraints.length > 0) {
          payload.constraints = questionData.constraints;
        }
       
        if (questionData.hints && Array.isArray(questionData.hints) && questionData.hints.length > 0) {
          payload.hints = questionData.hints;
        }
       
        if (questionData.testCases && Array.isArray(questionData.testCases) && questionData.testCases.length > 0) {
          payload.testCases = questionData.testCases.map((tc: any) => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            isSample: tc.isSample || false,
            isHidden: tc.isHidden !== undefined ? tc.isHidden : true,
            points: tc.points || 1,
            explanation: tc.explanation || tc.description || ''
          }));
        }
       
        // Solutions
        if (questionData.solutions) {
          payload.solutions = {
            startedCode: questionData.solutions.startedCode || '',
            functionName: questionData.solutions.functionName || 'main',
            language: questionData.solutions.language || 'python'
          };
        }
       
        console.log('📤 Programming Payload:', JSON.stringify(payload, null, 2));
       
      } else if (questionType === 'frontend') {
        // FRONTEND QUESTION (from FrontendQuestionForm)
        // The frontend form sends data with moduleType: 'Frontend'
        // We need to convert it to programming type for backend
       
        payload.questionType = 'programming'; // Backend expects programming
        payload.title = questionData.title || '';
        payload.description = questionData.description || '';
        payload.difficulty = questionData.difficulty || 'medium';
        payload.score = questionData.points || questionData.score || 10;
        payload.sampleInput = questionData.sampleInput || '';
        payload.sampleOutput = questionData.sampleOutput || '';
        payload.timeLimit = questionData.timeLimit || 2000;
        payload.memoryLimit = questionData.memoryLimit || 256;
       
        // Handle frontend-specific fields
        if (questionData.constraints && Array.isArray(questionData.constraints)) {
          payload.constraints = questionData.constraints;
        }
       
        if (questionData.hints && Array.isArray(questionData.hints)) {
          payload.hints = questionData.hints.map((hint: any, index: number) => ({
            hintText: hint.hintText || hint,
            pointsDeduction: hint.pointsDeduction || 0,
            isPublic: hint.isPublic !== undefined ? hint.isPublic : true,
            sequence: hint.sequence || index
          }));
        }
       
        // For frontend questions, we might want to add metadata
        payload.moduleType = 'frontend';
       
        console.log('📤 Frontend Payload:', JSON.stringify(payload, null, 2));
      }
    }
 
    // Remove any undefined fields
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });
 
    const token = localStorage.getItem("smartcliff_token");
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      timeout: 30000,
    });
 
    console.log('✅ Question(s) added successfully:', response.data);
    return response.data;
   
  } catch (error: any) {
    console.error('❌ Error adding question(s):', error);
    if (error.response) {
      console.error('❌ Response data:', error.response.data);
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response headers:', error.response.headers);
    }
    throw error;
  }
},
 

  // Update question API also needs similar changes
  updateQuestion: async (
    entityType: 'modules' | 'submodules' | 'topics' | 'subtopics',
    entityId: string,
    exerciseId: string,
    questionId: string,
    questionData: Partial<QuestionData>,
    tabType: string,
    subcategory: string
  ): Promise<QuestionResponse> => {
    try {
      const url = `${BASE_URL}/question-update/${entityType}/${entityId}/${exerciseId}/${questionId}`;

      // Prepare payload similar to addQuestion
      let payload: any = {
        tabType,
        subcategory,
        updatedAt: new Date().toISOString()
      };

      if (questionData.questionType === 'mcq') {
        payload.questionType = 'mcq';
        payload.questionTitle = questionData.mcqQuestion?.questionTitle || '';
        payload.options = questionData.mcqQuestion?.options || [];
        payload.correctAnswer = questionData.mcqQuestion?.correctAnswer || '';
      } else if (questionData.questionType === 'programming') {
        payload.questionType = 'programming';
        payload.title = questionData.programmingQuestion?.title || '';
        payload.description = questionData.programmingQuestion?.description || '';
        payload.difficulty = questionData.programmingQuestion?.difficulty || 'medium';
        payload.sampleInput = questionData.programmingQuestion?.sampleInput || '';
        payload.sampleOutput = questionData.programmingQuestion?.sampleOutput || '';
        payload.constraints = questionData.programmingQuestion?.constraints || [];
        payload.hints = questionData.programmingQuestion?.hints || [];
        payload.testCases = questionData.programmingQuestion?.testCases || [];
        payload.timeLimit = questionData.programmingQuestion?.timeLimit || 2000;
        payload.memoryLimit = questionData.programmingQuestion?.memoryLimit || 256;
        
        const solutionsData = questionData.programmingQuestion?.solutions || questionData.solutions;
        payload.solutions = {
          startedCode: solutionsData?.startedCode || questionData.compilerCode || '',
          functionName: solutionsData?.functionName || 'main',
          language: solutionsData?.language || questionData.compilerLanguage || 'python'
        };
      }

      const token = localStorage.getItem("smartcliff_token");
      
      const response = await axios.put(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000,
      });

      console.log('✅ Question updated successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating question:', error);
      throw error;
    }
  },
  // Delete a question
  deleteQuestion: async (
    entityType: 'modules' | 'submodules' | 'topics' | 'subtopics',
    entityId: string,
    exerciseId: string,
    questionId: string,
    tabType: string,
    subcategory: string
  ): Promise<any> => {
    try {
      const url = `${BASE_URL}/question-delete/${entityType}/${entityId}/${exerciseId}/${questionId}`;
      
      console.log('🗑️ DELETE Request:', {
        url,
        tabType,
        subcategory,
        entityType,
        entityId,
        exerciseId,
        questionId
      });

      const token = localStorage.getItem("smartcliff_token");
      
      const response = await axios.delete(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        data: {
          tabType,
          subcategory
        },
        timeout: 30000,
      });

      console.log('✅ Question deleted successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error deleting question:', error);
      if (error.response) {
        console.error('❌ Response error:', error.response.data);
        console.error('❌ Response status:', error.response.status);
      }
      throw error;
    }
  },
};
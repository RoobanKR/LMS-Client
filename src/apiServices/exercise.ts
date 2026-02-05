import { ExercisePayload } from '@/app/lms/component/ExerciseSettings';
import axios from 'axios';

const BASE_URL = 'http://localhost:5533';

export type EntityType = 'modules' | 'submodules' | 'topics' | 'subtopics';

export interface HierarchyData {
  courseName: string;
  moduleName: string;
  submoduleName: string;
  topicName: string;
  subtopicName: string;
  nodeType: EntityType;
  level: number;
}

export interface LevelCounts {
  easy: number;
  medium: number;
  hard: number;
}

// ============ SCORE SETTINGS INTERFACES ============
export interface MCQScoreSettings {
  totalMcqQuestions: number;
  marksPerQuestion: number
  mcqTotalMarks: number;
}

export interface ProgrammingScoreSettings {
  scoreType: 'evenMarks' | 'separateMarks' | 'levelBasedMarks';
  evenMarks: number;
  separateMarks: {
    general: number[];
    levelBased: {
      easy: number[];
      medium: number[];
      hard: number[];
    };
  };
  levelBasedMarks: {
    easy: number;
    medium: number;
    hard: number;
  };
  totalMarks: number;
}

// ============ CONFIGURATION INTERFACES ============
export interface MCQConfig {
  questionConfigType: 'general';
  generalQuestionCount: number;
  scoreSettings: MCQScoreSettings;
  attemptLimitEnabled: boolean;
  submissionAttempts: number;
}

export interface ProgrammingConfig {
  questionConfigType: 'general' | 'levelBased' | 'selectionLevel';
  generalQuestionCount?: number;
  levelBasedCounts?: LevelCounts;
  selectionLevelCounts?: LevelCounts;
  scoreSettings: ProgrammingScoreSettings;
  questionFlow: 'freeFlow' | 'controlled';
  attemptLimitEnabled: boolean;
  submissionAttempts: number;
}

export interface QuestionConfiguration {
  mcqConfig?: MCQConfig;
  programmingConfig?: ProgrammingConfig;
}

// ============ OTHER INTERFACES ============
export interface AvailabilityPeriod {
  startDate: string;
  endDate: string;
  gracePeriodEnabled: boolean;
  gracePeriodDate?: string;
}

export interface NotificationSettings {
  notifyUsers: boolean;
  notifyGmail: boolean;
  notifyWhatsApp: boolean;
  gradeSheet: boolean;
}

export interface NotificationGradeSettings {
  notifyUsers: boolean;
  notifyGmail: boolean;
  notifyWhatsApp: boolean;
  gradeSheet: boolean;
}

export interface ExerciseInformation {
  exerciseId: string;
  exerciseName: string;
  description: string;
  exerciseLevel: 'beginner' | 'intermediate' | 'expert';
  totalDuration: number;
}

export interface ProgrammingSettings {
  selectedModule: string;
  selectedLanguages: string[];
}

// ============ BACKEND PAYLOAD INTERFACE ============
// This is what the backend expects
export interface APIExercisePayload {
  configurationType: 'manual';
  tabType: "I_Do" | "We_Do" | "You_Do";
  subcategory: string;
  exerciseType: 'MCQ' | 'Programming' | 'Combined';
  programmingSettings?: ProgrammingSettings;
  exerciseInformation: ExerciseInformation;
  questionConfiguration?: {
    levelType?: 'general' | 'levelBased';
    general?: number;
    levelBased?: LevelCounts;
    questionFlow?: 'freeFlow' | 'controlled';
    attemptLimitEnabled?: boolean;
    submissionAttempts?: number;
    // Combined exercise specific
    mcqCount?: number;
    mcqAttemptLimitEnabled?: boolean;
    mcqSubmissionAttempts?: number;
    mcqScoreSettings?: MCQScoreSettings;
    programmingScoreSettings?: ProgrammingScoreSettings;
  };
  availabilityPeriod: AvailabilityPeriod;
  notificationGradeSettings: NotificationGradeSettings;
  // No separate scoreSettings at top level - all score settings are inside questionConfiguration
}

// ============ UI PAYLOAD INTERFACE ============
// This is what the UI sends (matches ExerciseSettings component)
export interface UIExercisePayload {
  configurationType: 'manual';
  tabType: "I_Do" | "We_Do" | "You_Do";
  subcategory: string;
  exerciseType: 'MCQ' | 'Programming' | 'Combined';
  programmingSettings?: ProgrammingSettings;
  exerciseInformation: ExerciseInformation;
  questionConfiguration?: QuestionConfiguration;
  availabilityPeriod: AvailabilityPeriod;
  notificationSettings: NotificationSettings; // UI sends notificationSettings
}

export interface ExerciseResponse {
  message: Array<{ key: string; value: string }>;
  data: {
    exercise: any;
    subcategory: string;
    section: string;
    entityType: EntityType;
    entityId: string;
    totalExercises: number;
  };
}


export const modelMap: Record<EntityType, { path: string }> = {
  modules: { path: 'modules' },
  submodules: { path: 'submodules' },
  topics: { path: 'topics' },
  subtopics: { path: 'subtopics' }
};

const getEntityPath = (entityType: EntityType): string => {
  const entity = modelMap[entityType];
  if (!entity) {
    console.error('Invalid entity type:', entityType);
    throw new Error(`Invalid entity type: ${entityType}`);
  }
  return entity.path;
};

export const exerciseApi = {

  // 1. ADD EXERCISE (Already updated)
addExercise: async (
  entityType: EntityType,
  entityId: string,
  exerciseData: ExercisePayload
): Promise<ExerciseResponse> => {
  try {
    console.log('📥 Received exercise data from UI:', exerciseData);

    // Build the payload according to backend expectations
    const payload: any = {
      tabType: exerciseData.tabType,
      subcategory: exerciseData.subcategory,
      exerciseType: exerciseData.exerciseType,
      configurationType: {
        mcqMode: exerciseData.exerciseType === 'MCQ',
        programmingMode: exerciseData.exerciseType === 'Programming',
        combinedMode: exerciseData.exerciseType === 'Combined'
      },
      exerciseInformation: exerciseData.exerciseInformation,
      availabilityPeriod: exerciseData.availabilityPeriod,
      notificationSettings: {
        notifyUsers: exerciseData.notificationSettings?.notifyUsers || false,
        notifyGmail: exerciseData.notificationSettings?.notifyGmail || false,
        notifyWhatsApp: exerciseData.notificationSettings?.notifyWhatsApp || false,
        gradeSheet: exerciseData.notificationSettings?.gradeSheet || true
      },
      questions: []
    };

    // Add programming settings if applicable
    if (exerciseData.exerciseType === 'Programming' || exerciseData.exerciseType === 'Combined') {
      payload.programmingSettings = exerciseData.programmingSettings;
    }

    // Handle question configuration based on exercise type
    if (exerciseData.questionConfiguration) {
      console.log('🔧 Processing questionConfiguration:', exerciseData.questionConfiguration);
      
      // Initialize questionConfiguration object
      payload.questionConfiguration = {};

      if (exerciseData.exerciseType === 'MCQ' && exerciseData.questionConfiguration.mcqConfig) {
        const mcqConfig = exerciseData.questionConfiguration.mcqConfig;
        
        // Backend expects mcqConfig object (not mcqQuestionConfiguration)
        payload.questionConfiguration.mcqConfig = {
          questionConfigType: 'general',
          generalQuestionCount: mcqConfig.generalQuestionCount || 0,
          scoreSettings: {
            scoreType: 'evenMarks',
            evenMarks: mcqConfig.scoreSettings?.evenMarks || 0,
            totalMarks: mcqConfig.scoreSettings?.totalMarks || 0
          },
          attemptLimitEnabled: mcqConfig.attemptLimitEnabled || false,
          submissionAttempts: mcqConfig.submissionAttempts || 1
        };
      } 
      else if (exerciseData.exerciseType === 'Programming' && exerciseData.questionConfiguration.programmingConfig) {
        const progConfig = exerciseData.questionConfiguration.programmingConfig;
        
        // Backend expects programmingConfig object
        const programmingConfig: any = {
          questionConfigType: progConfig.questionConfigType || 'general',
          scoreSettings: progConfig.scoreSettings || {
            scoreType: 'evenMarks',
            evenMarks: 0,
            separateMarks: {
              general: [],
              levelBased: { easy: [], medium: [], hard: [] }
            },
            levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
            totalMarks: 0
          },
          questionFlow: progConfig.questionFlow || 'freeFlow',
          attemptLimitEnabled: progConfig.attemptLimitEnabled || false,
          submissionAttempts: progConfig.submissionAttempts || 1
        };

        // Add counts based on configuration type
        if (progConfig.questionConfigType === 'general') {
          programmingConfig.generalQuestionCount = progConfig.generalQuestionCount || 0;
        } else if (progConfig.questionConfigType === 'levelBased') {
          programmingConfig.levelBasedCounts = progConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
        } else if (progConfig.questionConfigType === 'selectionLevel') {
          programmingConfig.selectionLevelCounts = progConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
        }

        payload.questionConfiguration.programmingConfig = programmingConfig;
      } 
      else if (exerciseData.exerciseType === 'Combined' && exerciseData.questionConfiguration) {
        const combinedConfig = exerciseData.questionConfiguration;
        
        if (combinedConfig.mcqConfig) {
          const mcqConfig = combinedConfig.mcqConfig;
          payload.questionConfiguration.mcqConfig = {
            questionConfigType: 'general',
            generalQuestionCount: mcqConfig.generalQuestionCount || 0,
            scoreSettings: {
              scoreType: 'evenMarks',
              evenMarks: mcqConfig.scoreSettings?.evenMarks || 0,
              totalMarks: mcqConfig.scoreSettings?.totalMarks || 0
            },
            attemptLimitEnabled: mcqConfig.attemptLimitEnabled || false,
            submissionAttempts: mcqConfig.submissionAttempts || 1
          };
        }

        if (combinedConfig.programmingConfig) {
          const progConfig = combinedConfig.programmingConfig;
          
          const programmingConfig: any = {
            questionConfigType: progConfig.questionConfigType || 'general',
            scoreSettings: progConfig.scoreSettings || {
              scoreType: 'evenMarks',
              evenMarks: 0,
              separateMarks: {
                general: [],
                levelBased: { easy: [], medium: [], hard: [] }
              },
              levelBasedMarks: { easy: 0, medium: 0, hard: 0 },
              totalMarks: 0
            },
            questionFlow: progConfig.questionFlow || 'freeFlow',
            attemptLimitEnabled: progConfig.attemptLimitEnabled || false,
            submissionAttempts: progConfig.submissionAttempts || 1
          };

          if (progConfig.questionConfigType === 'general') {
            programmingConfig.generalQuestionCount = progConfig.generalQuestionCount || 0;
          } else if (progConfig.questionConfigType === 'levelBased') {
            programmingConfig.levelBasedCounts = progConfig.levelBasedCounts || { easy: 0, medium: 0, hard: 0 };
          } else if (progConfig.questionConfigType === 'selectionLevel') {
            programmingConfig.selectionLevelCounts = progConfig.selectionLevelCounts || { easy: 0, medium: 0, hard: 0 };
          }

          payload.questionConfiguration.programmingConfig = programmingConfig;
        }
      }
    }

    console.log('🌐 Transformed payload for backend:', JSON.stringify(payload, null, 2));

    const entityPath = getEntityPath(entityType);
    const url = `${BASE_URL}/exercise/add/${entityPath}/${entityId}`;
    const token = localStorage.getItem("smartcliff_token");

    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }

    const response = await axios.put(
      url,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000,
      }
    );

    console.log('✅ Exercise added successfully:', response.data);
    return response.data;

  } catch (error: any) {
    console.error('❌ Error adding exercise:', error);

    if (error.response) {
      console.error('❌ Server response:', error.response.data);
      console.error('❌ Server status:', error.response.status);
      
      // More detailed error logging
      if (error.response.data?.message) {
        console.error('❌ Error messages:', error.response.data.message);
      }
      
      throw new Error(
        `Server error (${error.response.status}): ${typeof error.response.data === 'object'
          ? JSON.stringify(error.response.data)
          : error.response.data
        }`
      );
    } else if (error.request) {
      throw new Error('No response received from server. Please check your connection.');
    } else {
      throw error;
    }
  }
},

  // 2. GET EXERCISES (Updated)
  getExercises: async (
    entityType: EntityType,
    entityId: string,
    section: 'I_Do' | 'We_Do' | 'You_Do' = 'We_Do',
    subcategory?: string
  ): Promise<ExerciseResponse> => {
    try {
      const params = new URLSearchParams();
      params.append('section', section);
      if (subcategory) params.append('subcategory', subcategory);

      const entityPath = getEntityPath(entityType);
      const url = `${BASE_URL}/exercise/get/${entityPath}/${entityId}?${params.toString()}`;

      console.log('🔗 Fetching exercises:', {
        url,
        entityType,
        entityId,
        section,
        subcategory
      });

      const token = localStorage.getItem("smartcliff_token");
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await axios.get(
        url,
        {
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000,
        }
      );

      console.log('✅ Exercises fetched successfully:', {
        totalExercises: response.data?.data?.totalExercises || 0,
        exercisesCount: response.data?.data?.exercises?.length || 0
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching exercises:', {
        entityType,
        entityId,
        section,
        subcategory,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 401:
            throw new Error('Authentication failed. Please log in again.');
          case 403:
            throw new Error('You do not have permission to access these exercises.');
          case 404:
            throw new Error(`No exercises found for ${entityType} with ID: ${entityId}`);
          default:
            throw new Error(
              `Failed to fetch exercises (${status}): ${typeof data === 'object' ? JSON.stringify(data) : data
              }`
            );
        }
      } else if (error.request) {
        throw new Error('No response received from server. Please check your network connection.');
      } else {
        throw error;
      }
    }
  },

  // 3. GET EXERCISE BY ID (New)
  getExerciseById: async (exerciseId: string): Promise<any> => {
    try {
      const url = `${BASE_URL}/exercise/get-by-id/${exerciseId}`;

      console.log('🔍 Fetching exercise by ID:', {
        exerciseId,
        url
      });

      const token = localStorage.getItem("smartcliff_token");
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await axios.get(url, {
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000,
      });

      console.log('✅ Exercise fetched by ID:', {
        exerciseId: response.data?.data?.exercise?.exerciseId,
        name: response.data?.data?.exercise?.exerciseName
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching exercise by ID:', error);

      if (error.response?.status === 404) {
        throw new Error(`Exercise with ID ${exerciseId} not found`);
      }
      throw error;
    }
  },

  // 4. UPDATE EXERCISE (Updated)
  updateExercise: async (
    entityType: EntityType,
    entityId: string,
    exerciseId: string,
    exerciseData: ExercisePayload
  ): Promise<any> => {
    try {
      console.log('🔄 Updating exercise:', {
        entityType,
        entityId,
        exerciseId,
        data: exerciseData
      });

      // Transform to backend format (similar to addExercise)
      const payload: APIExercisePayload = {
        configurationType: exerciseData.configurationType,
        tabType: exerciseData.tabType,
        subcategory: exerciseData.subcategory,
        exerciseType: exerciseData.exerciseType,
        exerciseInformation: exerciseData.exerciseInformation,
        availabilityPeriod: exerciseData.availabilityPeriod,
        notificationGradeSettings: {
          notifyUsers: exerciseData.notificationSettings?.notifyUsers || false,
          notifyGmail: exerciseData.notificationSettings?.notifyGmail || false,
          notifyWhatsApp: exerciseData.notificationSettings?.notifyWhatsApp || false,
          gradeSheet: exerciseData.notificationSettings?.gradeSheet || true
        }
      };

      if (exerciseData.programmingSettings) {
        payload.programmingSettings = exerciseData.programmingSettings;
      }

      if (exerciseData.questionConfiguration) {
        console.log('🔧 Processing questionConfiguration for update:', exerciseData.questionConfiguration);

        if (exerciseData.exerciseType === 'MCQ' && exerciseData.questionConfiguration.mcqConfig) {
          const mcqConfig = exerciseData.questionConfiguration.mcqConfig;
          payload.questionConfiguration = {
            levelType: 'general',
            general: mcqConfig.generalQuestionCount,
            questionFlow: 'freeFlow',
            attemptLimitEnabled: mcqConfig.attemptLimitEnabled,
            submissionAttempts: mcqConfig.submissionAttempts,
            mcqScoreSettings: {
              scoreType: 'evenMarks',
              evenMarks: mcqConfig.scoreSettings.evenMarks,
              totalMarks: mcqConfig.scoreSettings.totalMarks
            }
          };
        } else if (exerciseData.exerciseType === 'Programming' && exerciseData.questionConfiguration.programmingConfig) {
          const progConfig = exerciseData.questionConfiguration.programmingConfig;
          const levelType = progConfig.questionConfigType === 'general' ? 'general' : 'levelBased';

          const questionConfig: any = {
            levelType: levelType,
            questionFlow: progConfig.questionFlow,
            attemptLimitEnabled: progConfig.attemptLimitEnabled,
            submissionAttempts: progConfig.submissionAttempts,
            programmingScoreSettings: progConfig.scoreSettings
          };

          if (progConfig.questionConfigType === 'general' && progConfig.generalQuestionCount !== undefined) {
            questionConfig.general = progConfig.generalQuestionCount;
          } else if (progConfig.levelBasedCounts) {
            questionConfig.levelBased = progConfig.levelBasedCounts;
          } else if (progConfig.selectionLevelCounts) {
            questionConfig.levelBased = progConfig.selectionLevelCounts;
          }

          payload.questionConfiguration = questionConfig;
        } else if (exerciseData.exerciseType === 'Combined' && exerciseData.questionConfiguration) {
          const combinedConfig = exerciseData.questionConfiguration;

          if (combinedConfig.mcqConfig && combinedConfig.programmingConfig) {
            const mcqConfig = combinedConfig.mcqConfig;
            const progConfig = combinedConfig.programmingConfig;
            const levelType = progConfig.questionConfigType === 'general' ? 'general' : 'levelBased';

            const questionConfig: any = {
              levelType: levelType,
              questionFlow: progConfig.questionFlow,
              attemptLimitEnabled: progConfig.attemptLimitEnabled,
              submissionAttempts: progConfig.submissionAttempts,
              mcqCount: mcqConfig.generalQuestionCount,
              mcqAttemptLimitEnabled: mcqConfig.attemptLimitEnabled,
              mcqSubmissionAttempts: mcqConfig.submissionAttempts,
              mcqScoreSettings: {
                scoreType: 'evenMarks',
                evenMarks: mcqConfig.scoreSettings.evenMarks,
                totalMarks: mcqConfig.scoreSettings.totalMarks
              },
              programmingScoreSettings: progConfig.scoreSettings
            };

            if (progConfig.questionConfigType === 'general' && progConfig.generalQuestionCount !== undefined) {
              questionConfig.general = progConfig.generalQuestionCount;
            } else if (progConfig.levelBasedCounts) {
              questionConfig.levelBased = progConfig.levelBasedCounts;
            } else if (progConfig.selectionLevelCounts) {
              questionConfig.levelBased = progConfig.selectionLevelCounts;
            }

            payload.questionConfiguration = questionConfig;
          }
        }
      }

      console.log('🌐 Transformed update payload:', JSON.stringify(payload, null, 2));

      const entityPath = getEntityPath(entityType);
      const url = `${BASE_URL}/exercise/update/${entityPath}/${entityId}/${exerciseId}`;
      const token = localStorage.getItem("smartcliff_token");

      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await axios.put(
        url,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000,
        }
      );

      console.log('✅ Exercise updated successfully:', response.data);
      return response.data;

    } catch (error: any) {
      console.error('❌ Error updating exercise:', {
        entityType,
        entityId,
        exerciseId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.response) {
        throw new Error(
          `Server error (${error.response.status}): ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        throw new Error('No response received from server. Please check your connection.');
      } else {
        throw error;
      }
    }
  },

  // 5. DELETE EXERCISE (Updated)
  deleteExercise: async (
    entityType: EntityType,
    entityId: string,
    exerciseId: string,
    section: 'I_Do' | 'We_Do' | 'You_Do' = 'We_Do',
    subcategory?: string
  ): Promise<any> => {
    try {
      const params = new URLSearchParams();
      params.append('section', section);
      if (subcategory) params.append('subcategory', subcategory);

      const entityPath = getEntityPath(entityType);
      const url = `${BASE_URL}/exercise/delete/${entityPath}/${entityId}/${exerciseId}?${params.toString()}`;

      console.log('🗑️ Deleting exercise:', {
        url,
        entityType,
        entityId,
        exerciseId,
        section,
        subcategory
      });

      const token = localStorage.getItem("smartcliff_token");
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await axios.delete(
        url,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 15000,
        }
      );

      console.log('✅ Exercise deleted successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error deleting exercise:', {
        entityType,
        entityId,
        exerciseId,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      if (error.response) {
        throw new Error(
          `Server error (${error.response.status}): ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        throw new Error('No response received from server. Please check your connection.');
      } else {
        throw error;
      }
    }
  },

  // 6. GET SUBCATEGORIES (Updated)
  getSubcategories: async (
    entityType: EntityType,
    entityId: string,
    section: 'I_Do' | 'We_Do' | 'You_Do' = 'We_Do'
  ): Promise<any> => {
    try {
      const params = new URLSearchParams();
      params.append('section', section);

      const entityPath = getEntityPath(entityType);
      const url = `${BASE_URL}/exercise/subcategories/${entityPath}/${entityId}?${params.toString()}`;

      console.log('📋 Fetching subcategories:', {
        url,
        entityType,
        entityId,
        section
      });

      const token = localStorage.getItem("smartcliff_token");
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await axios.get(
        url,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          timeout: 15000,
        }
      );

      console.log('✅ Subcategories fetched successfully:', {
        count: response.data?.data?.subcategories?.length || 0
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching subcategories:', error);
      throw error;
    }
  },

  // 7. GET EXERCISE STATISTICS (New)
  getExerciseStatistics: async (
    entityType: EntityType,
    entityId: string,
    section?: 'I_Do' | 'We_Do' | 'You_Do'
  ): Promise<any> => {
    try {
      let url = `${BASE_URL}/exercise/statistics/${getEntityPath(entityType)}/${entityId}`;

      if (section) {
        url += `?section=${section}`;
      }

      console.log('📊 Fetching exercise statistics:', {
        url,
        entityType,
        entityId,
        section
      });

      const token = localStorage.getItem("smartcliff_token");
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 30000,
      });

      console.log('✅ Exercise statistics fetched:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching exercise statistics:', error);
      // Return default statistics if API fails
      return {
        data: {
          totalExercises: 0,
          bySection: { 'I_Do': 0, 'We_Do': 0, 'You_Do': 0 },
          byType: { 'MCQ': 0, 'Programming': 0, 'Combined': 0 },
          byStatus: { 'active': 0, 'inactive': 0, 'scheduled': 0 }
        }
      };
    }
  }

};


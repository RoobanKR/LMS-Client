import axios from 'axios';

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

interface LevelConfiguration {
  levelType: 'levelBased' | 'general';
  levelBased: {
    easy: number;
    medium: number;
    hard: number;
  };
  general: number;
}

export interface ExerciseInformation {
  exerciseId: string;
  exerciseName: string;
  description: string;
  exerciseLevel: 'easy' | 'medium' | 'hard' | 'beginner' | 'intermediate' | 'advanced';
}

export interface ProgrammingSettings {
  selectedModule: string;
  selectedLanguages: string[];
  levelConfiguration: LevelConfiguration;
}

export interface CompilerSettings {
  allowCopyPaste: boolean;
  autoSuggestion: boolean;
  autoCloseBrackets: boolean;
}

export interface AvailabilityPeriod {
  startDate: string;
  endDate: string;
  gracePeriodAllowed: boolean;
  gracePeriodDate: string;
  extendedDays: number;
}

export interface QuestionBehavior {
  shuffleQuestions: boolean;
  allowNext: boolean;
  allowSkip: boolean;
  attemptLimitEnabled: boolean;
  maxAttempts: number;
}

export interface ManualEvaluation {
  enabled: boolean;
  submissionNeeded: boolean;
}

export interface EvaluationSettings {
  practiceMode: boolean;
  manualEvaluation: ManualEvaluation;
  aiEvaluation: boolean;
  automationEvaluation: boolean;
}

export interface GroupSettings {
  groupSettingsEnabled: boolean;
  showExistingUsers: boolean;
  selectedGroups: string[];
  chatEnabled: boolean;
}

export interface ScoreSettings {
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

// 1. Added SecuritySettings Interface
export interface SecuritySettings {
  timerEnabled: boolean;
  timerType: 'exercise' | 'question';
  timerDuration: number;
  cameraMicEnabled: boolean;
  tabSwitchAllowed: boolean;
  maxTabSwitches: number;
  disableClipboard: boolean;
  fullScreenMode: boolean;
  restrictMinimize: boolean; // <--- New Field
}

export interface ExerciseSettingsData {
  tabType: 'I_Do' | 'We_Do' | 'You_Do';
  subcategory: string;
  exerciseInformation: ExerciseInformation;
  programmingSettings: ProgrammingSettings;
  compilerSettings: CompilerSettings;
  availabilityPeriod: AvailabilityPeriod;
  questionBehavior: QuestionBehavior;
  evaluationSettings: EvaluationSettings;
  groupSettings: GroupSettings;
  scoreSettings: ScoreSettings;
  securitySettings: SecuritySettings; // 2. Added to Main Data Interface
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

const BASE_URL = 'https://lms-server-ym1q.onrender.com';

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
  
  addExercise: async (
    entityType: EntityType,
    entityId: string,
    exerciseData: {
      tabType: "I_Do" | "We_Do" | "You_Do";
      subcategory: string;
      exerciseInformation: {
        exerciseId: string;
        exerciseName: string;
        description?: string;
        exerciseLevel?: 'easy' | 'medium' | 'hard' | 'beginner' | 'intermediate' | 'advanced';
      };
      programmingSettings: {
        selectedModule: string;
        selectedLanguages: string[];
        levelConfiguration: {
          levelType: 'levelBased' | 'general';
          levelBased?: {
            easy: number;
            medium: number;
            hard: number;
          };
          general?: number;
        };
      };
      compilerSettings: {
        allowCopyPaste: boolean;
        autoSuggestion: boolean;
        autoCloseBrackets: boolean;
      };
      availabilityPeriod: {
        startDate: string;
        endDate: string;
        gracePeriodAllowed: boolean;
        gracePeriodDate?: string;
        extendedDays?: number;
      };
      questionBehavior: {
        shuffleQuestions: boolean;
        allowNext: boolean;
        allowSkip: boolean;
        attemptLimitEnabled: boolean;
        maxAttempts: number;
      };
      evaluationSettings: {
        practiceMode: boolean;
        manualEvaluation: {
          enabled: boolean;
          submissionNeeded: boolean;
        };
        aiEvaluation: boolean;
        automationEvaluation: boolean;
      };
      groupSettings: {
        groupSettingsEnabled: boolean;
        showExistingUsers: boolean;
        selectedGroups: string[];
        chatEnabled: boolean;
      };
      scoreSettings: {
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
      };
      // 3. Added SecuritySettings to function arguments
      securitySettings: {
        timerEnabled: boolean;
        timerType: 'exercise' | 'question';
        timerDuration: number;
        cameraMicEnabled: boolean;
        tabSwitchAllowed: boolean;
        maxTabSwitches: number;
        disableClipboard: boolean;
        fullScreenMode: boolean;
        restrictMinimize: boolean;
      };
    }
  ) => {
    // Prepare the complete payload with all settings
    const payload = {
      tabType: exerciseData.tabType,
      subcategory: exerciseData.subcategory,
      exerciseInformation: {
        exerciseId: exerciseData.exerciseInformation.exerciseId,
        exerciseName: exerciseData.exerciseInformation.exerciseName,
        description: exerciseData.exerciseInformation.description || '',
        exerciseLevel: exerciseData.exerciseInformation.exerciseLevel || 'intermediate'
      },
      programmingSettings: {
        selectedModule: exerciseData.programmingSettings.selectedModule,
        selectedLanguages: exerciseData.programmingSettings.selectedLanguages,
        levelConfiguration: {
          levelType: exerciseData.programmingSettings.levelConfiguration.levelType,
          levelBased: exerciseData.programmingSettings.levelConfiguration.levelBased || { easy: 0, medium: 0, hard: 0 },
          general: exerciseData.programmingSettings.levelConfiguration.general || 0
        }
      },
      compilerSettings: exerciseData.compilerSettings,
      availabilityPeriod: {
        startDate: exerciseData.availabilityPeriod.startDate,
        endDate: exerciseData.availabilityPeriod.endDate,
        gracePeriodAllowed: exerciseData.availabilityPeriod.gracePeriodAllowed,
        gracePeriodDate: exerciseData.availabilityPeriod.gracePeriodDate || '',
        extendedDays: exerciseData.availabilityPeriod.extendedDays || 0
      },
      questionBehavior: exerciseData.questionBehavior,
      evaluationSettings: exerciseData.evaluationSettings,
      groupSettings: exerciseData.groupSettings,
      scoreSettings: {
        scoreType: exerciseData.scoreSettings.scoreType,
        evenMarks: exerciseData.scoreSettings.evenMarks,
        separateMarks: exerciseData.scoreSettings.separateMarks,
        levelBasedMarks: exerciseData.scoreSettings.levelBasedMarks,
        totalMarks: exerciseData.scoreSettings.totalMarks
      },
      // 4. Added securitySettings to payload
      securitySettings: exerciseData.securitySettings
    };

    console.log('🌐 Sending exercise request with complete payload:', payload);

    // Get the correct path for the entity type
    const getEntityPath = (entityType: EntityType): string => {
      const mapping: Record<EntityType, string> = {
        'modules': 'modules',
        'submodules': 'submodules',
        'topics': 'topics',
        'subtopics': 'subtopics'
      };
      
      const path = mapping[entityType];
      if (!path) {
        console.error('Invalid entity type:', entityType);
        throw new Error(`Invalid entity type: ${entityType}`);
      }
      return path;
    };

    const entityPath = getEntityPath(entityType);
    const url = `${BASE_URL}/exercise/add/${entityPath}/${entityId}`;
    
    console.log('🔗 API URL:', url);
      const token = localStorage.getItem("smartcliff_token");

    try {
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
      console.error('❌ Error adding exercise:', {
        url,
        entityType,
        entityId,
        payload,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response) {
        const serverError = new Error(
          `Server error (${error.response.status}): ${JSON.stringify(error.response.data)}`
        );
        throw serverError;
      } else if (error.request) {
        throw new Error('No response received from server. Please check your connection.');
      } else {
        throw error;
      }
    }
  },

  // Get exercises from entity
  getExercises: async (
    entityType: EntityType,
    entityId: string,
    section: 'I_Do' | 'We_Do' | 'You_Do' = 'We_Do',
    subcategory?: string
  ) => {
    try {
      const params = new URLSearchParams();
      params.append('section', section);
      if (subcategory) params.append('subcategory', subcategory);

      // Get the correct path for the entity type
      const getEntityPath = (entityType: EntityType): string => {
        const mapping: Record<EntityType, string> = {
          'modules': 'modules',
          'submodules': 'submodules',
          'topics': 'topics',
          'subtopics': 'subtopics'
        };
        
        const path = mapping[entityType];
        if (!path) {
          console.error('Invalid entity type:', entityType);
          throw new Error(`Invalid entity type: ${entityType}`);
        }
        return path;
      };
  const token = localStorage.getItem("smartcliff_token");

      const entityPath = getEntityPath(entityType);
      const response = await axios.get(
        `${BASE_URL}/exercise/get/${entityPath}/${entityId}?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
             'Authorization': `Bearer ${token}`
          },
          timeout: 30000,
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching exercises:', error);
      throw error;
    }
  },

  // Update exercise with complete settings
  updateExercise: async (
    entityType: EntityType,
    entityId: string,
    exerciseId: string,
    exerciseData: {
      tabType: "I_Do" | "We_Do" | "You_Do";
      subcategory: string;
      exerciseInformation: {
        exerciseId: string;
        exerciseName: string;
        description?: string;
        exerciseLevel?: 'easy' | 'medium' | 'hard' | 'beginner' | 'intermediate' | 'advanced';
      };
      programmingSettings: {
        selectedModule: string;
        selectedLanguages: string[];
        levelConfiguration: {
          levelType: 'levelBased' | 'general';
          levelBased?: {
            easy: number;
            medium: number;
            hard: number;
          };
          general?: number;
        };
      };
      compilerSettings: {
        allowCopyPaste: boolean;
        autoSuggestion: boolean;
        autoCloseBrackets: boolean;
      };
      availabilityPeriod: {
        startDate: string;
        endDate: string;
        gracePeriodAllowed: boolean;
        gracePeriodDate?: string;
        extendedDays?: number;
      };
      questionBehavior: {
        shuffleQuestions: boolean;
        allowNext: boolean;
        allowSkip: boolean;
        attemptLimitEnabled: boolean;
        maxAttempts: number;
      };
      evaluationSettings: {
        practiceMode: boolean;
        manualEvaluation: {
          enabled: boolean;
          submissionNeeded: boolean;
        };
        aiEvaluation: boolean;
        automationEvaluation: boolean;
      };
      groupSettings: {
        groupSettingsEnabled: boolean;
        showExistingUsers: boolean;
        selectedGroups: string[];
        chatEnabled: boolean;
      };
      scoreSettings: {
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
      };
      // 5. Added SecuritySettings to update function arguments
      securitySettings: {
        timerEnabled: boolean;
        timerType: 'exercise' | 'question';
        timerDuration: number;
        cameraMicEnabled: boolean;
        tabSwitchAllowed: boolean;
        maxTabSwitches: number;
        disableClipboard: boolean;
        fullScreenMode: boolean;
        restrictMinimize: boolean;
      };
    }
  ) => {
    // Prepare the complete payload with all settings
    const payload = {
      tabType: exerciseData.tabType,
      subcategory: exerciseData.subcategory,
      exerciseInformation: {
        exerciseId: exerciseData.exerciseInformation.exerciseId,
        exerciseName: exerciseData.exerciseInformation.exerciseName,
        description: exerciseData.exerciseInformation.description || '',
        exerciseLevel: exerciseData.exerciseInformation.exerciseLevel || 'intermediate'
      },
      programmingSettings: {
        selectedModule: exerciseData.programmingSettings.selectedModule,
        selectedLanguages: exerciseData.programmingSettings.selectedLanguages,
        levelConfiguration: {
          levelType: exerciseData.programmingSettings.levelConfiguration.levelType,
          levelBased: exerciseData.programmingSettings.levelConfiguration.levelBased || { easy: 0, medium: 0, hard: 0 },
          general: exerciseData.programmingSettings.levelConfiguration.general || 0
        }
      },
      compilerSettings: exerciseData.compilerSettings,
      availabilityPeriod: {
        startDate: exerciseData.availabilityPeriod.startDate,
        endDate: exerciseData.availabilityPeriod.endDate,
        gracePeriodAllowed: exerciseData.availabilityPeriod.gracePeriodAllowed,
        gracePeriodDate: exerciseData.availabilityPeriod.gracePeriodDate || '',
        extendedDays: exerciseData.availabilityPeriod.extendedDays || 0
      },
      questionBehavior: exerciseData.questionBehavior,
      evaluationSettings: exerciseData.evaluationSettings,
      groupSettings: exerciseData.groupSettings,
      scoreSettings: {
        scoreType: exerciseData.scoreSettings.scoreType,
        evenMarks: exerciseData.scoreSettings.evenMarks,
        separateMarks: exerciseData.scoreSettings.separateMarks,
        levelBasedMarks: exerciseData.scoreSettings.levelBasedMarks,
        totalMarks: exerciseData.scoreSettings.totalMarks
      },
      // 6. Added securitySettings to update payload
      securitySettings: exerciseData.securitySettings
    };

    console.log('🌐 Updating exercise with complete payload:', payload);

    // Get the correct path for the entity type
    const getEntityPath = (entityType: EntityType): string => {
      const mapping: Record<EntityType, string> = {
        'modules': 'modules',
        'submodules': 'submodules',
        'topics': 'topics',
        'subtopics': 'subtopics'
      };
      
      const path = mapping[entityType];
      if (!path) {
        console.error('Invalid entity type:', entityType);
        throw new Error(`Invalid entity type: ${entityType}`);
      }
      return path;
    };

    const entityPath = getEntityPath(entityType);
    const url = `${BASE_URL}/exercise/update/${entityPath}/${entityId}/${exerciseId}`;
    
    console.log('🔗 API URL:', url);
    
    try {
      const response = await axios.put(
        url,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      console.log('✅ Exercise updated successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating exercise:', {
        url,
        entityType,
        entityId,
        exerciseId,
        payload,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response) {
        const serverError = new Error(
          `Server error (${error.response.status}): ${JSON.stringify(error.response.data)}`
        );
        throw serverError;
      } else if (error.request) {
        throw new Error('No response received from server. Please check your connection.');
      } else {
        throw error;
      }
    }
  },

  // Delete exercise
  deleteExercise: async (
    entityType: EntityType,
    entityId: string,
    exerciseId: string,
    section: 'I_Do' | 'We_Do' | 'You_Do' = 'We_Do',
    subcategory: string
  ) => {
    try {
      const params = new URLSearchParams();
      params.append('tabType', section);
      params.append('subcategory', subcategory);

      // Get the correct path for the entity type
      const getEntityPath = (entityType: EntityType): string => {
        const mapping: Record<EntityType, string> = {
          'modules': 'modules',
          'submodules': 'submodules',
          'topics': 'topics',
          'subtopics': 'subtopics'
        };
        
        const path = mapping[entityType];
        if (!path) {
          console.error('Invalid entity type:', entityType);
          throw new Error(`Invalid entity type: ${entityType}`);
        }
        return path;
      };

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

      const response = await axios.delete(
        url,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      
      console.log('✅ Exercise deleted successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error deleting exercise:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      if (error.response) {
        const serverError = new Error(
          `Server error (${error.response.status}): ${JSON.stringify(error.response.data)}`
        );
        throw serverError;
      } else if (error.request) {
        throw new Error('No response received from server. Please check your connection.');
      } else {
        throw error;
      }
    }
  },

  // Get subcategories
  getSubcategories: async (
    entityType: EntityType,
    entityId: string,
    section: 'I_Do' | 'We_Do' | 'You_Do' = 'We_Do'
  ) => {
    try {
      const params = new URLSearchParams();
      params.append('section', section);

      // Get the correct path for the entity type
      const getEntityPath = (entityType: EntityType): string => {
        const mapping: Record<EntityType, string> = {
          'modules': 'modules',
          'submodules': 'submodules',
          'topics': 'topics',
          'subtopics': 'subtopics'
        };
        
        const path = mapping[entityType];
        if (!path) {
          console.error('Invalid entity type:', entityType);
          throw new Error(`Invalid entity type: ${entityType}`);
        }
        return path;
      };

      const entityPath = getEntityPath(entityType);
      const response = await axios.get(
        `${BASE_URL}/exercise/subcategories/${entityPath}/${entityId}?${params.toString()}`,
        {
          timeout: 15000,
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching subcategories:', error);
      throw error;
    }
  }
};
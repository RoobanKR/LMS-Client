// types.tsx
import { ReactNode } from "react";
import { SecuritySettingsData } from "./SecuritySettings";

export interface ExercisePayload {
  configurationType: "manual";
  tabType: "I_Do" | "We_Do" | "You_Do";
  subcategory: string;
  exerciseType: "MCQ";
  exerciseInformation: {
    exerciseId: string;
    exerciseName: string;
    description: string;
    exerciseLevel: "beginner" | "intermediate" | "expert";
    totalDuration: number;
    totalMarks: number;
  };
  totalMarksMCQ?: number;
  questionConfiguration: any;
  availabilityPeriod: any;
  notificationSettings: any;
  securitySettings: SecuritySettingsData;
}

export interface HierarchyData {
  courseName: string;
  moduleName: string;
  submoduleName: string;
  topicName: string;
  subtopicName: string;
  nodeType: string;
  level: number;
}

export interface ExerciseSettingsProps {
  hierarchyData: HierarchyData;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  subcategory: string;
onSave?: (payload: any) => void;
  onClose: () => void;
  isEditing?: boolean;
  tabType?: "I_Do" | "We_Do" | "You_Do";
  initialData?: any;
  exercise_Id?: string;
  exerciseData?: any;   // pre-loaded raw exercise — skips API fetch on edit
  courseId?: string;

 
}
// assessments/types.ts - Add these to existing types

export interface BaseConfigProps {
  formData: FormDataType;
  setFormData: React.Dispatch<React.SetStateAction<FormDataType>>;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  validationErrors: ValidationErrors;
  touchedFields: Set<string>;
  markTouched: (field: string) => void;
  InfoTooltip: React.FC<{ content: string; side?: string }>;
  SectionLabel: React.FC<{ children: React.ReactNode; required?: boolean; info?: string }>;
  ODropdown: React.FC<any>;
  ONumberInput: React.FC<any>;
  OToggle: React.FC<any>;
  OInput: React.FC<any>;
  D: typeof D;
  mcqScoringOptions: { value: string; label: string }[];
  configOptions: { value: string; label: string }[];
  questionFlowOptions: { value: string; label: string; description: string; icon: React.ReactNode }[];
  getProgrammingTotalQuestions?: () => number;
  programmingAllocatedMarks?: number;
  programmingLevelMismatch?: string | null;
  shouldShowScoringSection?: boolean;
  othersAllocatedMarks?: number;
  othersLevelMismatch?: string | null;
  othersShouldShowScoringSection?: boolean;
  updateLevelScoringConfig?: (level: 'easy' | 'medium' | 'hard', updates: any) => void;
  updateOthersLevelScoringConfig?: (level: 'easy' | 'medium' | 'hard', updates: any) => void;
  setExpandedSections?: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedSections?: Set<string>;
  combinedConfigTab?: 'mcq' | 'programming';
  setCombinedConfigTab?: React.Dispatch<React.SetStateAction<'mcq' | 'programming'>>;
}
export interface Step {
  id: number;
  title: string;
  subtitle: string;
  completed: boolean;
  active: boolean;
  icon: React.ReactNode;
  indentLevel?: number;
  isChild?: boolean;
}

export interface ValidationErrors {
  exerciseType?: string;
  selectedModule?: string;
  selectedLanguages?: string;
  exerciseId?: string;
  exerciseName?: string;
  description?: string;
  totalDuration?: string;
  totalMarks?: string;
  totalMarksMCQ?: string;
  mcqGeneralQuestionCount?: string;
  mcqMarksPerQuestion?: string;
  mcqTotalMarks?: string;
  startDate?: string;
  endDate?: string;
  gracePeriod?: string;
  [key: string]: any;
}

export interface FormDataType {
  exerciseType: "" | "MCQ";
  selectedModule: string;
  selectedLanguages: string[];
  exerciseId: string;
    testType?: "practice" | "mock" | "final";  // ← ADD THIS

  exerciseName: string;
  description: string;
  exerciseLevel: "beginner" | "intermediate" | "expert";
  totalDuration: number;
  totalMarks: number;
  totalMarksMCQ: number;
  mcqConfig: any;
  schedule: any;
  notifyUsers: boolean;
  notifyGmail: boolean;
  notifyWhatsApp: boolean;
  gradeSheet: boolean;
  notifications: {
    notifyGradersSubmissions: boolean;
    notifyGradersLateSubmissions: boolean;
    notifyStudent: boolean;
  };
  grades: {
    mcqGrade: number | null;
    mcqGradeToPass: number | null;
    combinedGrade: number | null;
    combinedGradeToPass: number | null;
    separateMarks: boolean;
  };
  additionalOptions: {
    anonymousSubmissions: boolean;
    hideGraderIdentity: boolean;
  };
  securitySettings: SecuritySettingsData; // ← ADD THIS
  sectionBasedDuration?: boolean; // ← ADD THIS
}



export interface SectionBasedConfig {
  sectionName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  totalMarks: number;
  questionCount: number;
  marksPerQuestion: number;
}

export interface SectionScoringConfig {
  sections: {
    [sectionId: string]: {
      name: string;
      difficulty: 'easy' | 'medium' | 'hard';
      marksPerQuestion: number;
      questionCount: number;
      totalMarks: number;
    };
  };
  totalSections: number;
  totalQuestions: number;
  totalMarks: number;
}




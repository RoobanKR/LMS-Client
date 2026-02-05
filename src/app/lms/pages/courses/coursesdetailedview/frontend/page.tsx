"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FrontendCompiler from '@/app/lms/component/student/frontendCompiler';

const CompilerPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [exerciseData, setExerciseData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courseId, setCourseId] = useState<string>("");
  const [previousSubmission, setPreviousSubmission] = useState<any>(null);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);

  // --- READ PARAMS ---
  const subcategory = searchParams.get('subcategory') || "practical";
  const categoryParam = searchParams.get('category');
  const category = categoryParam || "We_Do";
  const exerciseName = searchParams.get('exerciseName');
  const urlCourseId = searchParams.get('courseId') || "";
  const exerciseId = searchParams.get('exerciseId');

  // Function to fetch previous submission
  const fetchPreviousSubmission = async (questionId: string) => {
    if (!courseId || !exerciseId || !questionId || !category) {
      console.warn("Missing required parameters for fetching submission");
      return null;
    }

    setIsLoadingSubmission(true);
    try {
      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
      
      if (!token) {
        console.error("Authentication token missing");
        return null;
      }

      const response = await fetch(
        `http://localhost:5533/courses/answers/previous-submission?courseId=${courseId}&exerciseId=${exerciseId}&questionId=${questionId}&category=${category}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          console.log("Loaded submission data:", {
            files: data.data.files?.length || 0,
            folders: data.data.folders?.length || 0,
            rawData: data.data
          });
          return data.data;
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching previous submission:", error);
      return null;
    } finally {
      setIsLoadingSubmission(false);
    }
  };

  // Enhanced function to transform submission data
  const transformSubmissionToCompilerFormat = (submission: any) => {
    if (!submission) {
      console.log("No submission data to transform");
      return null;
    }

    console.log("Transforming submission:", {
      filesCount: submission.files?.length || 0,
      foldersCount: submission.folders?.length || 0,
      submissionKeys: Object.keys(submission)
    });

    // Transform files from submission
    const transformedFiles = (submission.files || []).map((file: any, index: number) => {
      // Determine language from filename if not provided
      let language = file.language;
      if (!language && file.filename) {
        const ext = file.filename.split('.').pop()?.toLowerCase();
        if (ext === 'html' || ext === 'htm') language = 'html';
        else if (ext === 'css') language = 'css';
        else if (ext === 'js') language = 'javascript';
        else if (ext === 'json') language = 'json';
        else if (ext === 'xml') language = 'xml';
        else if (ext === 'md' || ext === 'markdown') language = 'markdown';
        else if (ext === 'txt') language = 'text';
        else language = 'text';
      }

      return {
        id: file.id || `file-${Date.now()}-${index}`,
        filename: file.filename || `file${index}.txt`,
        content: file.content || '',
        language: language || 'text',
        path: file.path || `/${file.filename}`,
        folderPath: file.folderPath || '/',
        isEntryPoint: file.isEntryPoint || false,
        lastModified: file.lastModified ? new Date(file.lastModified) : new Date(),
        size: file.size || (file.content ? Buffer.byteLength(file.content, 'utf8') : 0),
        isDirty: false
      };
    });

    // Transform folders from submission
    const transformedFolders = (submission.folders || []).map((folder: any, index: number) => {
      const path = folder.path || `/${folder.name}`;
      const parentPath = folder.parentPath || '/';
      
      return {
        id: folder.id || `folder-${Date.now()}-${index}`,
        name: folder.name || `folder${index}`,
        path: path,
        parentPath: parentPath,
        children: [],
        folderChildren: [],
        isOpen: true,
        depth: folder.depth || (path.split('/').filter(Boolean).length - 1)
      };
    });

    // If we have files but no folders, create a root folder
    if (transformedFiles.length > 0 && transformedFolders.length === 0) {
      transformedFolders.push({
        id: 'folder-root',
        name: 'Root',
        path: '/',
        parentPath: '',
        children: [],
        folderChildren: [],
        isOpen: true,
        depth: 0
      });
    }

    console.log("Transformed data:", {
      files: transformedFiles.length,
      folders: transformedFolders.length,
      sampleFile: transformedFiles[0],
      sampleFolder: transformedFolders[0]
    });

    return {
      files: transformedFiles,
      folders: transformedFolders,
      submissionData: submission
    };
  };

  useEffect(() => {
    const loadExerciseData = async () => {
      if (typeof window !== 'undefined') {
        const storedData = localStorage.getItem('currentFrontendExercise');
        
        if (storedData) {
          try {
            const parsedData = JSON.parse(storedData);
           
            let extractedCourseId = urlCourseId || parsedData.courseId || parsedData.context?.courseId || "";
            setCourseId(extractedCourseId);
           
            let extractedQuestions = [];
            if (parsedData.questions && Array.isArray(parsedData.questions)) {
              extractedQuestions = parsedData.questions;
            } else if (parsedData.exerciseInformation?.questions) {
              extractedQuestions = parsedData.exerciseInformation.questions;
            }
           
            setExerciseData(parsedData);
            setQuestions(extractedQuestions);

            console.log("Loaded exercise data:", {
              courseId: extractedCourseId,
              exerciseId,
              questionsCount: extractedQuestions.length
            });

            // If there's a current question, try to load previous submission
            if (extractedQuestions.length > 0 && extractedCourseId && exerciseId) {
              const currentQuestion = extractedQuestions[0];
              const questionId = getQuestionId(currentQuestion);
              
              if (questionId) {
                console.log("Fetching submission for question:", questionId);
                const submission = await fetchPreviousSubmission(questionId);
                if (submission) {
                  console.log("Submission received:", submission);
                  setPreviousSubmission(submission);
                } else {
                  console.log("No previous submission found");
                }
              }
            }
           
          } catch (error) {
            console.error("❌ Error parsing exercise data:", error);
          }
        }
        setIsLoading(false);
      }
    };
    loadExerciseData();
  }, [urlCourseId, exerciseId, exerciseName, subcategory]);

  // Helper function to get question ID
  const getQuestionId = (question: any) => {
    if (!question) return null;
    
    const possibleIds = [
      question._id,
      question.id,
      question.questionId,
      question.question_id,
      question.questionID
    ];
    
    const foundId = possibleIds.find(id => id && id.toString().trim() !== '');
    
    if (!foundId) {
      console.warn('No question ID found in:', question);
      return null;
    }
    
    return foundId.toString();
  };

  const handleBack = () => {
    localStorage.removeItem('currentFrontendExercise');
    router.back();
  };

  if (isLoading) return <div className="w-full h-screen bg-[#1e1e1e] flex items-center justify-center text-white">Loading...</div>;

  const behaviorSettings = exerciseData?.questionBehavior || {};
  const exerciseInfo = exerciseData?.exerciseInformation || {};
  const settings = exerciseData?.programmingSettings || {};
  const security = exerciseData?.securitySettings || {};

  const entityId = exerciseData?.nodeId || exerciseData?.context?.entityId || "";
  const entityType = exerciseData?.nodeType || exerciseData?.context?.entityType || "topics";

  // Transform previous submission if available
  const previousSubmissionData = previousSubmission 
    ? transformSubmissionToCompilerFormat(previousSubmission)
    : null;

  console.log("Rendering with data:", {
    hasPreviousSubmission: !!previousSubmission,
    hasTransformedData: !!previousSubmissionData,
    files: previousSubmissionData?.files?.length || 0,
    folders: previousSubmissionData?.folders?.length || 0,
    isLoadingSubmission
  });

  return (
    <div className="w-full h-screen bg-[#1e1e1e] overflow-hidden">
    <FrontendCompiler
  onBack={handleBack}
  title={exerciseInfo.exerciseName || exerciseName || "Frontend Lab"}
  questions={questions}
  selectedLanguages={settings.selectedLanguages}
  level={exerciseInfo.exerciseLevel || "beginner"}
  attemptLimitEnabled={behaviorSettings.attemptLimitEnabled}
  maxAttempts={behaviorSettings.maxAttempts}
  entityId={entityId}
  entityType={entityType}
  security={security}
  exerciseId={exerciseData?._id || exerciseInfo._id || exerciseId || ""}
  courseId={courseId}
  category={category}
  subcategory={subcategory}
  selectedProgrammingLanguage={exerciseData?.programmingSettings?.selectedModule}
  
  // Pass previous submission data if available
  initialFiles={previousSubmissionData?.files}
  initialFolders={previousSubmissionData?.folders}
  isLoadingSubmission={isLoadingSubmission}
  
  // Pass current question index
  initialQuestionIndex={0}
/>

    </div>
  );
};

export default function FrontendCompilerPage() {
  return (
    <Suspense fallback={<div className="text-white bg-[#1e1e1e]">Loading compiler...</div>}>
      <CompilerPageContent />
    </Suspense>
  );
}
"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MCQ from '@/app/lms/component/student/mcq';
import { Loader2, ArrowLeft } from 'lucide-react';

const MCQPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [exerciseData, setExerciseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string>("");

  // Extract parameters
  const subcategory = searchParams.get('subcategory') || "Assessment";
  const category = searchParams.get('category') || "Course Work";
  const exerciseName = searchParams.get('exerciseName');
  const urlCourseId = searchParams.get('courseId') || "";
  const exerciseId = searchParams.get('exerciseId');
  const nodeId = searchParams.get('nodeId');

  // Load exercise data
  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const storedData = localStorage.getItem('currentMCQExercise');
        
        if (!storedData) {
          throw new Error('No assessment data available');
        }
        
        const parsedData = JSON.parse(storedData);
        
        if (!parsedData || !Array.isArray(parsedData.questions) || parsedData.questions.length === 0) {
          throw new Error('Invalid assessment data');
        }
        
        setExerciseData(parsedData);
        
        const extractedCourseId = urlCourseId || 
                                 parsedData.courseId || 
                                 parsedData.context?.courseId || 
                                 "";
        setCourseId(extractedCourseId);
        
      } catch (error: any) {
        console.error("Error loading assessment:", error);
        setError(error.message || 'Failed to load assessment');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [urlCourseId]);

  // Handle exercise close
  const handleCloseExercise = () => {
    localStorage.removeItem('currentMCQExercise');
    if (courseId) {
      router.push(`/lms/pages/courses/coursesdetailedview/${courseId}?refresh=true`);
    } else {
      router.back();
    }
  };

  // Get student ID
  const getStudentId = () => {
    if (typeof window !== 'undefined') {
      try {
        const userData = localStorage.getItem('userData');
        if (userData) {
          const parsed = JSON.parse(userData);
          return parsed._id || parsed.id || parsed.userId || 'unknown_student';
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
    return 'unknown_student';
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gray-900 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Preparing assessment...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors w-full"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Prepare exercise data object
  const exerciseInfo = exerciseData.exerciseInformation || exerciseData;
  const questionConfig = exerciseData.questionConfiguration?.mcqQuestionConfiguration || {};
  
  const formattedExercise = {
    _id: exerciseData._id || exerciseId || '',
    title: exerciseInfo.exerciseName || exerciseName || 'Assessment',
    description: exerciseInfo.description || '',
    totalQuestions: exerciseData.questions?.length || 0,
    totalPoints: questionConfig.mcqTotalMarks || exerciseData.questions?.length || 0,
    estimatedTime: exerciseInfo.totalDuration || 30,
    questions: exerciseData.questions || [],
    questionConfiguration: exerciseData.questionConfiguration // pass full config
  };

  const studentId = getStudentId();

  return (
    <div className="min-h-screen bg-white">
       {/* Removed the fixed Back button here because Breadcrumbs inside MCQ now handle navigation context visually */}
      <MCQ
        exercise={formattedExercise}
        courseId={courseId}
        nodeId={nodeId || exerciseData.nodeId || ''}
        onCloseExercise={handleCloseExercise}
        studentId={studentId}
        category={category}
        subcategory={subcategory}
      />
    </div>
  );
};

// Main page component
export default function MCQPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-gray-900 animate-spin" />
        </div>
      }
    >
      <MCQPageContent />
    </Suspense>
  );
}
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
  
  // --- READ PARAMS ---
  const subcategory = searchParams.get('subcategory') || "practical"; 
  const categoryParam = searchParams.get('category'); // <--- GET CATEGORY
  // Default to 'We_Do' if not found, but prefer the URL param
  const category = categoryParam || "We_Do"; 

  const exerciseName = searchParams.get('exerciseName');
  const urlCourseId = searchParams.get('courseId') || "";
  const exerciseId = searchParams.get('exerciseId');

  useEffect(() => {
    const loadExerciseData = () => {
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
            
          } catch (error) {
            console.error("❌ Error parsing exercise data:", error);
          }
        }
        setIsLoading(false);
      }
    };
    loadExerciseData();
  }, [urlCourseId, exerciseId, exerciseName, subcategory]);

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
console.log("sss",category)
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
        category={category} // <--- PASSING DYNAMIC CATEGORY HERE
        subcategory={subcategory}
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
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Home, CheckCircle, Flag, ArrowLeft, Loader } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Helper Components ---
const Breadcrumbs = ({ category, subcategory, title }: { category: string, subcategory: string, title: string }) => (
  <nav className="flex text-gray-500 text-xs mb-2" aria-label="Breadcrumb">
    <ol className="inline-flex items-center space-x-1">
      <li className="inline-flex items-center">
        <span className="inline-flex items-center hover:text-blue-600">
          <Home size={12} className="mr-1" />
          Home
        </span>
      </li>
      <li>
        <div className="flex items-center">
          <ChevronRight size={12} />
          <span className="ml-1 text-xs font-medium hover:text-blue-600 capitalize">
            {category.replace(/_/g, ' ')}
          </span>
        </div>
      </li>
      {subcategory && (
        <li>
          <div className="flex items-center">
            <ChevronRight size={12} />
            <span className="ml-1 text-xs font-medium hover:text-blue-600 capitalize">
              {subcategory}
            </span>
          </div>
        </li>
      )}
      <li aria-current="page">
        <div className="flex items-center">
          <ChevronRight size={12} />
          <span className="ml-1 text-xs font-medium text-gray-800 truncate max-w-[120px]">
            {title}
          </span>
        </div>
      </li>
    </ol>
  </nav>
);

const OptionCard = ({
  option,
  isSelected,
  onSelect
}: {
  option: { id: string; text: string };
  isSelected: boolean;
  onSelect: () => void;
}) => (
  <button
    onClick={onSelect}
    className={`relative flex items-center p-3 rounded-lg border transition-all duration-200 h-16
      ${isSelected
        ? 'border-gray-800 bg-gray-50'
        : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
  >
    <span className={`w-7 font-semibold text-base mr-3 ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
      {option.id}.
    </span>
    <span className={`font-medium text-sm ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
      {option.text}
    </span>
  </button>
);

const LoadingSpinner = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-3 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
);

const CompletionScreen = ({ onClose }: { onClose: () => void }) => (
  <div className="min-h-screen bg-white flex items-center justify-center p-4">
    <div className="bg-white border rounded-lg shadow p-4 w-full max-w-sm text-center">
      <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
      <h1 className="text-lg font-bold text-gray-900 mb-2">Assessment Completed</h1>
      <p className="text-gray-500 text-xs mb-4">
        You have successfully submitted your answers.
      </p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-gray-900 text-white rounded font-medium hover:bg-gray-800 transition-colors text-sm"
      >
        Return to Course
      </button>
    </div>
  </div>
);

// --- Main MCQ Interface ---
interface MCQProps {
  exercise?: any;
  courseId?: string;
  nodeId?: string;
  onCloseExercise?: () => void;
  category?: string;
  subcategory?: string;
  studentId?: string;
}

const MCQ = ({
  exercise,
  courseId = "",
  nodeId = "",
  onCloseExercise,
  category = "Course",
  subcategory = "Assessment",
}: MCQProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { id: string; text: string }>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [exerciseData, setExerciseData] = useState<any>(null);

  // Refs
  const answersRef = useRef<Record<string, { id: string; text: string }>>({});

  // Get URL parameters
  const urlCourseId = searchParams.get('courseId');
  const urlExerciseId = searchParams.get('exerciseId');
  const urlExerciseName = searchParams.get('exerciseName');
  const urlSubcategory = searchParams.get('subcategory');
  const urlCategory = searchParams.get('category');
  const urlQuestionCount = searchParams.get('questionCount');

  // Fetch exercise data from API
  useEffect(() => {
    const fetchExerciseData = async () => {
      try {
        setLoading(true);
        
        // Use URL parameters first, fall back to props
        const finalExerciseId = urlExerciseId || (exercise?._id);
        
        if (!finalExerciseId) {
          toast.error('Exercise ID is required');
          setLoading(false);
          return;
        }

        console.log('📡 Fetching exercise data from API...');
        console.log('Exercise ID:', finalExerciseId);

        // Get auth token
        const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
        
        if (!token) {
          toast.error('Authentication token not found');
          setLoading(false);
          return;
        }

        // Fetch exercise data using the correct endpoint
        const response = await fetch(`http://localhost:5533/exercise/${finalExerciseId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Exercise data fetched:', data);

        if (data.message?.[0]?.key === 'success' && data.data?.exercise) {
          const fetchedExercise = data.data.exercise;
          setExerciseData(fetchedExercise);

          // Process questions from the API response
          const processedQuestions = fetchedExercise.questions.map((q: any, index: number) => {
            // Map options with IDs (A, B, C, D, etc.)
            const optionsWithIds = (q.options || []).map((opt: string, optIndex: number) => ({
              id: String.fromCharCode(65 + optIndex), // A, B, C, D
              text: opt
            }));

            return {
              _id: q._id,
              question: q.questionTitle, // Using questionTitle from API
              options: optionsWithIds,
              correctAnswer: q.correctAnswer,
              difficulty: q.difficulty || 'medium',
              score: q.score || 10
            };
          });

          console.log('📊 Processed questions:', processedQuestions);

          // Check if shuffling is enabled
          const shouldShuffle = fetchedExercise.questionConfiguration?.mcqQuestionConfiguration?.shuffleQuestions;
          const questionList = shouldShuffle
            ? [...processedQuestions].sort(() => Math.random() - 0.5)
            : processedQuestions;

          setQuestions(questionList);
          console.log(`✅ Loaded ${questionList.length} questions`);

          // Load saved answers from localStorage
          const savedAnswers = localStorage.getItem(`mcq_answers_${finalExerciseId}`);
          if (savedAnswers) {
            try {
              const parsed = JSON.parse(savedAnswers);
              answersRef.current = parsed;
              setAnswers(parsed);

              // Set selected option for first question if exists
              const firstQuestionId = questionList[0]?._id;
              if (firstQuestionId && parsed[firstQuestionId]) {
                setSelectedOption(parsed[firstQuestionId].id);
              }
            } catch (e) {
              console.error('Error parsing saved answers:', e);
            }
          }

          setQuizStarted(true);
        } else {
          toast.error(data.message?.[0]?.value || 'Failed to load exercise data');
        }
      } catch (error) {
        console.error('❌ Error fetching exercise:', error);
        toast.error('Failed to load assessment from server');
        
        // Fallback: Try to use props if API fails
        if (exercise) {
          console.log('Using fallback exercise data from props');
          handleFallbackExercise(exercise);
        }
      } finally {
        setLoading(false);
      }
    };

    // Fallback function
    const handleFallbackExercise = (exerciseData: any) => {
      try {
        const processedQuestions = exerciseData.questions.map((q: any, index: number) => {
          const optionsWithIds = (q.options || []).map((opt: string, optIndex: number) => ({
            id: String.fromCharCode(65 + optIndex),
            text: opt
          }));

          return {
            _id: q._id,
            question: q.questionTitle,
            options: optionsWithIds,
            correctAnswer: q.correctAnswer
          };
        });

        const shouldShuffle = exerciseData.questionConfiguration?.mcqQuestionConfiguration?.shuffleQuestions;
        const questionList = shouldShuffle
          ? [...processedQuestions].sort(() => Math.random() - 0.5)
          : processedQuestions;

        setQuestions(questionList);
        setQuizStarted(true);
        setExerciseData(exerciseData);
      } catch (error) {
        console.error('Error in fallback:', error);
        toast.error('Failed to load assessment data');
      }
    };

    fetchExerciseData();
  }, [urlExerciseId]);

  // Handle option selection
  const handleOptionSelect = (optionId: string) => {
    if (quizCompleted) return;
    setSelectedOption(optionId);

    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      const selectedOptionData = currentQuestion.options.find((opt: any) => opt.id === optionId);
      if (selectedOptionData) {
        const updatedAnswers = {
          ...answers,
          [currentQuestion._id]: {
            id: optionId,
            text: selectedOptionData.text
          }
        };
        setAnswers(updatedAnswers);
        answersRef.current = updatedAnswers;

        // Save to localStorage
        if (exerciseData?._id) {
          localStorage.setItem(`mcq_answers_${exerciseData._id}`, JSON.stringify(updatedAnswers));
        }
      }
    }
  };

  // Toggle flag for review
  const toggleFlag = (index: number) => {
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Save current answer to backend
  const saveCurrentAnswer = async () => {
    if (!selectedOption || !questions[currentQuestionIndex] || !exerciseData) return;

    const currentQuestion = questions[currentQuestionIndex];
    const selectedOptionData = currentQuestion.options.find((opt: any) => opt.id === selectedOption);

    if (!selectedOptionData) return;

    try {
      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
      const finalCourseId = urlCourseId || courseId;
      const finalCategory = urlCategory || category;
      const finalSubcategory = urlSubcategory || subcategory;

      if (!finalCourseId || !exerciseData._id) {
        toast.error('Missing required data for submission');
        return;
      }

      const formData = new FormData();
      formData.append('courseId', finalCourseId);
      formData.append('exerciseId', exerciseData._id);
      formData.append('questionId', currentQuestion._id);
      formData.append('code', selectedOptionData.text);
      formData.append('score', "0");
      formData.append('status', 'attempted');
      formData.append('category', finalCategory);
      formData.append('subcategory', finalSubcategory);
      formData.append('nodeId', nodeId || "");
      formData.append('nodeName', exerciseData.exerciseInformation?.exerciseName || "MCQ Assessment");
      formData.append('nodeType', "mcq");
      formData.append('language', "text");

      const attemptLimitEnabled = exerciseData.questionConfiguration?.mcqQuestionConfiguration?.attemptLimitEnabled || false;
      const maxAttempts = exerciseData.questionConfiguration?.mcqQuestionConfiguration?.submissionAttempts || 1;

      formData.append('attemptLimitEnabled', attemptLimitEnabled.toString());
      formData.append('maxAttempts', maxAttempts.toString());

      const response = await fetch('http://localhost:5533/courses/answers/submit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Answer saved:', result);

    } catch (error) {
      console.error('❌ Error saving answer:', error);
      toast.error('Failed to save answer. Please try again.');
    }
  };

  const submitQuiz = async () => {
    if (quizCompleted || isSubmitting) return;
    setIsSubmitting(true);

    if (selectedOption) {
      await saveCurrentAnswer();
    }

    const unansweredQuestions = questions.filter(q => !answers[q._id]);
    for (const question of unansweredQuestions) {
      const token = localStorage.getItem('smartcliff_token') || localStorage.getItem('token') || '';
      const finalCourseId = urlCourseId || courseId;
      const finalCategory = urlCategory || category;
      const finalSubcategory = urlSubcategory || subcategory;

      if (!exerciseData?._id) continue;

      const formData = new FormData();
      formData.append('courseId', finalCourseId);
      formData.append('exerciseId', exerciseData._id);
      formData.append('questionId', question._id);
      formData.append('code', '');
      formData.append('score', "0");
      formData.append('status', 'skipped');
      formData.append('category', finalCategory);
      formData.append('subcategory', finalSubcategory);
      formData.append('nodeId', nodeId || "");
      formData.append('nodeName', exerciseData.exerciseInformation?.exerciseName || "MCQ Assessment");
      formData.append('nodeType', "mcq");
      formData.append('language', "text");

      try {
        await fetch('http://localhost:5533/courses/answers/submit', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
      } catch (error) {
        console.error('Error submitting skipped question:', error);
      }
    }

    setQuizCompleted(true);
    toast.success('Assessment completed!');
    setIsSubmitting(false);
    
    if (exerciseData?._id) {
      localStorage.removeItem(`mcq_answers_${exerciseData._id}`);
    }
  };

  const handlePrev = async () => {
    if (currentQuestionIndex <= 0) return;
    if (selectedOption) await saveCurrentAnswer();

    const prevQuestion = questions[currentQuestionIndex - 1];
    const prevAnswer = answersRef.current[prevQuestion._id];

    setSelectedOption(prevAnswer?.id || null);
    setCurrentQuestionIndex(prev => prev - 1);
  };

  const handleSaveAndNext = async () => {
    if (selectedOption) await saveCurrentAnswer();

    if (currentQuestionIndex >= questions.length - 1) {
      return;
    }

    const nextQuestion = questions[currentQuestionIndex + 1];
    const nextAnswer = answersRef.current[nextQuestion._id];

    setSelectedOption(nextAnswer?.id || null);
    setCurrentQuestionIndex(prev => prev + 1);
  };

  const handleJumpToQuestion = async (index: number) => {
    if (index < 0 || index >= questions.length) return;
    if (selectedOption && questions[currentQuestionIndex]) await saveCurrentAnswer();

    const targetQuestion = questions[index];
    const targetAnswer = answersRef.current[targetQuestion._id];

    setSelectedOption(targetAnswer?.id || null);
    setCurrentQuestionIndex(index);
  };

  const handleBack = () => {
    if (onCloseExercise) {
      onCloseExercise();
    } else {
      router.back();
    }
  };

  // Debug log to see questions structure
  useEffect(() => {
    if (questions.length > 0) {
      console.log('🔍 First question structure:', questions[0]);
      console.log('📊 All questions count:', questions.length);
    }
  }, [questions]);

  // --- Loading State ---
  if (loading) {
    return <LoadingSpinner />;
  }

  // --- Completion State ---
  if (quizCompleted) {
    return (
      <>
        <ToastContainer position="top-right" />
        <CompletionScreen onClose={handleBack} />
      </>
    );
  }

  // --- Error State ---
  if (!quizStarted || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Questions Found</h2>
          <p className="text-gray-600 text-sm mb-4">The assessment doesn't contain any questions.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-900 text-white rounded font-medium hover:bg-gray-800 transition-colors text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const showScroll = questions.length > 12;
  const exerciseTitle = exerciseData?.exerciseInformation?.exerciseName || urlExerciseName || "Assessment";
  const finalCategory = urlCategory || category;
  const finalSubcategory = urlSubcategory || subcategory;

  return (
    <div className="h-screen bg-white font-sans overflow-hidden">
      <ToastContainer position="top-right" />

      <div className="p-4 h-full">
        <div className="h-full flex flex-col">
          {/* Top Header Row with Back Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5 m-3">
              <button
                onClick={handleBack}
                className="flex items-center px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-900 transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Back</span>
              </button>

              <div className="hidden md:block">
                <Breadcrumbs
                  category={finalCategory}
                  subcategory={finalSubcategory}
                  title={exerciseTitle}
                />
              </div>
            </div>
          </div>

          <div className="md:hidden mb-3">
            <Breadcrumbs
              category={finalCategory}
              subcategory={finalSubcategory}
              title={exerciseTitle}
            />
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
            <div className="flex-1 bg-white p-4 rounded-lg border border-gray-200 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Question {currentQuestionIndex + 1} / {questions.length}
                </span>
                <button
                  onClick={() => toggleFlag(currentQuestionIndex)}
                  className={`flex items-center gap-1 text-xs font-medium transition-colors ${flaggedQuestions.has(currentQuestionIndex)
                    ? 'text-red-500'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <Flag size={14} fill={flaggedQuestions.has(currentQuestionIndex) ? "currentColor" : "none"} />
                  {flaggedQuestions.has(currentQuestionIndex) ? 'Flagged' : 'Flag'}
                </button>
              </div>

              <h2 className="text-base font-semibold text-gray-900 mb-4 leading-snug">
                {currentQuestion?.question}
              </h2>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
                  {currentQuestion?.options?.map((option: any) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      isSelected={selectedOption === option.id}
                      onSelect={() => handleOptionSelect(option.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 mt-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePrev}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center gap-1 px-3 py-2 rounded border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  <div className="text-xs text-gray-600">
                    Question <span className="font-semibold">{currentQuestionIndex + 1}</span> of {questions.length}
                  </div>

                  <div>
                    {currentQuestionIndex < questions.length - 1 ? (
                      <button
                        onClick={handleSaveAndNext}
                        className="flex items-center gap-1 px-4 py-2 rounded bg-gray-800 text-white text-xs font-medium hover:bg-gray-900 transition-colors"
                      >
                        Save & Next
                        <ChevronRight size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={submitQuiz}
                        disabled={isSubmitting}
                        className="flex items-center gap-1 px-4 py-2 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Submitting
                          </>
                        ) : (
                          'Submit'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 p-4 h-full">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1 text-xs">
                  <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
                  Questions
                </h3>

                <div className={`grid grid-cols-4 gap-1.5 ${showScroll ? 'max-h-36 overflow-y-auto' : ''}`}>
                  {questions.map((q, idx) => {
                    const isActive = idx === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(idx);
                    const isAnswered = answersRef.current[q._id] !== undefined;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleJumpToQuestion(idx)}
                        className={`relative aspect-square rounded flex items-center justify-center font-medium text-xs transition-all border
                          ${isActive
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                          }
                          ${isAnswered && !isActive ? 'bg-gray-100 text-gray-900' : ''}
                        `}
                      >
                        {isFlagged && (
                          <div className="absolute top-0 left-0 w-2 h-2">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="text-red-500 w-full h-full">
                              <path d="M0 0 L10 0 L0 10 Z" />
                            </svg>
                            <Flag size={6} className="text-white absolute top-[-1px] left-[1px]" fill="white" />
                          </div>
                        )}
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleJumpToQuestion(questions.length - 1)}
                  className="w-full py-2 mt-3 bg-red-50 text-red-700 rounded font-medium hover:bg-red-100 transition-colors text-xs"
                >
                  Jump to last
                </button>

                <div className="mt-3 flex flex-col gap-1 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded border border-blue-500 bg-blue-50"></div>
                    <span>Current</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded border border-gray-200 bg-white relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-red-500" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
                    </div>
                    <span>Flagged</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCQ;
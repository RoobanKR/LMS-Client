"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Users,
  Dumbbell,
  HelpCircle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Home,
  X,
  BookOpen,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Award
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_BASE_URL = 'https://lms-server-ym1q.onrender.com';

// Main Component
export default function ExerciseStudentsQuestionsFlow() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"exercises" | "students" | "questions">("exercises");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [courseData, setCourseData] = useState<any>(null);
  
  // Data states
  const [exercises, setExercises] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [passFailFilter, setPassFailFilter] = useState("all");

  // Extract courseId from URL and fetch course data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const parts = path.split('/');
      const courseIdIndex = parts.indexOf('grades') + 1;
      if (courseIdIndex < parts.length) {
        const id = parts[courseIdIndex];
        setCourseId(id);
        fetchCourseData(id);
        fetchExercises(id);
      }
    }
  }, []);

  // Fetch course data
  const fetchCourseData = async (courseId: string) => {
    try {
      const token = localStorage.getItem("smartcliff_token");
      const response = await fetch(
        `${API_BASE_URL}/course/${courseId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setCourseData(data.data.course);
        }
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
    }
  };

  // Fetch exercises
  const fetchExercises = async (courseId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("smartcliff_token");
      const response = await fetch(
        `${API_BASE_URL}/course/${courseId}/exercises`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setExercises(data.data.exercises || []);
        }
      }
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch students for exercise
  const fetchStudents = async (exerciseId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("smartcliff_token");
      const response = await fetch(
        `${API_BASE_URL}/exercises/${courseId}/${exerciseId}/students`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStudents(data.data.students || []);
          console.log("Students data:", data.data.students);
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch questions for student
  const fetchQuestions = async (studentId: string, exerciseId: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("smartcliff_token");
      const response = await fetch(
        `${API_BASE_URL}/course/${courseId}/student/${studentId}/exercise/${exerciseId}/questions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setQuestions(data.data.questions || []);
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get filtered data based on active tab and filters
  const filteredData = useMemo(() => {
    const data = activeTab === "exercises" ? exercises : 
                activeTab === "students" ? students : 
                questions;
    
    if (!data || data.length === 0) return [];

    return data.filter((item: any) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        let matchesSearch = false;
        
        if (activeTab === "exercises") {
          matchesSearch = 
            (item.exerciseName?.toLowerCase().includes(searchLower) ?? false) ||
            (item.entity?.title?.toLowerCase().includes(searchLower) ?? false);
        } else if (activeTab === "students") {
          matchesSearch = 
            (item.name?.toLowerCase().includes(searchLower) ?? false) ||
            (item.email?.toLowerCase().includes(searchLower) ?? false);
        } else if (activeTab === "questions") {
          matchesSearch = 
            (item.title?.toLowerCase().includes(searchLower) ?? false) ||
            (item.description?.toLowerCase().includes(searchLower) ?? false);
        }
        
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== "all") {
        let matchesStatus = false;
        
        if (activeTab === "exercises") {
          matchesStatus = item.status === statusFilter;
        } else if (activeTab === "students") {
          matchesStatus = item.exerciseProgress?.status === statusFilter;
        } else if (activeTab === "questions") {
          matchesStatus = item.studentAttempt?.status === statusFilter;
        }
        
        if (!matchesStatus) return false;
      }
      
      // Pass/Fail filter for students tab
      if (activeTab === "students" && passFailFilter !== "all") {
        const isPassing = item.exerciseProgress?.isPassing;
        if (passFailFilter === "pass" && !isPassing) return false;
        if (passFailFilter === "fail" && isPassing !== false) return false;
      }
      
      // Section filter (for exercises only)
      if (activeTab === "exercises" && sectionFilter !== "all") {
        if (item.section !== sectionFilter) return false;
      }
      
      // Difficulty filter (for questions only)
      if (activeTab === "questions" && difficultyFilter !== "all") {
        if (item.difficulty !== difficultyFilter) return false;
      }
      
      return true;
    });
  }, [activeTab, exercises, students, questions, searchTerm, statusFilter, sectionFilter, difficultyFilter, passFailFilter]);

  const handleSelectExercise = (exercise: any) => {
    setSelectedExercise(exercise);
    fetchStudents(exercise._id);
    setActiveTab("students");
    setStatusFilter("all");
    setPassFailFilter("all");
    setSearchTerm("");
  };

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    fetchQuestions(student._id, selectedExercise._id);
    setActiveTab("questions");
    setStatusFilter("all");
    setDifficultyFilter("all");
    setSearchTerm("");
  };

  const handleBackToExercises = () => {
    setActiveTab("exercises");
    setSelectedExercise(null);
    setSelectedStudent(null);
    setSearchTerm("");
    setStatusFilter("all");
    setSectionFilter("all");
    setDifficultyFilter("all");
    setPassFailFilter("all");
  };

  const handleBackToStudents = () => {
    setActiveTab("students");
    setSelectedStudent(null);
    setSearchTerm("");
    setStatusFilter("all");
    setDifficultyFilter("all");
    setPassFailFilter("all");
  };

  // Get table headers based on active tab
  const getTableHeaders = () => {
    switch (activeTab) {
      case "exercises":
        return ["Exercise Name", "Section", "Questions", "Points", "Status"];
      case "students":
        return ["Student Name", "Email", "Progress", "Score", "Pass/Fail", "Last Activity", "Status"];
      case "questions":
        return ["Question", "Difficulty", "Student Answer", "Score", "Attempts", "Status"];
      default:
        return [];
    }
  };

  // Get row data based on active tab
  const getRowData = (item: any) => {
    switch (activeTab) {
      case "exercises":
        return {
          id: item._id || item.id,
          cells: [
            <div key="name" className="font-medium text-gray-900 truncate">{item.exerciseName}</div>,
            <div key="section" className="text-gray-600">{item.section?.replace("_", " ") || "N/A"}</div>,
            <div key="questions" className="font-medium text-gray-900">{item.totalQuestions || 0}</div>,
            <div key="points" className="font-medium text-gray-900">{item.totalPoints || 0}</div>,
            <StatusBadge key="status" status={item.status || "active"} />
          ]
        };
      case "students":
        const totalScore = item.exerciseProgress?.overallScore || 0;
        const maxScore = item.exerciseProgress?.totalMaxScore || selectedExercise?.totalPoints || 0;
        const isPassing = item.exerciseProgress?.isPassing || false;
        const passingMarks = item.exerciseProgress?.passingMarksRequired || selectedExercise?.passingMarksRequired;
        
        return {
          id: item._id || item.id,
          cells: [
            <div key="name" className="font-medium text-gray-900 truncate">{item.name}</div>,
            <div key="email" className="text-gray-600 truncate">{item.email}</div>,
            <ProgressBadge key="progress" progress={item.exerciseProgress?.completionPercentage || 0} />,
            <div key="score" className="font-medium text-gray-900">
              {totalScore}/{maxScore}
            </div>,
            <PassFailBadge 
              key="passfail" 
              isPassing={isPassing} 
              score={totalScore} 
              maxScore={maxScore}
              passingMarks={passingMarks}
            />,
            <div key="activity" className="text-gray-600 text-sm">
              {item.exerciseProgress?.lastActivity ? 
                new Date(item.exerciseProgress.lastActivity).toLocaleDateString() : "Never"
              }
            </div>,
            <StudentStatusBadge key="status" status={item.exerciseProgress?.status || "not_started"} />
          ]
        };
      case "questions":
        return {
          id: item._id || item.id,
          cells: [
            <div key="question" className="font-medium text-gray-900 truncate">{item.title}</div>,
            <DifficultyBadge key="difficulty" difficulty={item.difficulty || "medium"} />,
            <div key="answer" className="text-gray-600">
              {item.studentAttempt ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  Submitted
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-400">
                  <XCircle className="h-3 w-3" />
                  Not Attempted
                </span>
              )}
            </div>,
            <div key="score" className="font-medium text-gray-900">
              {item.studentAttempt?.score || 0}/{item.score || 0}
            </div>,
            <div key="attempts" className="text-gray-600">{item.studentAttempt?.attempts || 0}</div>,
            <QuestionStatusBadge key="status" status={item.studentAttempt?.status || "not_attempted"} />
          ]
        };
      default:
        return { id: 0, cells: [] };
    }
  };

  // Get filter options based on active tab
  const getFilterOptions = () => {
    switch (activeTab) {
      case "exercises":
        return {
          statusOptions: [
            { value: "all", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" }
          ],
          sectionOptions: [
            { value: "all", label: "All Sections" },
            { value: "I_Do", label: "I Do" },
            { value: "We_Do", label: "We Do" },
            { value: "You_Do", label: "You Do" }
          ]
        };
      case "students":
        return {
          statusOptions: [
            { value: "all", label: "All Status" },
            { value: "completed", label: "Completed" },
            { value: "in_progress", label: "In Progress" },
            { value: "not_started", label: "Not Started" },
            { value: "evaluated", label: "Evaluated" }
          ],
          passFailOptions: [
            { value: "all", label: "All Students" },
            { value: "pass", label: "Pass" },
            { value: "fail", label: "Fail" }
          ]
        };
      case "questions":
        return {
          statusOptions: [
            { value: "all", label: "All Status" },
            { value: "solved", label: "Solved" },
            { value: "partially_solved", label: "Partially Solved" },
            { value: "failed", label: "Failed" },
            { value: "not_attempted", label: "Not Attempted" }
          ],
          difficultyOptions: [
            { value: "all", label: "All Difficulty" },
            { value: "easy", label: "Easy" },
            { value: "medium", label: "Medium" },
            { value: "hard", label: "Hard" }
          ]
        };
      default:
        return { statusOptions: [], sectionOptions: [], difficultyOptions: [] };
    }
  };

  const filterOptions = getFilterOptions();

  // Render breadcrumb navigation
  const renderBreadcrumb = () => {
    const breadcrumbItems = [];

    breadcrumbItems.push({
      title: "Dashboard",
      icon: Home,
      onClick: () => router.push('/lms/pages/studentdashboard'),
    });

    breadcrumbItems.push({
      title: "Grades",
      icon: BookOpen,
      onClick: null,
    });

    breadcrumbItems.push({
      title: "Overall Grade",
      icon: GraduationCap,
      onClick: null,
    });

    if (courseData) {
      breadcrumbItems.push({
        title: courseData.name || "Course",
        icon: GraduationCap,
        onClick: null,
      });
    }

    if (selectedExercise) {
      breadcrumbItems.push({
        title: selectedExercise.exerciseName,
        icon: Dumbbell,
        onClick: () => {
          handleBackToExercises();
        },
      });
    }

    if (selectedStudent) {
      breadcrumbItems.push({
        title: selectedStudent.name,
        icon: Users,
        onClick: () => {
          handleBackToStudents();
        },
      });
    }

    let currentContext = "";
    if (activeTab === "exercises") {
      currentContext = "Exercises";
    } else if (activeTab === "students") {
      currentContext = "Students";
    } else {
      currentContext = "Questions";
    }

    breadcrumbItems.push({
      title: currentContext,
      icon: activeTab === "exercises" ? Dumbbell :
             activeTab === "students" ? Users : HelpCircle,
      onClick: null,
    });

    return (
      <div className="mb-6">
        <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
          {breadcrumbItems.map((item, index) => (
            <React.Fragment key={index}>
              <div
                className={`flex items-center gap-1 px-3 py-1 transition-all duration-200 rounded-full border flex-shrink-0 ${
                  index === breadcrumbItems.length - 1
                    ? "text-white font-semibold bg-blue-600 shadow-md border-blue-600"
                    : item.onClick
                    ? "text-gray-600 hover:text-blue-600 cursor-pointer hover:bg-blue-50 border-gray-200 hover:border-blue-200 bg-white"
                    : "text-gray-500 bg-gray-100 border-gray-200"
                }`}
                onClick={item.onClick || undefined}
              >
                <item.icon className={`w-3 h-3 ${
                  index === breadcrumbItems.length - 1 ? "text-white" : ""
                }`} />
                <span className="text-xs">{item.title}</span>
              </div>
              {index < breadcrumbItems.length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-400 mx-1 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
    );
  };

  // Get page title based on current state
  const getPageTitle = () => {
    if (activeTab === "exercises") {
      return "Exercises";
    } else if (activeTab === "students") {
      return `Students for ${selectedExercise?.exerciseName || 'Exercise'}`;
    } else {
      return `Questions submitted by ${selectedStudent?.name || 'Student'}`;
    }
  };

  return (
    <div className="h-screen bg-white p-6 text-slate-800 flex flex-col overflow-hidden">
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all duration-200"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Exercises
        </button>
      </div>
      
      {/* Import Fonts */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        :root {
          --font-poppins: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          --font-inter: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .font-heading {
          font-family: var(--font-poppins);
          font-weight: 600;
        }
        
        body {
          font-family: var(--font-inter);
          font-weight: 400;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>

      {/* Breadcrumb Navigation */}
      {renderBreadcrumb()}

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-heading">
          {courseData?.name ? `${courseData.name} - ` : ""}{getPageTitle()}
        </h1>
        {courseData?.description && (
          <p className="text-gray-600 mt-1 font-inter">{courseData.description}</p>
        )}
      </div>

      {/* --- Toolbar Section --- */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        {/* Search Bar */}
        <div className="relative w-full max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-inter"
            placeholder={
              activeTab === "exercises" ? "Search exercises..." :
              activeTab === "students" ? "Search students..." :
              "Search questions..."
            }
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-8 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-xs text-gray-400 font-inter">⌘ F</span>
          </div>
        </div>

        {/* Action Buttons and Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filters Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-inter"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showFilters && (
              <div className="absolute right-0 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg z-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900 font-heading">Filters</h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  {/* Status Filter */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700 font-inter">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-inter"
                    >
                      {filterOptions.statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Pass/Fail Filter for students */}
                  {activeTab === "students" && filterOptions.passFailOptions && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 font-inter">Pass/Fail</label>
                      <select
                        value={passFailFilter}
                        onChange={(e) => setPassFailFilter(e.target.value)}
                        className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-inter"
                      >
                        {filterOptions.passFailOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Section Filter (for exercises only) */}
                  {activeTab === "exercises" && filterOptions.sectionOptions && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 font-inter">Section</label>
                      <select
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                        className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-inter"
                      >
                        {filterOptions.sectionOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Difficulty Filter (for questions only) */}
                  {activeTab === "questions" && filterOptions.difficultyOptions && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700 font-inter">Difficulty</label>
                      <select
                        value={difficultyFilter}
                        onChange={(e) => setDifficultyFilter(e.target.value)}
                        className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-inter"
                      >
                        {filterOptions.difficultyOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setStatusFilter("all");
                        setSectionFilter("all");
                        setDifficultyFilter("all");
                        setPassFailFilter("all");
                      }}
                      className="w-full rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 font-inter"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Back Buttons */}
          {activeTab === "students" && (
            <button
              onClick={handleBackToExercises}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-inter"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Exercises
            </button>
          )}
          
          {activeTab === "questions" && (
            <button
              onClick={handleBackToStudents}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 font-inter"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Students
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {(statusFilter !== "all" || sectionFilter !== "all" || difficultyFilter !== "all" || passFailFilter !== "all" || searchTerm) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {searchTerm && (
            <FilterTag 
              label={`Search: "${searchTerm}"`}
              onRemove={() => setSearchTerm("")}
            />
          )}
          {statusFilter !== "all" && (
            <FilterTag 
              label={`Status: ${filterOptions.statusOptions.find(opt => opt.value === statusFilter)?.label}`}
              onRemove={() => setStatusFilter("all")}
            />
          )}
          {activeTab === "students" && passFailFilter !== "all" && (
            <FilterTag 
              label={`Result: ${passFailFilter === "pass" ? "Pass" : "Fail"}`}
              onRemove={() => setPassFailFilter("all")}
            />
          )}
          {activeTab === "exercises" && sectionFilter !== "all" && (
            <FilterTag 
              label={`Section: ${filterOptions.sectionOptions?.find(opt => opt.value === sectionFilter)?.label}`}
              onRemove={() => setSectionFilter("all")}
            />
          )}
          {activeTab === "questions" && difficultyFilter !== "all" && filterOptions.difficultyOptions && (
            <FilterTag 
              label={`Difficulty: ${filterOptions.difficultyOptions.find(opt => opt.value === difficultyFilter)?.label}`}
              onRemove={() => setDifficultyFilter("all")}
            />
          )}
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setSectionFilter("all");
              setDifficultyFilter("all");
              setPassFailFilter("all");
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-inter"
          >
            Clear all
          </button>
        </div>
      )}

      {/* --- Fixed Height Table Container --- */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-gray-100 custom-scrollbar">
        <div className="h-full overflow-auto custom-scrollbar">
          <table className="w-full border-collapse text-left text-sm font-inter">
            <thead className="bg-white sticky top-0 z-10 border-b border-gray-200">
              <tr>
                {getTableHeaders().map((header, index) => (
                  <th key={index} className="py-3 px-4 font-medium text-gray-500 whitespace-nowrap font-heading bg-white">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={getTableHeaders().length} className="py-8 text-center">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={getTableHeaders().length} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-gray-300" />
                      <p className="font-inter">No {activeTab} found</p>
                      {(searchTerm || statusFilter !== "all" || sectionFilter !== "all" || difficultyFilter !== "all" || passFailFilter !== "all") && (
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setStatusFilter("all");
                            setSectionFilter("all");
                            setDifficultyFilter("all");
                            setPassFailFilter("all");
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-inter"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item: any) => {
                  const rowData = getRowData(item);
                  
                  return (
                    <tr
                      key={rowData.id}
                      className="group transition-colors hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        if (activeTab === "exercises") {
                          handleSelectExercise(item);
                        } else if (activeTab === "students") {
                          handleSelectStudent(item);
                        }
                      }}
                    >
                      {rowData.cells.map((cell, cellIndex) => (
                        <td key={cellIndex} className="py-3 px-4">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Stats */}
      <div className="mt-4 text-sm text-gray-500 font-inter">
        Showing {filteredData.length} of {activeTab === "exercises" ? exercises.length : activeTab === "students" ? students.length : questions.length} {activeTab}
        {(searchTerm || statusFilter !== "all" || sectionFilter !== "all" || difficultyFilter !== "all" || passFailFilter !== "all") && " (filtered)"}
      </div>
    </div>
  );
}

// --- Helper Components ---

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  
  const styles = isActive
    ? "bg-emerald-50 text-emerald-700"
    : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium font-inter ${styles}`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function StudentStatusBadge({ status }: { status: string }) {
  const styles = {
    completed: "bg-emerald-50 text-emerald-700",
    in_progress: "bg-amber-50 text-amber-700",
    evaluated: "bg-blue-50 text-blue-700",
    not_started: "bg-gray-100 text-gray-700",
  }[status] || "bg-gray-100 text-gray-700";

  const labels = {
    completed: "Completed",
    in_progress: "In Progress",
    evaluated: "Evaluated",
    not_started: "Not Started",
  }[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium font-inter ${styles}`}
    >
      {labels}
    </span>
  );
}

function QuestionStatusBadge({ status }: { status: string }) {
  const styles = {
    solved: "bg-emerald-50 text-emerald-700",
    partially_solved: "bg-amber-50 text-amber-700",
    failed: "bg-rose-50 text-rose-700",
    not_attempted: "bg-gray-100 text-gray-700",
  }[status] || "bg-gray-100 text-gray-700";

  const labels = {
    solved: "Solved",
    partially_solved: "Partially Solved",
    failed: "Failed",
    not_attempted: "Not Attempted",
  }[status] || status;

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium font-inter ${styles}`}
    >
      {labels}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles = {
    easy: "bg-emerald-50 text-emerald-700",
    medium: "bg-amber-50 text-amber-700",
    hard: "bg-rose-50 text-rose-700",
  }[difficulty] || "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium capitalize font-inter ${styles}`}
    >
      {difficulty}
    </span>
  );
}

function ProgressBadge({ progress }: { progress: number }) {
  const getColor = (progress: number) => {
    if (progress >= 70) return "bg-emerald-500";
    if (progress >= 40) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(progress)}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        ></div>
      </div>
      <span className="text-xs font-medium text-gray-700 min-w-[40px] font-inter">
        {progress}%
      </span>
    </div>
  );
}

function PassFailBadge({ isPassing, score, maxScore, passingMarks }: { 
  isPassing: boolean; 
  score: number; 
  maxScore: number;
  passingMarks?: number;
}) {
  if (maxScore === 0 || score === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 font-inter">
        <AlertCircle className="h-3 w-3" />
        No Attempt
      </span>
    );
  }
  
  if (isPassing) {
    const passMark = passingMarks || Math.ceil(maxScore * 0.5);
    return (
      <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 font-inter">
        <CheckCircle className="h-3 w-3" />
        Pass ({score}/{passMark})
      </span>
    );
  }
  
  const passMark = passingMarks || Math.ceil(maxScore * 0.5);
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium bg-rose-50 text-rose-700 font-inter">
      <XCircle className="h-3 w-3" />
      Fail ({score}/{passMark})
    </span>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 font-inter">
      {label}
      <button
        onClick={onRemove}
        className="ml-1 text-blue-500 hover:text-blue-700"
      >
        ×
      </button>
    </span>
  );
}
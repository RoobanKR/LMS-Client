"use client"

import { useState, useEffect } from "react"
import {
  BookOpen,
  ChevronDown,
  Search,
  Clock,
  Tag,
  Eye,
  Layers,
  GraduationCap,
  Loader2,
  Plus,
  Building2,
  Users,
} from "lucide-react"
import DashboardLayout from "../../component/layout"
import { fetchCourseStructures } from "../../../../apiServices/createCourseStucture"
import { CourseDetailsPopup } from "../../component/CourseDetailsPopup"
import { getAuthToken } from "../../../../apiServices/addmoduleandall/addModule"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

// Keep all your existing interfaces
interface CourseStructureMongo {
  _id: { $oid: string }
  institution: { $oid: string }
  clientName: { $oid: string }
  serviceType: string
  serviceModal: string
  category: string
  courseCode: string
  courseName: string
  courseDescription: string
  courseDuration: string
  courseLevel: string
  courseImage: string
  resourcesType: string[]
  courseHierarchy: string[]
  I_Do: string[]
  We_Do: string[]
  You_Do: string[]
  createdBy: string
  createdAt: { $date: string }
  updatedAt: { $date: string }
  updatedBy: string
  __v: number
}

interface CourseStructureApi {
  _id: string
  institution: string
  clientName: string
  clientData?: {
    name?: string
    [key: string]: any
  }
  serviceType: string
  serviceModal: string
  category: string
  courseCode: string
  courseName: string
  courseDescription: string
  courseDuration: string
  courseLevel: string
  courseImage: string
  resourcesType: string[]
  courseHierarchy: string[]
  I_Do: string[]
  We_Do: string[]
  You_Do: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  updatedBy: string
  __v: number
}

type CourseStructure = CourseStructureMongo | CourseStructureApi

interface ApiResponse {
  message: Array<{
    key: string
    value: string
  }>
  data: CourseStructure[]
}

interface Client {
  _id: string
  name: string
}

export default function CoursePedagogyCreation() {
  const [courseStructures, setCourseStructures] = useState<CourseStructure[]>([])
  const [selectedCourse, setSelectedCourse] = useState<CourseStructure | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  const getLevelConfig = (level: string) => {
    const levelLower = level.toLowerCase()
    if (levelLower.includes("beginner") || levelLower.includes("basic")) {
      return {
        icon: Layers,
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconColor: "text-emerald-600",
        dotColor: "bg-emerald-500",
      }
    }
    if (levelLower.includes("intermediate") || levelLower.includes("medium")) {
      return {
        icon: Layers,
        color: "bg-amber-50 text-amber-700 border-amber-200",
        iconColor: "text-amber-600",
        dotColor: "bg-amber-500",
      }
    }
    if (levelLower.includes("advanced") || levelLower.includes("expert")) {
      return {
        icon: Layers,
        color: "bg-rose-50 text-rose-700 border-rose-200",
        iconColor: "text-rose-600",
        dotColor: "bg-rose-500",
      }
    }
    return {
      icon: Layers,
      color: "bg-blue-50 text-blue-700 border-blue-200",
      iconColor: "text-blue-600",
      dotColor: "bg-blue-500",
    }
  }

  const getServiceTypeConfig = (serviceType: string) => {
    const type = serviceType.toLowerCase()
    if (type.includes("online") || type.includes("virtual")) {
      return {
        icon: Layers,
        color: "bg-blue-50 text-blue-700 border-blue-200",
        iconColor: "text-blue-600",
      }
    }
    if (type.includes("classroom") || type.includes("face")) {
      return {
        icon: Users,
        color: "bg-purple-50 text-purple-700 border-purple-200",
        iconColor: "text-purple-600",
      }
    }
    if (type.includes("hybrid") || type.includes("blended")) {
      return {
        icon: Layers,
        color: "bg-orange-50 text-orange-700 border-orange-200",
        iconColor: "text-orange-600",
      }
    }
    return {
      icon: Layers,
      color: "bg-slate-50 text-slate-700 border-slate-200",
      iconColor: "text-slate-600",
    }
  }

  // Keep all your existing useEffect and handler functions
  useEffect(() => {
    const loadCourseStructures = async () => {
      try {
        setLoading(true)
        const token = getAuthToken()

        if (!token) {
          setError("Authentication token not found")
          return
        }

        const result = await fetchCourseStructures(token)

        let courseData: CourseStructure[] = []

        if (result && typeof result === "object") {
          if ("data" in result && Array.isArray(result.data)) {
            courseData = result.data
          } else if ("courseStructures" in result && Array.isArray(result.courseStructures)) {
            courseData = result.courseStructures
          } else if (Array.isArray(result)) {
            courseData = result
          } else {
            console.log("Full API response:", result)
            const possibleArrays = Object.values(result).filter(Array.isArray)
            if (possibleArrays.length > 0) {
              courseData = possibleArrays[0] as CourseStructure[]
            }
          }
        }

        if (courseData.length > 0) {
          setCourseStructures(courseData)
        } else {
          setError("No course data found in response")
          console.log("Response structure:", result)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course structures")
        console.error("Error loading course structures:", err)
      } finally {
        setLoading(false)
      }
    }

    loadCourseStructures()
  }, [])

  const getCourseId = (course: CourseStructure): string => {
    return typeof course._id === "string" ? course._id : course._id.$oid
  }

  const getClientName = (course: CourseStructure): string => {
    if (typeof course.clientName === "string") {
      return course.clientName
    } else if (course.clientName && typeof course.clientName === "object" && "$oid" in course.clientName) {
      return `Client-${course.clientName.$oid.substring(0, 8)}`
    }
    return "Unknown Client"
  }

  const filteredCourses = courseStructures.filter(
    (course) =>
      course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.courseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getClientName(course).toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCourseSelect = (course: CourseStructure) => {
    setSelectedCourse(course)
    setIsDropdownOpen(false)
    setSearchTerm("")
  }

  const handleHierarchyView = () => {
    if (selectedCourse) {
      setIsPopupOpen(true)
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isDropdownOpen && !target.closest(".dropdown-container")) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isDropdownOpen])

  return (
    <DashboardLayout>
      {selectedCourse && (
        <CourseDetailsPopup course={selectedCourse} open={isPopupOpen} onOpenChange={setIsPopupOpen} />
      )}

      <div className="flex flex-col h-full bg-slate-50">
        {/* Ultra Compact Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <div className="p-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded shadow-sm">
                  <GraduationCap className="h-3 w-3 text-white" />
                </div>
                <div>
                  <h1 className="text-[11px] font-semibold text-slate-900">Course Builder</h1>
                  <p className="text-[9px] text-slate-600">Design and manage course structure</p>
                </div>
              </div>

              {selectedCourse && (
                <div className="flex items-center space-x-1.5">
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-slate-900 truncate max-w-32">
                      {selectedCourse.courseName}
                    </p>
                    <p className="text-[8px] text-slate-500">{selectedCourse.courseCode}</p>
                  </div>
                  <div className={`w-1 h-1 rounded-full ${getLevelConfig(selectedCourse.courseLevel).dotColor}`}></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ultra Compact Course Selection */}
        <div className="bg-white border-b border-slate-200 px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 max-w-xs relative dropdown-container">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-left bg-white border border-slate-300 rounded hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
              >
                <div className="flex items-center space-x-1.5">
                  <BookOpen className="h-2.5 w-2.5 text-slate-500" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-slate-900 truncate">
                      {selectedCourse ? selectedCourse.courseName : "Select Course"}
                    </p>
                    {selectedCourse && (
                      <p className="text-[8px] text-slate-500 truncate">{selectedCourse.courseCode}</p>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={`h-2.5 w-2.5 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute z-50 mt-0.5 w-full bg-white border border-slate-200 rounded-md shadow-xl max-h-64 overflow-hidden">
                  {/* Ultra Compact Search */}
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-2.5 w-2.5 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-6 h-5 text-[10px] border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Ultra Compact Course List */}
                  <div className="max-h-48 overflow-y-auto">
                    {loading ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1.5 text-blue-500" />
                        <p className="text-[9px] text-slate-600">Loading...</p>
                      </div>
                    ) : filteredCourses.length === 0 ? (
                      <div className="p-4 text-center">
                        <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <BookOpen className="h-3 w-3 text-slate-400" />
                        </div>
                        <p className="text-[9px] font-medium text-slate-900 mb-0.5">No courses found</p>
                        <p className="text-[8px] text-slate-500">Try different search terms</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredCourses.map((course) => {
                          const levelConfig = getLevelConfig(course.courseLevel)
                          const serviceConfig = getServiceTypeConfig(course.serviceType)
                          const LevelIcon = levelConfig.icon
                          const ServiceIcon = serviceConfig.icon

                          return (
                            <div
                              key={getCourseId(course)}
                              onClick={() => handleCourseSelect(course)}
                              className="p-2 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
                            >
                              <div className="flex items-start space-x-2">
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <BookOpen className="h-3 w-3 text-white" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h3 className="text-[10px] font-semibold text-slate-900 mb-0.5 group-hover:text-blue-700 transition-colors truncate">
                                        {course.courseName}
                                      </h3>
                                      <div className="flex items-center space-x-1 mb-1">
                                        <span className="text-[8px] font-medium text-slate-600">
                                          {course.courseCode}
                                        </span>
                                        <span className="text-[8px] text-slate-400">•</span>
                                        <span className="text-[8px] text-slate-500 truncate">
                                          {getClientName(course)}
                                        </span>
                                      </div>
                                      <p className="text-[8px] text-slate-600 line-clamp-1 mb-1">
                                        {course.courseDescription || "No description"}
                                      </p>
                                      <div className="flex items-center space-x-2 text-[8px] text-slate-500">
                                        <div className="flex items-center space-x-0.5">
                                          <Clock className="h-2 w-2" />
                                          <span>{course.courseDuration}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-col space-y-1 ml-2">
                                      <Badge
                                        variant="outline"
                                        className={`text-[8px] px-1 py-0 font-medium h-4 ${levelConfig.color}`}
                                      >
                                        <LevelIcon className={`h-2 w-2 mr-0.5 ${levelConfig.iconColor}`} />
                                        {course.courseLevel}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className={`text-[8px] px-1 py-0 font-medium h-4 ${serviceConfig.color}`}
                                      >
                                        <ServiceIcon className={`h-2 w-2 mr-0.5 ${serviceConfig.iconColor}`} />
                                        {course.serviceType}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ultra Compact Action Buttons */}
            <div className="flex items-center space-x-1">
              <Button
                onClick={handleHierarchyView}
                disabled={!selectedCourse}
                variant="outline"
                className="flex items-center space-x-1 px-2 py-1 text-[9px] border-slate-300 hover:bg-slate-50 disabled:opacity-50 bg-transparent h-5"
              >
                <Eye className="h-2.5 w-2.5" />
                <span>View</span>
              </Button>

              <Button
                disabled={!selectedCourse}
                className="flex items-center space-x-1 px-2 py-1 text-[9px] bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 h-5"
              >
                <Plus className="h-2.5 w-2.5" />
                <span>Build</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Ultra Compact Main Content */}
        <div className="flex-1 p-2">
         
        </div>

        {/* Ultra Compact Error Display */}
        {error && (
          <div className="p-2">
            <Alert className="max-w-md mx-auto border-red-200 bg-red-50">
              <AlertDescription className="text-[9px] text-red-700">{error}</AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

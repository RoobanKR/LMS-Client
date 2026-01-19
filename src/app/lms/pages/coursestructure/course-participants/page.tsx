"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Users, BookOpen, Clock, 
  GraduationCap, Building, Calendar, ChevronRight,
  Tag, Home, FolderOpen, BookMarked
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import DashboardLayout from '@/app/lms/component/layout'
import EnrollmentTab from '@/app/lms/component/EnrollmentTab'
import GroupEnrollmentTab from '@/app/lms/component/GroupEnrollment'

type CourseData = {
  _id: string
  courseName: string
  courseCode: string
  courseDescription: string
  courseDuration: string
  courseLevel: string
  category: string
  serviceType: string
  status: string
  createdAt: string
  updatedAt: string
  clientName?: string
  clientData?: {
    clientCompany: string
    clientAddress: string
    contactPersons: Array<{
      name: string
      email: string
      phoneNumber: string
      isPrimary: boolean
    }>
  }
}

export default function CourseParticipantsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const courseId = searchParams.get('courseId')
  
  const [courseData, setCourseData] = useState<CourseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('enrollment')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) {
        console.error("No courseId found in URL")
        setError("No course ID found in URL. Please check the URL and try again.")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const url = `https://lms-client-jade-three.vercel.app/getAll/courses-data/${courseId}`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const responseText = await response.text()
        let data
        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error("JSON parse error:", parseError)
          throw new Error("Invalid JSON response from server")
        }
        
        const courseInfo = data.data || data
        if (!courseInfo) {
          throw new Error("No course data found in response")
        }

        setCourseData(courseInfo)
      } catch (err) {
        console.error("Fetch error:", err)
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (courseId) {
      fetchCourseData()
    }
  }, [courseId])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'draft':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500">Loading course data...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error || !courseData) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md border-red-100">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <div className="text-red-500">!</div>
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Error loading course</h3>
              <p className="text-sm text-gray-600 mb-4">{error || "Course not found"}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.history.back()}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-3 w-3" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  const handleAddParticipants = () => {
    setIsAddModalOpen(true)
  }

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false)
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-screen bg-gray-50"
      >
        {/* Header with Breadcrumbs */}
        <div className="bg-white border-b px-4 py-3">
          {/* Breadcrumb Navigation */}
          <div className="mb-3">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    href="/lms/pages/admindashboard" 
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                  >
                    <Home className="h-3 w-3" />
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    href="/lms/pages/coursestructure" 
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
                  >
                    <BookMarked className="h-3 w-3" />
                    Courses
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center gap-1 text-xs font-medium text-gray-900">
                    <BookOpen className="h-3 w-3 text-indigo-600" />
                    <span className="truncate max-w-[200px]">{courseData.courseName}</span>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Course Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[300px]">
                    {courseData.courseName}
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-600 font-medium">
                      {courseData.courseCode}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-600">
                      {courseData.category}
                    </span>
                  </div>
                </div>
              </div>
              
            </div>
            
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 py-3">
          <Card className="border shadow-xs">
            <CardContent className="p-3">
              {/* Tabs Only - Button will be inside EnrollmentTab */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="inline-flex h-7 items-center justify-center rounded-lg bg-gray-100 p-0.5">
                  <TabsTrigger 
                    value="enrollment" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                  >
                    <Users className="h-2.5 w-2.5 mr-1" />
                    Enrollment
                  </TabsTrigger>
                  <TabsTrigger 
                    value="group-enrollment" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                  >
                    <Users className="h-2.5 w-2.5 mr-1" />
                    Group Enrollment
                  </TabsTrigger>
                </TabsList>
                
                {/* Tab Content */}
                <div className="mt-3">
                  <TabsContent value="enrollment" className="m-0">
                    <EnrollmentTab 
                      courseId={courseId || ''}
                      isAddModalOpen={isAddModalOpen}
                      onAddModalClose={handleCloseAddModal}
                      onOpenAddModal={handleAddParticipants}
                    />
                  </TabsContent>
                  
                  <TabsContent value="group-enrollment" className="m-0">
                    <GroupEnrollmentTab 
                      courseId={courseId || ''}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </DashboardLayout>
  )
}
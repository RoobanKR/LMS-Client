"use client"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, X, CheckCircle, XCircle, Download, Loader2, AlertTriangle, Search } from "lucide-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "react-toastify"
import { bulkUploadUsers } from "@/apiServices/userService"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area" // Add this import
import { courseStructureApi } from "@/apiServices/createCourseStucture"

interface UploadResults {
  summary?: {
    totalProcessed: number
    successfullyCreated: number
    emailsSent: number
    emailsFailed: number
    existingUsers: number
    validationErrors: number
  }
  users?: Array<{
    _id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }>
  creditExceeded?: boolean
  message?: Array<{ key: string; value: string }>
}

interface BulkUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (data: UploadResults) => void
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
type UploadStage = 'upload' | 'processing'

interface UploadProgress {
  percentage: number
  status: UploadStatus
  stage: UploadStage
  message: string
}

interface CourseStructure {
  _id: string
  name: string
  courseName: string
  courseCode?: string
  [key: string]: any
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [uploadResults, setUploadResults] = useState<UploadResults | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    percentage: 0,
    status: 'idle',
    stage: 'upload',
    message: ''
  })
  const [batch, setBatch] = useState<string>("")
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [courseSearch, setCourseSearch] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch course structures - FIXED: Use the correct useQuery syntax
  const { 
    data: courseStructures = [], 
    isLoading: coursesLoading, 
    error: coursesError 
  } = useQuery({
    queryKey: ['courseStructures'],
    queryFn: () => courseStructureApi.getAll().queryFn(),
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // 30 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
  })

  console.log("courseStructures", courseStructures);

  // Map course structures for multi-select component
  const courseOptions = Array.isArray(courseStructures) ? courseStructures.map((course: CourseStructure) => ({
    value: course._id,
    label: course.courseName + (course.courseCode ? ` (${course.courseCode})` : ""),
    name: course.courseName,
    code: course.courseCode
  })) : []

  // Filter courses based on search
  const filteredCourseOptions = courseOptions.filter(course => 
    course.label.toLowerCase().includes(courseSearch.toLowerCase()) ||
    course.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    (course.code && course.code.toLowerCase().includes(courseSearch.toLowerCase()))
  )

  useEffect(() => {
    if (coursesError) {
      toast.error("Failed to load courses")
    }
  }, [coursesError])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0])
    }
  }, [])

  const handleFileSelect = (selectedFile: File): void => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Please upload an Excel file (.xlsx, .xls) or CSV file")
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB")
      return
    }

    setFile(selectedFile)
    setUploadResults(null)
    setUploadProgress({
      percentage: 0,
      status: 'idle',
      stage: 'upload',
      message: ''
    })
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleRemoveFile = (): void => {
    setFile(null)
    setUploadProgress({
      percentage: 0,
      status: 'idle',
      stage: 'upload',
      message: ''
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const downloadTemplate = (): void => {
    const templateData = [
      ['email', 'firstName', 'lastName', 'phone', 'role', 'gender', 'password'],
      ['example@email.com', 'John', 'Doe', '1234567890', 'Admin', 'male', 'password123'],
      ['user@example.com', 'Jane', 'Smith', '0987654321', 'Student', 'female', 'password456']
    ]

    const csvContent = templateData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'user_bulk_upload_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const simulateUploadProgress = (): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 15
        if (progress >= 90) {
          progress = 90
          clearInterval(interval)
          resolve()
        }
        setUploadProgress(prev => ({
          ...prev,
          percentage: Math.min(progress, 90),
          status: 'uploading',
          message: `Uploading file... ${Math.round(progress)}%`
        }))
      }, 200)
    })
  }

  const simulateProcessingProgress = (): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 90
      const interval = setInterval(() => {
        progress += Math.random() * 5
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
          resolve()
        }
        setUploadProgress(prev => ({
          ...prev,
          percentage: progress,
          stage: 'processing',
          status: 'processing',
          message: `Processing users... ${Math.round(progress)}%`
        }))
      }, 300)
    })
  }

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData): Promise<UploadResults> => {
      const token = localStorage.getItem('smartcliff_token')
      if (!token) throw new Error("No authentication token found")
      
      await simulateUploadProgress()
      const result = await bulkUploadUsers(formData, token)
      await simulateProcessingProgress()
      
      return result
    },
    onSuccess: (data: UploadResults) => {
      setUploadProgress({
        percentage: 100,
        status: 'completed',
        stage: 'processing',
        message: 'Upload completed successfully!'
      })
      
      setTimeout(() => {
        setUploadResults(data)
        toast.success("Bulk upload completed successfully!")
        
        if (onSuccess) {
          onSuccess(data)
        }
      }, 500)
    },
    onError: (error: Error) => {
      setUploadProgress({
        percentage: 0,
        status: 'error',
        stage: 'upload',
        message: 'Upload failed. Please try again.'
      })
      toast.error(error.message || "Upload failed. Please try again.")
    }
  })

  const handleUpload = async (): Promise<void> => {
    if (!file) {
      toast.error("Please select a file to upload")
      return
    }

    // Validate additional fields if needed
    if (selectedCourses.length === 0) {
      toast.error("Please select at least one course")
      return
    }

    if (!batch.trim()) {
      toast.error("Please enter a batch name")
      return
    }

    setUploadProgress({
      percentage: 0,
      status: 'uploading',
      stage: 'upload',
      message: 'Starting upload...'
    })

    const formData = new FormData()
    formData.append('file', file)
    formData.append('notificationMethod', 'email')
    formData.append('batch', batch)
    
    // Append selected courses as array
    selectedCourses.forEach((courseId, index) => {
      formData.append(`courses[${index}]`, courseId)
    })

    uploadMutation.mutate(formData)
  }

  const handleClose = (): void => {
    setFile(null)
    setUploadResults(null)
    setBatch("")
    setSelectedCourses([])
    setCourseSearch("")
    setUploadProgress({
      percentage: 0,
      status: 'idle',
      stage: 'upload',
      message: ''
    })
    onClose()
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUploadAreaClick = (): void => {
    fileInputRef.current?.click()
  }

  const handleRemoveFileClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation()
    handleRemoveFile()
  }

  const handleUploadAnotherFile = (): void => {
    setFile(null)
    setUploadResults(null)
    setBatch("")
    setSelectedCourses([])
    setCourseSearch("")
    setUploadProgress({
      percentage: 0,
      status: 'idle',
      stage: 'upload',
      message: ''
    })
  }

  const getProgressBarColor = (): string => {
    switch (uploadProgress.status) {
      case 'uploading':
        return 'bg-blue-500'
      case 'processing':
        return 'bg-yellow-500'
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = () => {
    switch (uploadProgress.status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Upload className="h-4 w-4" />
    }
  }

  const isUploadInProgress = uploadProgress.status === 'uploading' || uploadProgress.status === 'processing'

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk User Upload
          </DialogTitle>
          <DialogDescription className="text-sm">
            Upload an Excel file to create multiple users at once.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Download Template Section */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-sm">Download Template</h3>
                <p className="text-xs text-gray-600">
                  Use our template to ensure correct format
                </p>
              </div>
              <Button 
                onClick={downloadTemplate} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2 text-xs h-8"
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
            </div>
          </div>

          {/* Additional Fields Section */}
          {!uploadResults && uploadProgress.status === 'idle' && (
            <div className="grid grid-cols-2 gap-4">
              {/* Batch Input */}
              <div className="space-y-2">
                <Label htmlFor="batch" className="text-sm">
                  Batch <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="batch"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  placeholder="Enter batch name (e.g., 2024-2025)"
                  className="h-9 text-sm"
                />
                <p className="text-xs text-gray-500">All users will be assigned to this batch</p>
              </div>

              {/* Courses Multi-select */}
              <div className="space-y-2">
                <Label htmlFor="courses" className="text-sm">
                  Courses <span className="text-red-500">*</span>
                </Label>
                {coursesLoading ? (
                  <div className="h-9 flex items-center justify-center border rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Select 
                    value={selectedCourses.length > 0 ? selectedCourses[0] : ""} 
                    onValueChange={(value) => {
                      if (!selectedCourses.includes(value)) {
                        setSelectedCourses([...selectedCourses, value])
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select courses" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {/* Search input inside dropdown */}
                      <div className="sticky top-0 z-10 bg-white border-b p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="Search courses..."
                            value={courseSearch}
                            onChange={(e) => setCourseSearch(e.target.value)}
                            className="pl-8 pr-2 h-8 text-xs border-gray-300 focus:border-blue-500 w-full"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      
                      {/* Scrollable courses list */}
                      <ScrollArea className="h-64">
                        {filteredCourseOptions.length > 0 ? (
                          filteredCourseOptions.map((course) => (
                            <SelectItem key={course.value} value={course.value} className="py-2">
                              {course.label}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No courses found
                          </div>
                        )}
                      </ScrollArea>
                      
                      {/* Course count */}
                      <div className="sticky bottom-0 bg-gray-50 border-t px-3 py-1.5 text-xs text-gray-500">
                        {filteredCourseOptions.length} course{filteredCourseOptions.length !== 1 ? 's' : ''} found
                      </div>
                    </SelectContent>
                  </Select>
                )}
                {selectedCourses.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedCourses.map((courseId) => {
                      const course = courseStructures.find((c: CourseStructure) => c._id === courseId) as CourseStructure | undefined
                      return (
                        <Badge key={courseId} variant="secondary" className="text-xs px-2 py-1">
                          {course?.courseName || "Unknown Course"}
                          <button
                            type="button"
                            onClick={() => setSelectedCourses(selectedCourses.filter(id => id !== courseId))}
                            className="ml-1 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-500">Select courses to assign to all users</p>
              </div>
            </div>
          )}

          {/* File Upload Section */}
          {!uploadResults && uploadProgress.status === 'idle' && (
            <div className="space-y-3">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : file 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUploadAreaClick}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    <div>
                      <p className="font-medium text-sm">File Selected</p>
                      <p className="text-xs text-gray-600">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFileClick}
                      className="flex items-center gap-1 h-7 text-xs"
                    >
                      <X className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                    <div>
                      <p className="font-medium text-sm">
                        {isDragging ? 'Drop file here' : 'Drag & drop Excel file'}
                      </p>
                      <p className="text-xs text-gray-600">or click to browse (Max 5MB)</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 text-center">
                <p>Supported: .xlsx, .xls, .csv | Required columns: email, firstName, lastName, phone, role, gender, password</p>
              </div>
            </div>
          )}

          {/* Upload Progress Section */}
          {isUploadInProgress && (
            <div className="space-y-4">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  {getStatusIcon()}
                </div>
                <div>
                  <p className="font-medium text-sm">{uploadProgress.message}</p>
                  <p className="text-xs text-gray-600 capitalize">
                    {uploadProgress.stage} in progress...
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                    style={{ width: `${uploadProgress.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{uploadProgress.stage === 'upload' ? 'Uploading file...' : 'Processing users...'}</span>
                  <span>{Math.round(uploadProgress.percentage)}%</span>
                </div>
              </div>

              {/* Stage Indicators */}
              <div className="flex justify-center space-x-6">
                <div className={`flex items-center space-x-2 text-xs ${
                  uploadProgress.stage === 'upload' ? 'text-blue-600 font-medium' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    uploadProgress.stage === 'upload' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}></div>
                  <span>Uploading</span>
                </div>
                <div className={`flex items-center space-x-2 text-xs ${
                  uploadProgress.stage === 'processing' ? 'text-yellow-600 font-medium' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    uploadProgress.stage === 'processing' ? 'bg-yellow-600' : 'bg-gray-300'
                  }`}></div>
                  <span>Processing</span>
                </div>
              </div>
            </div>
          )}

          {/* Upload Results */}
          {uploadResults && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="font-semibold text-lg text-green-600">Upload Complete!</h3>
                <p className="text-sm text-gray-600">Your file has been processed successfully.</p>
                {batch && (
                  <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                    <span className="text-xs font-medium">Batch:</span>
                    <span className="text-xs text-blue-600">{batch}</span>
                  </div>
                )}
              </div>
              
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-blue-50 rounded border">
                  <p className="text-lg font-bold text-blue-600">{uploadResults.summary?.totalProcessed || 0}</p>
                  <p className="text-xs text-blue-600">Processed</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded border">
                  <p className="text-lg font-bold text-green-600">{uploadResults.summary?.successfullyCreated || 0}</p>
                  <p className="text-xs text-green-600">Created</p>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded border">
                  <p className="text-lg font-bold text-yellow-600">{uploadResults.summary?.emailsSent || 0}</p>
                  <p className="text-xs text-yellow-600">Emails Sent</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded border">
                  <p className="text-lg font-bold text-red-600">{uploadResults.summary?.emailsFailed || 0}</p>
                  <p className="text-xs text-red-600">Emails Failed</p>
                </div>
              </div>

              {/* User List */}
              {uploadResults.users && uploadResults.users.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Created Users ({uploadResults.users.length})</h4>
                    <Badge variant="secondary" className="text-xs">
                      View All
                    </Badge>
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                    {uploadResults.users.slice(0, 10).map((user, index) => (
                      <div key={user._id || index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-xs">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                            <p className="text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                    {uploadResults.users.length > 10 && (
                      <div className="text-center py-1 text-xs text-gray-500">
                        +{uploadResults.users.length - 10} more users
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {uploadResults.creditExceeded && (
                <Alert className="bg-yellow-50 border-yellow-200 py-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800 text-xs">
                    Users created, but some emails failed due to insufficient credits.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50">
          <div className="flex w-full justify-between items-center">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploadInProgress}
              size="sm"
            >
              {uploadResults ? 'Close' : 'Cancel'}
            </Button>
            
            <div className="flex gap-2">
              {uploadResults && (
                <Button
                  onClick={handleUploadAnotherFile}
                  variant="outline"
                  size="sm"
                >
                  Upload Another
                </Button>
              )}
              
              {!uploadResults && file && uploadProgress.status === 'idle' && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploadInProgress || !batch.trim() || selectedCourses.length === 0}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-3 w-3 mr-2" />
                  Upload
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BulkUploadModal
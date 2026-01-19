"use client"

import { useState, useEffect, useMemo } from 'react'
import { GraduationCap, Mail, Phone, UserIcon, UserPlus, Trash2, Calendar, Clock, Settings, CheckCircle, XCircle, Clock as ClockIcon, ToggleLeft, ToggleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchUsers, addParticipantsToCourse, removeParticipantFromCourse, removeMultipleParticipantsFromCourse, updateParticipantEnrollment } from '@/apiServices/userService'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from 'sonner'
import { Toaster } from 'sonner'
import FilteredTable from './participantsFilteredTable'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface EnrollmentTabProps {
  courseId: string
  isAddModalOpen?: boolean
  onAddModalClose?: () => void
  onOpenAddModal?: () => void
}

type User = {
  id: string
  _id?: string
  firstName: string
  lastName: string
  email: string
  phone: string
  degree: string
  department: string
  year?: string
  status: 'active' | 'inactive'
  role: string
  roleId: string
  lastLogin: string
  semester?: string
  batch?: string
  gender?: string
  profile?: string
  createdAt?: string
  notes?: any[]
  permission?: any
}

type Enrollment = {
  user: User
  status: 'active' | 'suspended' | 'completed' | 'dropped'
  enableEnrolmentDates: boolean
  enrolmentStartsDate: string | null
  enrolmentEndsDate: string | null
  createdAt: string
  updatedAt: string
}

const showSuccessToast = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: "top-right",
  })
}

const showErrorToast = (message: string) => {
  toast.error(message, {
    duration: 4000,
    position: "top-right",
  })
}

const showWarningToast = (message: string) => {
  toast.warning(message, {
    duration: 3000,
    position: "top-right",
  })
}
const fetchCourseParticipants = async (courseId: string, institutionId: string, token: string) => {
  try {
    const response = await fetch(
      `http://localhost:5533/getAll/courses-data/${courseId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'institution': institutionId,
        },
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch course data');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error('Invalid course data response');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching course participants:', error);
    throw error;
  }
};

export default function EnrollmentTab({ 
  courseId, 
  isAddModalOpen = false, 
  onAddModalClose,
  onOpenAddModal 
}: EnrollmentTabProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([])
  const [selectedUsersToRemove, setSelectedUsersToRemove] = useState<string[]>([])
  const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState(false)
  const [showSingleRemoveConfirm, setShowSingleRemoveConfirm] = useState(false)
  const [userToRemove, setUserToRemove] = useState<string | null>(null)
  const [userToRemoveName, setUserToRemoveName] = useState<string>('')
    const [enrollmentStatus, setEnrollmentStatus] = useState<'active' | 'suspended' | 'completed' | 'dropped'>('active')
  const [enableEnrolmentDates, setEnableEnrolmentDates] = useState<boolean>(false)
  const [enrolmentStartsDate, setEnrolmentStartsDate] = useState<string>('')
  const [enrolmentEndsDate, setEnrolmentEndsDate] = useState<string>('')
  
  const [token, setToken] = useState<string | null>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [basedOn, setBasedOn] = useState<string | null>(null)

  const queryClient = useQueryClient()

  useEffect(() => {
    const storedToken = localStorage.getItem('smartcliff_token')
    const storedInstitutionId = localStorage.getItem('smartcliff_institution')
    const storedBasedOn = localStorage.getItem('smartcliff_basedOn')

    setToken(storedToken)
    setInstitutionId(storedInstitutionId)
    setBasedOn(storedBasedOn)
  }, [])

  const { 
    data: courseData, 
    isLoading: isLoadingCourseData, 
    refetch: refetchCourseData 
  } = useQuery({
    queryKey: ['courseData', courseId, institutionId, token],
    queryFn: async () => {
      if (!token || !institutionId || !courseId) return null;
      
      try {
        const data = await fetchCourseParticipants(courseId, institutionId, token);
        return data;
      } catch (error) {
        console.error('Error fetching course data:', error);
        throw error;
      }
    },
    enabled: !!token && !!institutionId && !!courseId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const transformedParticipants = useMemo(() => {
    return (courseData?.singleParticipants || []).map((enrollment: any) => {
      const user = enrollment.user || enrollment;
      
      let roleName = 'Unknown Role';
      let roleId = '';
      
      if (typeof user.role === 'string') {
        roleName = user.role;
        roleId = user.role;
      } else if (user.role?.renameRole) {
        roleName = user.role.renameRole;
        roleId = user.role._id;
      }

      const userData: User = {
        id: user._id || user.id,
        _id: user._id,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        role: roleName,
        roleId: roleId,
        status: user.status || 'active',
        lastLogin: user.lastLogin || '',
        degree: user.degree || '',
        department: user.department || '',
        semester: user.semester || '',
        year: user.year || '',
        batch: user.batch || '',
        gender: user.gender || '',
        profile: user.profile || '',
        createdAt: user.createdAt || '',
        notes: user.notes || [],
        permission: user.permission || {}
      }

      return {
        user: userData,
        status: enrollment.status || 'active',
        enableEnrolmentDates: enrollment.enableEnrolmentDates || false,
        enrolmentStartsDate: enrollment.enrolmentStartsDate || null,
        enrolmentEndsDate: enrollment.enrolmentEndsDate || null,
        createdAt: enrollment.createdAt || new Date().toISOString(),
        updatedAt: enrollment.updatedAt || new Date().toISOString()
      }
    });
  }, [courseData?.singleParticipants])


  const allParticipants = useMemo(() => {
    return transformedParticipants.map((enrollment: { user: any }) => enrollment.user);
  }, [transformedParticipants]);

  const { 
    data: allUsersData, 
    isLoading: isLoadingAllUsers,
    refetch: refetchAllUsers 
  } = useQuery({
    queryKey: ['allUsersForCourse', institutionId, token, basedOn, isAddModalOpen],
    queryFn: async () => {
      if (!token || !institutionId || !basedOn) return { users: [] }
      
      const data = await fetchUsers(institutionId, token, basedOn)

      const transformedUsers: User[] = (data.users || []).map((user: any) => {
        const roleName = user.role?.renameRole || 
                       (typeof user.role === 'string' ? user.role : 'Unknown Role')
        
        const roleId = user.role?._id || user.role

        return {
          id: user._id || user.id,
          _id: user._id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email,
          phone: user.phone || '',
          role: roleName,
          roleId: roleId,
          status: user.status || 'active',
          lastLogin: user.lastLogin || '',
          degree: user.degree || '',
          department: user.department || '',
          semester: user.semester || '',
          year: user.year || '',
          batch: user.batch || '',
          gender: user.gender || '',
          profile: user.profile || '',
          createdAt: user.createdAt || '',
          notes: user.notes || [],
          permission: user.permission || {}
        }
      })

      const enrolledUserIds = transformedParticipants.map((enrollment: { user: { _id: any; id: any } }) => enrollment.user._id || enrollment.user.id) || []
      
      const availableUsers = transformedUsers.filter(user => 
        !enrolledUserIds.includes(user._id || user.id)
      )

      return { users: availableUsers }
    },
    enabled: !!token && !!institutionId && !!basedOn && isAddModalOpen,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const addParticipantsMutation = useMutation({
    mutationFn: async (participantData: { participantIds: string[], enrollmentData: any }) => {
      if (!token || !institutionId || !courseId) {
        throw new Error('Missing required data')
      }
      
      return await addParticipantsToCourse(
        courseId, 
        participantData.participantIds, 
        institutionId, 
        token,
        participantData.enrollmentData
      )
    },
    onSuccess: (data) => {
      showSuccessToast(data.message || "Participants added successfully!")
      setSelectedUsersToAdd([])
      refetchCourseData()
      refetchAllUsers()
      queryClient.invalidateQueries({ queryKey: ['courseData', courseId] })
      if (onAddModalClose) onAddModalClose()
    },
    onError: (error: any) => {
      showErrorToast(error.message || "Failed to add participants. Please try again.")
    }
  })

  const removeParticipantMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!token || !institutionId || !courseId) {
        throw new Error('Missing required data')
      }
      
      return await removeParticipantFromCourse(courseId, userId, institutionId, token)
    },
    onSuccess: (data) => {
      showSuccessToast(data.message || "Participant removed successfully!")
      setSelectedUsersToRemove([])
      setUserToRemove(null)
      setUserToRemoveName('')
      refetchCourseData()
      queryClient.invalidateQueries({ queryKey: ['courseData', courseId] })
    },
    onError: (error: any) => {
      showErrorToast(error.message || "Failed to remove participant. Please try again.")
      setUserToRemove(null)
      setUserToRemoveName('')
    }
  })

  const updateEnrollmentMutation = useMutation({
    mutationFn: async ({ userId, enrollmentData }: { userId: string, enrollmentData: any }) => {
      if (!token || !institutionId || !courseId) {
        throw new Error('Missing required data')
      }
      
      return await updateParticipantEnrollment(courseId, userId, enrollmentData, institutionId, token)
    },
    onSuccess: (data) => {
      showSuccessToast(data.message || "Enrollment updated successfully!")
      setIsSettingsModalOpen(false)
      setSelectedEnrollment(null)
      refetchCourseData()
      queryClient.invalidateQueries({ queryKey: ['courseData', courseId] })
    },
    onError: (error: any) => {
      showErrorToast(error.message || "Failed to update enrollment. Please try again.")
    }
  })

  const removeParticipantsMutation = useMutation({
    mutationFn: async (participantIds: string[]) => {
      if (!token || !institutionId || !courseId) {
        throw new Error('Missing required data')
      }
      
      return await removeMultipleParticipantsFromCourse(courseId, participantIds, institutionId, token)
    },
    onSuccess: (data) => {
      showSuccessToast(data.message || `${selectedUsersToRemove.length} participant(s) removed successfully!`)
      setShowBulkRemoveConfirm(false)
      setSelectedUsersToRemove([])
      refetchCourseData()
      queryClient.invalidateQueries({ queryKey: ['courseData', courseId] })
    },
    onSettled: () => {
      setSelectedUsersToRemove([])
    },
    onError: (error: any) => {
      showErrorToast(error.message || "Failed to remove participants. Please try again.")
    }
  })

  const handleConfirmBulkRemove = () => {
    if (selectedUsersToRemove.length === 0) return
    
    removeParticipantsMutation.mutate(selectedUsersToRemove)
  }

  const handleConfirmSingleRemove = () => {
    if (!userToRemove) return
    
    removeParticipantMutation.mutate(userToRemove)
    setShowSingleRemoveConfirm(false)
  }

  const handleAddParticipants = () => {
    if (onOpenAddModal) {
      onOpenAddModal()
    }
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setIsDetailsModalOpen(true)
  }

  const handleOpenSettings = (user: User) => {
    const enrollment = transformedParticipants.find((e: { user: { _id: string | undefined; id: string } }) => e.user._id === user._id || e.user.id === user.id);
    if (enrollment) {
      setSelectedEnrollment(enrollment);
      setEnrollmentStatus(enrollment.status);
      setEnableEnrolmentDates(enrollment.enableEnrolmentDates || false);
      
      if (enrollment.enableEnrolmentDates && enrollment.enrolmentStartsDate) {
        setEnrolmentStartsDate(formatDateForInput(enrollment.enrolmentStartsDate));
      } else {
        setEnrolmentStartsDate('');
      }
      
      if (enrollment.enableEnrolmentDates && enrollment.enrolmentEndsDate) {
        setEnrolmentEndsDate(formatDateForInput(enrollment.enrolmentEndsDate));
      } else {
        setEnrolmentEndsDate('');
      }
      
      setIsSettingsModalOpen(true);
    }
  }

  const handleSaveEnrollmentSettings = () => {
    if (!selectedEnrollment) return;

    let enrollmentData: any = {
      status: enrollmentStatus,
      enableEnrolmentDates: enableEnrolmentDates,
      updatedAt: new Date().toISOString()
    };

    if (enableEnrolmentDates) {
      const startDate = enrolmentStartsDate || formatDateForInput(new Date().toISOString());
      enrollmentData.enrolmentStartsDate = startDate;
      
      if (startDate) {
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
        enrollmentData.enrolmentEndsDate = formatDateForInput(endDate.toISOString());
      }
    }

    updateEnrollmentMutation.mutate({
      userId: selectedEnrollment.user._id || selectedEnrollment.user.id,
      enrollmentData
    });
  }

  const handleUserSelectionToggle = (userId: string) => {
    setSelectedUsersToAdd(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAllUsers = (participantIds: string[]) => {
    setSelectedUsersToAdd(participantIds)
  }

  const handleSubmitParticipants = () => {
    if (selectedUsersToAdd.length === 0) {
      showWarningToast("Please select at least one user to add.")
      return
    }
        const enrollmentData = {
      status: 'active',
      enableEnrolmentDates: false
    };
    
    addParticipantsMutation.mutate({
      participantIds: selectedUsersToAdd,
      enrollmentData
    })
  }

  const handleRemoveParticipant = (userId: string, userName: string) => {
    setUserToRemove(userId)
    setUserToRemoveName(userName)
    setShowSingleRemoveConfirm(true)
  }

  const handleBulkRemove = (participantIds: string[]) => {
    setSelectedUsersToRemove(participantIds)
    setShowBulkRemoveConfirm(true)
  }

  const handleSelectAllUsersForRemoval = (participantIds: string[]) => {
    setSelectedUsersToRemove(participantIds)
  }
  
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase()
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString || dateString === 'null' || dateString === '') return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
      suspended: { variant: 'secondary', className: 'bg-gray-100 text-gray-800', icon: XCircle },
      completed: { variant: 'default', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      dropped: { variant: 'destructive', className: 'bg-red-100 text-red-800', icon: XCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.suspended
    const Icon = config.icon
    
    return (
      <Badge 
        variant={config.variant as any}
        className={`flex items-center gap-1 ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const handleCloseAddModal = () => {
    setSelectedUsersToAdd([])
    if (onAddModalClose) onAddModalClose()
  }

  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false)
    setSelectedEnrollment(null)
    setEnrollmentStatus('active')
    setEnableEnrolmentDates(false)
    setEnrolmentStartsDate('')
    setEnrolmentEndsDate('')
  }

  const renderEnrollmentDates = (enrollment: Enrollment) => {
    if (!enrollment.enableEnrolmentDates) {
      return (
        <>
          <div>
            <Label className="text-xs text-gray-500">Enrollment Starts</Label>
            <p className="text-sm text-gray-400">Not set</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500">Enrollment Ends</Label>
            <p className="text-sm text-gray-400">Not set</p>
          </div>
        </>
      );
    }

    return (
      <>
        <div>
          <Label className="text-xs text-gray-500">Enrollment Starts</Label>
          <p className="text-sm">{formatDate(enrollment.enrolmentStartsDate)}</p>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Enrollment Ends</Label>
          <p className="text-sm">{formatDate(enrollment.enrolmentEndsDate)}</p>
        </div>
      </>
    );
  };
function calculateDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = diffDays % 30;
  
  let result = [];
  if (years > 0) result.push(`${years} year${years > 1 ? 's' : ''}`);
  if (months > 0) result.push(`${months} month${months > 1 ? 's' : ''}`);
  if (days > 0) result.push(`${days} day${days > 1 ? 's' : ''}`);
  
  return result.join(', ') || '0 days';
}
  return (
    <div className="space-y-4 relative">
      {/* Header with Add Participants button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {allParticipants.length} participant(s) enrolled
        </div>
        <Button 
          size="sm" 
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          onClick={handleAddParticipants}
        >
          <UserPlus className="h-2 w-4" />
          Add Participants
        </Button>
      </div>

      {/* Main Participants Table */}
      <FilteredTable
        users={allParticipants}
        isLoading={isLoadingCourseData}
        selectedUserIds={selectedUsersToRemove}
        onUserSelect={(userId) => {
          setSelectedUsersToRemove(prev =>
            prev.includes(userId)
              ? prev.filter(id => id !== userId)
              : [...prev, userId]
          )
        }}
        onSelectAll={handleSelectAllUsersForRemoval}
        onBulkRemove={handleBulkRemove}
        onViewUser={handleViewUser}
        onSettingsUser={handleOpenSettings}
        onRemoveUser={(userId) => {
          const user = allParticipants.find((u: { id: string; _id: string }) => u.id === userId || u._id === userId)
          if (user) {
            handleRemoveParticipant(userId, `${user.firstName} ${user.lastName}`)
          }
        }}
        isRemoving={removeParticipantMutation.isPending || removeParticipantsMutation.isPending}
        title="Participants"
        emptyMessage="No participants found"
        emptyDescription="Try adding participants using the 'Add Participants' button"
        showActions={true}
        showSelection={true}
        basedOn={basedOn}
        itemsPerPage={10}
        enrollments={transformedParticipants}
      />

      {/* Add Individual Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={handleCloseAddModal}>
        <DialogContent className="flex flex-col max-w-7xl h-[95vh] max-h-[85vh] overflow-hidden p-0">
          <DialogHeader className="shrink-0 p-6 pb-1">
            <DialogTitle>Add Individual Participants</DialogTitle>
            <DialogDescription>
              Select users to add to the course. All users not already enrolled are shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 overflow-hidden px-6">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-auto">
                <FilteredTable
                  users={allUsersData?.users || []}
                  isLoading={isLoadingAllUsers}
                  selectedUserIds={selectedUsersToAdd}
                  onUserSelect={handleUserSelectionToggle}
                  onSelectAll={handleSelectAllUsers}
                  title="Users"
                  emptyMessage="No users available to add"
                  emptyDescription="All users are already enrolled in this course"
                  showActions={false}
                  showSelection={true}
                  basedOn={basedOn}
                  itemsPerPage={5}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t p-6 pt-4 bg-white">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-600">
                {selectedUsersToAdd.length} user(s) selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCloseAddModal}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitParticipants}
                  disabled={selectedUsersToAdd.length === 0 || addParticipantsMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {addParticipantsMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Selected ({selectedUsersToAdd.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Remove Confirmation Dialog */}
      <Dialog open={showSingleRemoveConfirm} onOpenChange={setShowSingleRemoveConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Remove Participant
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold">{userToRemoveName}</span> from this course? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSingleRemoveConfirm(false)
                setUserToRemove(null)
                setUserToRemoveName('')
              }}
              disabled={removeParticipantMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmSingleRemove}
              disabled={removeParticipantMutation.isPending}
            >
              {removeParticipantMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Removing...
                </>
                  ) : (
                'Remove Participant'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Remove Confirmation Dialog */}
      <Dialog open={showBulkRemoveConfirm} onOpenChange={setShowBulkRemoveConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Remove {selectedUsersToRemove.length} Participant(s)
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedUsersToRemove.length} participant(s) from this course? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkRemoveConfirm(false)}
              disabled={removeParticipantsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBulkRemove}
              disabled={removeParticipantsMutation.isPending}
            >
              {removeParticipantsMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Removing...
                </>
              ) : (
                `Remove ${selectedUsersToRemove.length} Participant(s)`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>User Details</DialogTitle>
                <DialogDescription>
                  Complete information about {selectedUser.firstName} {selectedUser.lastName}
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Profile Header */}
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={selectedUser.profile} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                      <AvatarFallback className="text-lg">
                        {getInitials(selectedUser.firstName, selectedUser.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">
                            {selectedUser.firstName} {selectedUser.lastName}
                          </h3>
                          <p className="text-gray-600">{selectedUser.role || 'Student'}</p>
                        </div>
                        <Badge 
                          variant={selectedUser.status === 'active' ? 'default' : 'secondary'}
                          className={
                            selectedUser.status === 'active' 
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${selectedUser.email}`} className="text-blue-600 hover:underline">
                            {selectedUser.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{selectedUser.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Enrollment Information */}
                  {(() => {
                    const enrollment = transformedParticipants.find((e: { user: { _id: string | undefined; id: string } }) => 
                      e.user._id === selectedUser._id || e.user.id === selectedUser.id
                    );
                    
                    if (enrollment) {
                      return (
                        <>
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Enrollment Information
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <Label className="text-xs text-gray-500">Status</Label>
                                <div className="mt-1">
                                  {getStatusBadge(enrollment.status)}
                                </div>
                              </div>
                              <div>
                               
                              </div>
                              {renderEnrollmentDates(enrollment)}
                            </div>
                          </div>
                          <Separator />
                        </>
                      );
                    }
                    return null;
                  })()}

                  {/* Personal Information */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Gender</Label>
                        <p className="text-sm">{selectedUser.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Member Since</Label>
                        <p className="text-sm">{formatDate(selectedUser.createdAt || '')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information (for college) */}
                  {basedOn === 'college' && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Academic Information
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">Degree</Label>
                            <p className="text-sm">{selectedUser.degree || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Department</Label>
                            <p className="text-sm">{selectedUser.department || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Year</Label>
                            <p className="text-sm">{selectedUser.year || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Semester</Label>
                            <p className="text-sm">{selectedUser.semester || 'N/A'}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Batch</Label>
                            <p className="text-sm">{selectedUser.batch || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Enrollment Settings Modal */}
    <Dialog open={isSettingsModalOpen} onOpenChange={handleCloseSettingsModal}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader className="pb-2">
      <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
        <Settings className="h-4 w-4" />
        Enrollment Settings
      </DialogTitle>
      <DialogDescription className="text-xs">
        Update details for {selectedEnrollment?.user.firstName} {selectedEnrollment?.user.lastName}
      </DialogDescription>
    </DialogHeader>
    
    {selectedEnrollment && (
      <div className="space-y-4 py-2">
        {/* Dates Toggle - Compact */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="space-y-0.5">
            <Label htmlFor="enable-dates" className="text-xs font-medium">Custom Dates</Label>
            <p className="text-[10px] text-gray-500 leading-tight">
              {enableEnrolmentDates ? 'Dates will be saved' : 'Dates remain null'}
            </p>
          </div>
          <Switch
            id="enable-dates"
            checked={enableEnrolmentDates}
            onCheckedChange={(checked) => {
              setEnableEnrolmentDates(checked);
              if (checked) {
                const today = formatDateForInput(new Date().toISOString());
                setEnrolmentStartsDate(today);
                const endDate = new Date(today);
                endDate.setFullYear(endDate.getFullYear() + 1);
                setEnrolmentEndsDate(formatDateForInput(endDate.toISOString()));
              } else {
                setEnrolmentStartsDate('');
                setEnrolmentEndsDate('');
              }
            }}
            className="scale-90"
          />
        </div>

        {/* Status and Dates Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="enrollment-status" className="text-xs">Status</Label>
            <Select
              value={enrollmentStatus}
              onValueChange={(value: 'active' | 'suspended' | 'completed' | 'dropped') => 
                setEnrollmentStatus(value)
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent className="text-sm">
                <SelectItem value="active" className="text-sm">Active</SelectItem>
                <SelectItem value="suspended" className="text-sm">Suspended</SelectItem>
                <SelectItem value="completed" className="text-sm">Completed</SelectItem>
                <SelectItem value="dropped" className="text-sm">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="duration" className="text-xs">Duration</Label>
            <div className="flex items-center h-8 px-3 text-sm bg-gray-50 rounded-md border">
              <ClockIcon className="h-3 w-3 mr-1.5 text-gray-500" />
              {enrolmentStartsDate && enrolmentEndsDate 
                ? calculateDuration(enrolmentStartsDate, enrolmentEndsDate)
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Dates Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="enrolment-starts" className="text-xs">Start Date</Label>
            <Input
              id="enrolment-starts"
              type="date"
              value={enrolmentStartsDate}
              onChange={(e) => {
                setEnrolmentStartsDate(e.target.value);
                if (e.target.value) {
                  const endDate = new Date(e.target.value);
                  endDate.setFullYear(endDate.getFullYear() + 1);
                  setEnrolmentEndsDate(formatDateForInput(endDate.toISOString()));
                }
              }}
              disabled={!enableEnrolmentDates}
              className={`h-8 text-sm ${!enableEnrolmentDates ? 'bg-gray-100 text-gray-400' : ''}`}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enrolment-ends" className="text-xs">End Date</Label>
            <Input
              id="enrolment-ends"
              type="date"
              value={enrolmentEndsDate}
              onChange={(e) => setEnrolmentEndsDate(e.target.value)}
              disabled={!enableEnrolmentDates}
              className={`h-8 text-sm ${!enableEnrolmentDates ? 'bg-gray-100 text-gray-400' : ''}`}
            />
          </div>
        </div>

        {/* Current Status Display - Compact */}
        <div className="p-3 bg-gray-50 rounded-md border">
          <Label className="text-xs text-gray-500 mb-1.5 block">Current Status</Label>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Enrollment:</span>
              {getStatusBadge(selectedEnrollment.status)}
            </div>
          
          </div>
        </div>
      </div>
    )}

    <DialogFooter className="pt-4 border-t">
      <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          onClick={handleCloseSettingsModal}
          disabled={updateEnrollmentMutation.isPending}
          className="h-8 px-3 text-sm flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveEnrollmentSettings}
          disabled={updateEnrollmentMutation.isPending}
          className="h-8 px-3 text-sm flex-1 bg-indigo-600 hover:bg-indigo-700"
        >
          {updateEnrollmentMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </DialogFooter>
  </DialogContent>
</Dialog>

      {/* Toaster Component */}
      <Toaster 
        position="top-right"
        richColors
        closeButton
        expand={false}
        duration={3000}
        visibleToasts={3}
      />
    </div>
  )
}

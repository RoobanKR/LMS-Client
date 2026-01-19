"use client"

import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, ChevronDown, ChevronUp, X, Mail, Eye, UserIcon, GraduationCap, Trash2, Settings, Calendar, Clock, CheckCircle, XCircle, Clock as ClockIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { motion, AnimatePresence } from 'framer-motion'
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from 'sonner'

interface User {
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

interface Enrollment {
  user: User
  status: 'active' | 'inactive' | 'completed' | 'dropped'
  enrolmentStarts: string
  enrolmentDuration: number
  enrolmentEnds: string
  createdAt: string
  updatedAt: string
}

interface Role {
  _id: string;
  renameRole: string;
  originalRole: string;
  roleValue: string;
}

interface FilteredTableProps {
  users: User[]
  enrollments?: Enrollment[]
  isLoading?: boolean
  selectedUserIds?: string[]
  onUserSelect?: (userId: string) => void
  onSelectAll?: (participantIds: string[]) => void
  onBulkRemove?: (participantIds: string[]) => void
  onViewUser?: (user: User) => void
  onSettingsUser?: (user: User) => void
  onRemoveUser?: (userId: string) => void
  isRemoving?: boolean
  title?: string
  emptyMessage?: string
  emptyDescription?: string
  showActions?: boolean
  showSelection?: boolean
  basedOn?: string | null
  itemsPerPage?: number
}

const degreeOptions = ["B.Tech", "B.E", "B.Sc", "B.Com", "B.A", "M.Tech", "M.Sc", "MBA", "PhD"]
const departmentOptions = ["Computer Science", "Electrical", "Mechanical", "Civil", "Electronics", "Information Technology", "Mathematics", "Physics", "Chemistry"]
const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"]
const enrollmentStatusOptions = ['active', 'inactive', 'completed', 'dropped']

export default function FilteredTable({
  users,
  enrollments = [],
  isLoading = false,
  selectedUserIds = [],
  onUserSelect,
  onSelectAll,
  onBulkRemove,
  onViewUser,
  onSettingsUser,
  onRemoveUser,
  isRemoving = false,
  title = "Participants",
  emptyMessage = "No users found",
  emptyDescription = "Try changing your filters",
  showActions = true,
  showSelection = false,
  basedOn = null,
  itemsPerPage = 10
}: FilteredTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedEnrollmentStatus, setSelectedEnrollmentStatus] = useState<string>('all')
  const [selectedDegree, setSelectedDegree] = useState<string>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [showBulkRemoveDialog, setShowBulkRemoveDialog] = useState(false)
  const [localSelectedUserIds, setLocalSelectedUserIds] = useState<string[]>([])

  useEffect(() => {
    setLocalSelectedUserIds(selectedUserIds)
  }, [selectedUserIds])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedStatus, selectedEnrollmentStatus, selectedDegree, selectedDepartment, selectedYear, selectedRoles])

  const availableRoles = useMemo(() => {
    const rolesMap = new Map<string, Role>();
    
    users.forEach(user => {
      if (user.role && user.roleId) {
        rolesMap.set(user.roleId, {
          _id: user.roleId,
          renameRole: user.role,
          originalRole: user.role,
          roleValue: user.role.toLowerCase().replace(/\s+/g, '')
        });
      }
    });
    
    return Array.from(rolesMap.values());
  }, [users])

  const getEnrollmentForUser = (userId: string) => {
    return enrollments.find(enrollment => 
      enrollment.user._id === userId || enrollment.user.id === userId
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
      inactive: { variant: 'secondary', className: 'bg-gray-100 text-gray-800', icon: XCircle },
      completed: { variant: 'default', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      dropped: { variant: 'destructive', className: 'bg-red-100 text-red-800', icon: XCircle }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive
    const Icon = config.icon
    
    return (
      <Badge 
        variant={config.variant as any}
        className={`flex items-center gap-1 ${config.className} text-xs`}
      >
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const enrollment = getEnrollmentForUser(user.id)
      
      const matchesSearch = !debouncedSearchTerm ||
        user.firstName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.phone.includes(debouncedSearchTerm) ||
        user.role.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (enrollment && enrollment.status.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (basedOn === 'college' && (
          (user.degree && user.degree.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
          (user.department && user.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
          (user.batch && user.batch.includes(debouncedSearchTerm))
        ))

      const matchesRoles = selectedRoles.length === 0 || 
        selectedRoles.includes(user.roleId)

      const matchesStatus = !selectedStatus || selectedStatus === "all" || user.status === selectedStatus

      const matchesEnrollmentStatus = !selectedEnrollmentStatus || selectedEnrollmentStatus === "all" || 
        (enrollment && enrollment.status === selectedEnrollmentStatus)
      const matchesDegree = !selectedDegree || selectedDegree === "all" || user.degree === selectedDegree
      const matchesDepartment = !selectedDepartment || selectedDepartment === "all" || user.department === selectedDepartment
      const matchesYear = !selectedYear || selectedYear === "all" || user.year === selectedYear

      return matchesSearch && matchesRoles && matchesStatus && matchesEnrollmentStatus && matchesDegree && matchesDepartment && matchesYear
    });
  }, [users, enrollments, debouncedSearchTerm, selectedStatus, selectedEnrollmentStatus, selectedDegree, selectedDepartment, selectedYear, selectedRoles, basedOn])

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const totalUsers = filteredUsers.length

  const clearFilters = () => {
    setSelectedStatus('all')
    setSelectedEnrollmentStatus('all')
    setSelectedDegree('all')
    setSelectedDepartment('all')
    setSelectedYear('all')
    setSelectedRoles([])
    setSearchTerm('')
    setCurrentPage(1)
  }

  const hasActiveFilters = () => {
    return (
      selectedStatus !== 'all' ||
      selectedEnrollmentStatus !== 'all' ||
      selectedDegree !== 'all' ||
      selectedDepartment !== 'all' ||
      selectedYear !== 'all' ||
      selectedRoles.length > 0 ||
      searchTerm !== ''
    )
  }

  const getBadgeData = () => {
    const badges: { label: string; value: number; type: string }[] = []
    
    if (selectedStatus !== 'all') {
      badges.push({
        label: `Status: ${selectedStatus}`,
        value: totalUsers || 0,
        type: 'status'
      })
    }
    
    if (selectedEnrollmentStatus !== 'all') {
      badges.push({
        label: `Enrollment: ${selectedEnrollmentStatus}`,
        value: totalUsers || 0,
        type: 'enrollmentStatus'
      })
    }
    
    if (selectedDegree !== 'all') {
      badges.push({
        label: `Degree: ${selectedDegree}`,
        value: totalUsers || 0,
        type: 'degree'
      })
    }
    
    if (selectedDepartment !== 'all') {
      badges.push({
        label: `Dept: ${selectedDepartment}`,
        value: totalUsers || 0,
        type: 'department'
      })
    }
    
    if (selectedYear !== 'all') {
      badges.push({
        label: `Year: ${selectedYear}`,
        value: totalUsers || 0,
        type: 'year'
      })
    }
    
    if (selectedRoles.length > 0) {
      const selectedRoleNames = availableRoles
        .filter(role => selectedRoles.includes(role._id))
        .map(role => role.renameRole)
      
      badges.push({
        label: `Roles: ${selectedRoleNames.join(', ')}`,
        value: totalUsers || 0,
        type: 'role'
      })
    }
    
    return badges
  }

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const handleSelectAllRoles = () => {
    if (selectedRoles.length === availableRoles.length) {
      setSelectedRoles([])
    } else {
      const allRoleIds = availableRoles.map(role => role._id)
      setSelectedRoles(allRoleIds)
    }
  }

  const isAllRolesSelected = availableRoles.length > 0 && selectedRoles.length === availableRoles.length

  const handleSelectAllUsers = () => {
    if (onSelectAll) {
      if (localSelectedUserIds.length === filteredUsers.length) {
        const newSelection: string[] = []
        setLocalSelectedUserIds(newSelection)
        onSelectAll(newSelection)
      } else {
        const allUserIds = filteredUsers.map(user => user.id)
        setLocalSelectedUserIds(allUserIds)
        onSelectAll(allUserIds)
      }
    }
  }

  const handleUserSelect = (userId: string) => {
    const newSelection = localSelectedUserIds.includes(userId)
      ? localSelectedUserIds.filter(id => id !== userId)
      : [...localSelectedUserIds, userId]
    
    setLocalSelectedUserIds(newSelection)
    onUserSelect?.(userId)
  }

  const isAllUsersSelected = filteredUsers.length > 0 && 
    filteredUsers.every(user => localSelectedUserIds.includes(user.id))

  const handleBulkRemove = () => {
    if (onBulkRemove && localSelectedUserIds.length > 0) {
      onBulkRemove(localSelectedUserIds)
      setShowBulkRemoveDialog(false)
    }
  }

  const clearSelection = () => {
    setLocalSelectedUserIds([])
    if (onSelectAll) {
      onSelectAll([])
    }
  }

  const showBulkRemoveConfirmation = () => {
    toast.custom(
      (t) => (
        <div className="w-[356px] rounded-lg bg-white p-4 shadow-lg">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">Remove Selected Participants</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to remove {localSelectedUserIds.length} participant(s) from this course? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.dismiss(t)}
                disabled={isRemoving}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  toast.dismiss(t)
                  handleBulkRemove()
                }}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Removing...
                  </>
                ) : (
                  `Remove ${localSelectedUserIds.length} Participants`
                )}
              </Button>
            </div>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {showSelection && localSelectedUserIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-md"
        >
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              {localSelectedUserIds.length} selected
            </Badge>
            <span className="text-sm text-blue-700">
              {localSelectedUserIds.length} {title.toLowerCase()} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-xs h-6 px-2"
            >
              Clear
            </Button>
          </div>
          <div className="flex gap-2">
            {onBulkRemove && (
              <Button
                variant="destructive"
                size="sm"
                onClick={showBulkRemoveConfirmation}
                disabled={isRemoving}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove Selected ({localSelectedUserIds.length})
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
          {/* Search input */}
          <div className="relative w-full sm:w-[calc(100%-30px)] min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={
                basedOn === 'college' 
                  ? "Search name, email, role, enrollment status, degree..." 
                  : "Search name, email, role, enrollment status..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters() ? (
              <span>({getBadgeData().length})</span>
            ) : null}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1">
            {totalUsers || 0} {title}
          </Badge>
          {showSelection && (
            <div className="flex items-center">
              <Checkbox
                id="select-all-users"
                checked={isAllUsersSelected}
                onCheckedChange={handleSelectAllUsers}
                disabled={isLoading || filteredUsers.length === 0}
                className="mr-2"
              />
              <Label
                htmlFor="select-all-users"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                onClick={handleSelectAllUsers}
              >
                {isAllUsersSelected ? 'Deselect All' : 'Select All'}
              </Label>
            </div>
          )}
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters() && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-md">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-700">Active Filters:</span>
              {getBadgeData().map(badge => (
                <Badge
                  key={badge.label}
                  variant="secondary"
                  className="flex items-center gap-1 text-xs"
                >
                  {badge.label}
                  <button
                    onClick={() => {
                      if (badge.type === 'degree') {
                        setSelectedDegree("all")
                      } else if (badge.type === 'department') {
                        setSelectedDepartment("all")
                      } else if (badge.type === 'year') {
                        setSelectedYear("all")
                      } else if (badge.type === 'status') {
                        setSelectedStatus("all")
                      } else if (badge.type === 'enrollmentStatus') {
                        setSelectedEnrollmentStatus("all")
                      } else if (badge.type === 'role') {
                        setSelectedRoles([])
                      }
                    }}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-gray-600 hover:text-red-600"
            >
              Clear All
            </Button>
          </div>
        </motion.div>
      )}

      {/* Expandable Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Filter {title}</h3>
              <Button
                onClick={() => setShowFilters(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* User Status Filter */}
              <div className="w-full">
                <Label className="text-xs font-medium text-gray-700 mb-1">User Status</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent className="text-xs cursor-pointer">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Enrollment Status Filter */}
              <div className="w-full">
                <Label className="text-xs font-medium text-gray-700 mb-1">Enrollment Status</Label>
                <Select
                  value={selectedEnrollmentStatus}
                  onValueChange={setSelectedEnrollmentStatus}
                >
                  <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
                    <SelectValue placeholder="All Enrollment Statuses" />
                  </SelectTrigger>
                  <SelectContent className="text-xs cursor-pointer">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Suspended</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="dropped">Dropped</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter - Multi-select */}
              <div className="w-full">
                <Label className="text-xs font-medium text-gray-700 mb-1">Role</Label>
                <Select
                  value="multiple"
                  onValueChange={() => {}}
                >
                  <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className="text-xs cursor-pointer">
                    <div className="p-2 max-h-60 overflow-y-auto">
                      {/* All Roles Option */}
                      <div
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                        onClick={handleSelectAllRoles}
                      >
                        <Checkbox
                          checked={isAllRolesSelected}
                          onCheckedChange={handleSelectAllRoles}
                        />
                        <span className="font-medium">All Roles</span>
                      </div>
                      
                      <div className="my-2 border-t"></div>
                      
                      {/* Individual Role Options */}
                      {availableRoles.map(role => (
                        <div
                          key={role._id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => handleRoleToggle(role._id)}
                        >
                          <Checkbox
                            checked={selectedRoles.includes(role._id)}
                            onCheckedChange={() => handleRoleToggle(role._id)}
                          />
                          <span>{role.renameRole}</span>
                        </div>
                      ))}
                      {availableRoles.length === 0 && (
                        <div className="p-2 text-gray-500 text-center">No roles available</div>
                      )}
                    </div>
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setSelectedRoles([])}
                      >
                        Clear Roles
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* College-specific filters */}
              {basedOn === 'college' && (
                <>
                  {/* Degree Filter */}
                  <div className="w-full">
                    <Label className="text-xs font-medium text-gray-700 mb-1">Degree</Label>
                    <Select
                      value={selectedDegree}
                      onValueChange={setSelectedDegree}
                    >
                      <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
                        <SelectValue placeholder="All Degrees" />
                      </SelectTrigger>
                      <SelectContent className="text-xs cursor-pointer">
                        <SelectItem value="all">All Degrees</SelectItem>
                        {degreeOptions.map((degree) => (
                          <SelectItem key={degree} value={degree}>
                            {degree}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Department Filter */}
                  <div className="w-full">
                    <Label className="text-xs font-medium text-gray-700 mb-1">Department</Label>
                    <Select
                      value={selectedDepartment}
                      onValueChange={setSelectedDepartment}
                    >
                      <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent className="text-xs cursor-pointer">
                        <SelectItem value="all">All Departments</SelectItem>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Year Filter */}
                  <div className="w-full">
                    <Label className="text-xs font-medium text-gray-700 mb-1">Year</Label>
                    <Select
                      value={selectedYear}
                      onValueChange={setSelectedYear}
                    >
                      <SelectTrigger className="text-xs h-8 cursor-pointer w-full">
                        <SelectValue placeholder="All Years" />
                      </SelectTrigger>
                      <SelectContent className="text-xs cursor-pointer">
                        <SelectItem value="all">All Years</SelectItem>
                        {yearOptions.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                Clear Filters
              </Button>
              <Button
                onClick={() => setShowFilters(false)}
                variant="default"
                size="sm"
                className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700"
              >
                Apply Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllUsersSelected}
                    onCheckedChange={handleSelectAllUsers}
                    disabled={isLoading || filteredUsers.length === 0}
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
             
                            <TableHead>Status</TableHead>

              {showActions && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ 
                    length: (showSelection ? 1 : 0) + 
                           (basedOn === 'college' ? 7 : 4) + 
                           (showActions ? 1 : 0) 
                  }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={
                    (showSelection ? 1 : 0) + 
                    (basedOn === 'college' ? 7 : 4) + 
                    (showActions ? 1 : 0)
                  } 
                  className="text-center py-8 text-gray-500"
                >
                  <div className="flex flex-col items-center gap-2">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                    <p>{emptyMessage}</p>
                    <p className="text-sm text-gray-400">{emptyDescription}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => {
                const enrollment = getEnrollmentForUser(user.id)
                
                return (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    {showSelection && (
                      <TableCell>
                        <Checkbox
                          checked={localSelectedUserIds.includes(user.id)}
                          onCheckedChange={() => handleUserSelect(user.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 text-sm font-medium">
                            {user.firstName?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <a 
                        href={`mailto:${user.email}`}
                        className="flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{user.email}</span>
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
                        {user.role || 'Unknown Role'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {enrollment ? (
                        getStatusBadge(enrollment.status)
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                          Not Enrolled
                        </Badge>
                      )}
                    </TableCell>
                   
                  
                    {showActions && (
                      <TableCell>
                        <div className="flex gap-2">
                          {onViewUser && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs h-7 px-2"
                              onClick={() => onViewUser(user)}
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onSettingsUser && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs h-7 px-2"
                              onClick={() => onSettingsUser(user)}
                              title="Enrollment Settings"
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onRemoveUser && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 text-xs h-7 px-2"
                              onClick={() => onRemoveUser(user.id)}
                              disabled={isRemoving}
                              title="Remove Participant"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(endIndex, totalUsers)}
            </span>{' '}
            of <span className="font-medium">{totalUsers}</span> {title.toLowerCase()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={currentPage === pageNum ? "bg-indigo-600 text-white" : ""}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}